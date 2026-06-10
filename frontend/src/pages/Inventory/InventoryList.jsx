import React, { useState, useEffect } from 'react';
import { Card, Table, Tag, Button, Space, Input, Select, Modal, InputNumber, Form, DatePicker, Tooltip, Switch } from 'antd';
import { PlusOutlined, SearchOutlined, HistoryOutlined, ArrowUpOutlined, ArrowDownOutlined, WarningOutlined, DeleteOutlined, EditOutlined } from '@ant-design/icons';
import { request } from '@/request';
import { API_BASE_URL } from '@/config/serverApiConfig';
import { message } from '@/utils/antdGlobal';
import { useUserRole } from '@/hooks/useUserRole';
import useMoney from '@/settings/useMoney';
import MaterialForm from '@/forms/MaterialForm';
import dayjs from 'dayjs';

export default function InventoryList() {
    const [data, setData] = useState([]);
    const [projects, setProjects] = useState([]);
    const [loading, setLoading] = useState(false);
    const [searchText, setSearchText] = useState('');
    const [categoryFilter, setCategoryFilter] = useState('all');

    // Modal States
    const [isMaterialModalOpen, setIsMaterialModalOpen] = useState(false);
    const [stockModal, setStockModal] = useState({ open: false, type: null, material: null });
    const [historyModal, setHistoryModal] = useState({ open: false, material: null, data: [] });
    const [editModal, setEditModal] = useState({ open: false, material: null });

    const { role } = useUserRole();
    const canEdit = role === 'OWNER' || role === 'ENGINEER'; // Engineers need to issue stock

    const [villas, setVillas] = useState([]);
    const [suppliers, setSuppliers] = useState([]);
    const [villaFilter, setVillaFilter] = useState('all');

    useEffect(() => {
        fetchProjects();
        fetchVillas();
        fetchSuppliers();
    }, []);

    useEffect(() => {
        fetchData();
    }, [villaFilter]);

    const fetchData = async () => {
        setLoading(true);
        try {
            // Always fetch materials to get names/categories
            const materialsData = await request.listAll({ entity: 'material' });
            let materials = materialsData.success ? materialsData.result : [];

            // If a specific villa is selected, fetch villa-specific stock
            if (villaFilter !== 'all') {
                const stockData = await request.filter({
                    entity: 'villastock',
                    options: {
                        filter: 'villa',
                        equal: villaFilter,
                    }
                });

                if (stockData.success) {
                    const stockMap = {}; // materialId -> currentStock
                    stockData.result.forEach(stock => {
                        stockMap[stock.material?._id || stock.material] = stock.currentStock;
                    });

                    // Update materials with villa stock, but KEEP global stock
                    materials = materials.map(m => ({
                        ...m,
                        globalStock: m.currentStock, // Preserve original global stock
                        currentStock: stockMap[m._id] || 0, // Villa-specific stock
                        isGlobal: false
                    }));
                }
            } else {
                materials = materials.map(m => ({ ...m, isGlobal: true }));
            }

            setData(materials);
        } catch (e) { message.error('Failed to load inventory'); console.error(e); }
        setLoading(false);
    };

    const fetchProjects = async () => {
        try {
            const data = await request.listAll({ entity: 'project' });
            if (data.success) setProjects(data.result);
        } catch (e) { console.error('Failed to load projects'); }
    };

    const fetchVillas = async () => {
        try {
            const data = await request.listAll({ entity: 'villa' });
            if (data.success) setVillas(data.result);
        } catch (e) { console.error('Failed to load villas'); }
    };

    const fetchSuppliers = async () => {
        try {
            const data = await request.listAll({ entity: 'supplier' });
            if (data.success) setSuppliers(data.result); // Ensure result is array
        } catch (e) { console.error('Failed to load suppliers'); }
    }

    const filteredData = data.filter(item => {
        const matchesCategory = categoryFilter === 'all' || item.category === categoryFilter;
        const matchesSearch = item.name.toLowerCase().includes(searchText.toLowerCase());
        return matchesCategory && matchesSearch;
    });

    const categories = ['Cement', 'Steel', 'Aggregates', 'Bricks/Blocks', 'Electrical', 'Plumbing', 'Paint', 'Wood', 'Other'];

    const columns = [
        { title: 'Material', dataIndex: 'name', key: 'name', sorter: (a, b) => a.name.localeCompare(b.name) },
        {
            title: 'Category', dataIndex: 'category', key: 'category',
            render: c => <Tag>{c}</Tag>
        },
        {
            title: villaFilter === 'all' ? 'Current Stock (Global)' : 'Current Stock (Villa)',
            key: 'currentStock',
            render: (_, r) => {
                const isLow = r.reorderLevel > 0 && r.currentStock <= r.reorderLevel;
                return (
                    <span style={{ fontWeight: 'bold', color: isLow ? 'red' : 'inherit' }}>
                        {r.currentStock} {r.unit}
                        {isLow && <Tooltip title="Low Stock"><WarningOutlined style={{ marginLeft: 8, color: 'red' }} /></Tooltip>}
                    </span>
                );
            },
            sorter: (a, b) => a.currentStock - b.currentStock
        },
        {
            title: 'Actions',
            key: 'actions',
            render: (_, r) => (
                <Space>
                    {canEdit && (
                        <>
                            <Tooltip title="Add Stock (Inward)">
                                <Button size="small" icon={<ArrowDownOutlined style={{ color: 'green' }} />} onClick={() => openStockModal('inward', r)} />
                            </Tooltip>
                            <Tooltip title="Issue Stock (Outward)">
                                <Button size="small" icon={<ArrowUpOutlined style={{ color: 'red' }} />} onClick={() => openStockModal('outward', r)} />
                            </Tooltip>
                            <Tooltip title="Edit Material">
                                <Button size="small" icon={<EditOutlined style={{ color: '#1890ff' }} />} onClick={() => openEditModal(r)} />
                            </Tooltip>
                        </>
                    )}
                    <Tooltip title="View History">
                        <Button size="small" icon={<HistoryOutlined />} onClick={() => openHistory(r)} />
                    </Tooltip>
                </Space>
            )
        }
    ];

    const openStockModal = (type, material) => {
        setStockModal({ open: true, type, material });
    };

    const openEditModal = (material) => {
        setEditModal({ open: true, material });
    };

    const openHistory = async (material) => {
        try {
            const data = await request.get({ entity: `material/history/${material._id}` });
            if (data.success) {
                setHistoryModal({ open: true, material, data: data.result });
            }
        } catch (e) { message.error('Failed to view history'); }
    };

    const handleDelete = (record) => {
        if (record.hasPayment) {
            Modal.warning({
                title: 'Action Blocked',
                content: (
                    <div style={{ marginTop: 12 }}>
                        <p style={{ fontSize: '15px', color: '#555', lineHeight: '1.5' }}>
                            This stock entry cannot be deleted or undone because a payment has already been completed for it.
                        </p>
                        <p style={{ fontSize: '14px', color: '#888', marginTop: 8, lineHeight: '1.4' }}>
                            To modify or delete this entry, please remove or edit the corresponding supplier payment in the expenses section first.
                        </p>
                    </div>
                ),
                okText: 'OK',
            });
            return;
        }

        Modal.confirm({
            title: 'Undo Transaction',
            content: 'Are you sure you want to undo and delete this transaction? This will revert the stock level changes.',
            okText: 'Yes, Undo',
            okType: 'danger',
            cancelText: 'No',
            onOk: async () => {
                try {
                    const res = await request.delete({ entity: 'material/transaction', id: record._id });
                    if (res.success) {
                        message.success('Transaction undone successfully');
                        fetchData();
                        if (historyModal.material) {
                            openHistory(historyModal.material);
                        }
                    } else {
                        Modal.error({
                            title: 'Cannot Delete Transaction',
                            content: res.message || 'Payment has already been made for this stock transaction.',
                            okText: 'Close'
                        });
                    }
                } catch (err) {
                    const errMsg = err.response?.data?.message || 'Payment has already been made for this stock transaction.';
                    Modal.error({
                        title: 'Cannot Delete Transaction',
                        content: errMsg,
                        okText: 'Close'
                    });
                }
            }
        });
    };

    const [isReportModalOpen, setIsReportModalOpen] = useState(false);

    // ... existing states ...

    return (
        <Card title="Inventory Management" extra={
            <Space>
                <Button icon={<ArrowDownOutlined />} onClick={() => setIsReportModalOpen(true)}>Download Report</Button>
                {canEdit && <Button type="primary" icon={<PlusOutlined />} onClick={() => setIsMaterialModalOpen(true)}>Add Material</Button>}
            </Space>
        }>
            <div style={{ marginBottom: 16, display: 'flex', gap: 16 }}>
                <Input placeholder="Search materials..." prefix={<SearchOutlined />} style={{ width: 200 }} onChange={e => setSearchText(e.target.value)} />
                <Select defaultValue="all" style={{ width: 150 }} onChange={setCategoryFilter}>
                    <Select.Option value="all">All Categories</Select.Option>
                    {categories.map(c => <Select.Option key={c} value={c}>{c}</Select.Option>)}
                </Select>
                <Select
                    placeholder="Filter by Villa"
                    style={{ width: 200 }}
                    onChange={setVillaFilter}
                    allowClear
                    value={villaFilter}
                >
                    <Select.Option value="all">All Villas (Global Stock)</Select.Option>
                    {villas.map(v => <Select.Option key={v._id} value={v._id}>Villa {v.villaNumber}</Select.Option>)}
                </Select>
            </div>

            <Table
                columns={columns}
                dataSource={filteredData}
                rowKey="_id"
                loading={loading}
                pagination={{ pageSize: 10 }}
            />

            {/* Create Material Modal */}
            {isMaterialModalOpen && (
                <CreateMaterialModal
                    open={isMaterialModalOpen}
                    onCancel={() => setIsMaterialModalOpen(false)}
                    onSuccess={() => { setIsMaterialModalOpen(false); fetchData(); }}
                />
            )}

            {/* Edit Material Modal */}
            {editModal.open && (
                <EditMaterialModal
                    open={editModal.open}
                    material={editModal.material}
                    onCancel={() => setEditModal({ open: false, material: null })}
                    onSuccess={() => { setEditModal({ open: false, material: null }); fetchData(); }}
                />
            )}

            {/* Stock Adjustment Modal */}
            {stockModal.open && (
                <StockAdjustmentModal
                    data={stockModal}
                    projects={projects}
                    villas={villas}
                    suppliers={suppliers}
                    villaFilter={villaFilter}
                    onCancel={() => setStockModal({ ...stockModal, open: false })}
                    onSuccess={() => { setStockModal({ ...stockModal, open: false }); fetchData(); }}
                />
            )}

            {/* History Modal */}
            <Modal title={`History: ${historyModal.material?.name}`} open={historyModal.open} onCancel={() => setHistoryModal({ open: false, material: null, data: [] })} footer={null} width={1000}>
                <HistoryTable data={historyModal.data} material={historyModal.material} canEdit={canEdit} onDelete={handleDelete} />
            </Modal>

            <ReportModal
                open={isReportModalOpen}
                onCancel={() => setIsReportModalOpen(false)}
                villas={villas}
            />
        </Card >
    );
}

function CreateMaterialModal({ open, onCancel, onSuccess }) {
    const [form] = Form.useForm();
    const handleSubmit = async () => {
        try {
            const values = await form.validateFields();
            await request.create({ entity: 'material', jsonData: values });
            message.success('Material created');
            form.resetFields();
            onSuccess();
        } catch (e) { message.error('Failed to create'); }
    };
    return (
        <Modal title="Add New Material" open={open} onCancel={onCancel} onOk={handleSubmit}>
            <Form form={form} layout="vertical"><MaterialForm /></Form>
        </Modal>
    );
}

function EditMaterialModal({ open, onCancel, onSuccess, material }) {
    const [form] = Form.useForm();

    useEffect(() => {
        if (open && material) {
            form.setFieldsValue({
                name: material.name,
                category: material.category,
                unit: material.unit,
                reorderLevel: material.reorderLevel,
                description: material.description,
            });
        }
    }, [open, material, form]);

    const handleSubmit = async () => {
        try {
            const values = await form.validateFields();
            await request.update({ entity: 'material', id: material._id, jsonData: values });
            message.success('Material updated successfully');
            onSuccess();
        } catch (e) {
            message.error('Failed to update material');
        }
    };

    return (
        <Modal title={`Edit Material: ${material?.name}`} open={open} onCancel={onCancel} onOk={handleSubmit}>
            <Form form={form} layout="vertical">
                <MaterialForm isUpdateForm={true} />
            </Form>
        </Modal>
    );
}

function StockAdjustmentModal({ data, projects, villas, suppliers, onCancel, onSuccess, villaFilter }) {
    const [form] = Form.useForm();
    const { type, material, open } = data;
    const { inputFormatter, inputParser } = useMoney();
    const isInward = type === 'inward';
    const selectedVilla = villas.find(v => v._id === villaFilter);

    const [directToVilla, setDirectToVilla] = useState(false);

    useEffect(() => {
        if (open) {
            form.resetFields();
            setDirectToVilla(false);
            if (selectedVilla) {
                form.setFieldsValue({ villa: selectedVilla._id });
            }
        }
    }, [open, selectedVilla]);

    const handleSubmit = async () => {
        try {
            const values = await form.validateFields();

            const isGlobalView = villaFilter === 'all';
            const hasVilla = values.villa || selectedVilla;
            let finalType = type;

            if (isGlobalView && type === 'outward' && hasVilla) {
                finalType = 'inward';
            }

            // Calculate totalCost for inward transactions
            const totalCost = isInward && values.ratePerUnit && values.quantity
                ? values.ratePerUnit * values.quantity
                : 0;

            await request.post({
                entity: `material/adjust/${material._id}`,
                jsonData: {
                    ...values,
                    type: finalType,
                    isDirect: directToVilla,
                    totalCost,
                    date: values.date.format('YYYY-MM-DD')
                }
            });
            message.success('Stock updated');
            onSuccess();
        } catch (e) {
            const { response } = e;
            message.error(response?.data?.message || 'Failed');
        }
    };

    return (
        <Modal
            title={isInward ? `Add Stock: ${material?.name}` : `Issue Material: ${material?.name}`}
            open={open}
            onCancel={onCancel}
            onOk={handleSubmit}
            okType={isInward ? 'primary' : 'danger'}
            okText={isInward ? 'Add Stock' : 'Issue Material'}
        >
            {material && (
                <Form form={form} layout="vertical">
                    {/* Show Global Stock Info when transferring to villa OR issuing materials */}
                    <Form.Item noStyle shouldUpdate={(prev, curr) => prev.villa !== curr.villa}>
                        {({ getFieldValue }) => {
                            const villaSelected = selectedVilla || getFieldValue('villa');
                            // Show for: (1) transfer to villa, (2) issue from global
                            const showGlobalStock = (isInward && (villaSelected || directToVilla)) || (!isInward && !villaSelected);
                            // Use globalStock if available (when viewing villa), otherwise currentStock
                            const globalStockAmount = material.globalStock !== undefined ? material.globalStock : material.currentStock;

                            return showGlobalStock ? (
                                <div style={{
                                    marginBottom: 16,
                                    padding: 12,
                                    background: '#e6f7ff',
                                    border: '1px solid #91d5ff',
                                    borderRadius: 4
                                }}>
                                    <strong>Available in Global Stock: </strong>
                                    <span style={{ fontSize: 16, color: '#1890ff', fontWeight: 'bold' }}>
                                        {globalStockAmount} {material.unit}
                                    </span>
                                </div>
                            ) : null;
                        }}
                    </Form.Item>



                    {/* ... Date and Qty ... */}
                    <Form.Item name="date" label="Date" initialValue={dayjs()} rules={[{ required: true }]}>
                        <DatePicker style={{ width: '100%' }} />
                    </Form.Item>
                    <Form.Item name="quantity" label={`Quantity (${material.unit})`} rules={[{ required: true }]}>
                        <InputNumber style={{ width: '100%' }} min={0.01} />
                    </Form.Item>

                    {/* Pricing Fields - Only for Purchases (Global or Direct Villa) */}
                    <Form.Item noStyle shouldUpdate={(prev, curr) => prev.villa !== curr.villa}>
                        {({ getFieldValue }) => {
                            const villaSelected = selectedVilla || getFieldValue('villa');
                            const showPricing = isInward && (!villaSelected || directToVilla);
                            return showPricing ? (
                                <>
                                    <Form.Item
                                        name="ratePerUnit"
                                        label="Rate per Unit"
                                        tooltip="Cost per unit of material"
                                    >
                                        <InputNumber
                                            style={{ width: '100%' }}
                                            min={0}
                                            precision={2}
                                            placeholder="Enter rate per unit"
                                            formatter={inputFormatter}
                                            parser={inputParser}
                                        />
                                    </Form.Item>

                                    <FormPriceDisplay material={material} form={form} />
                                </>
                            ) : null;
                        }}
                    </Form.Item>

                    {/* Villa Selection with Toggle */}
                    {isInward && (
                        <Form.Item label="Direct to Villa?">
                            <Switch checked={directToVilla} onChange={setDirectToVilla} />
                        </Form.Item>
                    )}

                    {selectedVilla ? (
                        <div style={{ marginBottom: 24 }}>
                            <span style={{ color: 'gray' }}>Assigning to: </span>
                            <Tag color="blue">Villa {selectedVilla.villaNumber}</Tag>
                            <Form.Item name="villa" hidden initialValue={selectedVilla._id}><Input /></Form.Item>
                        </div>
                    ) : (
                        <>
                            {(directToVilla || !isInward) && (
                                <Form.Item
                                    name="villa"
                                    label="Select Villa"
                                    rules={[{ required: directToVilla, message: 'Please select a villa' }]}
                                >
                                    <Select placeholder="Assign to Villa" allowClear>
                                        {villas?.map(v => <Select.Option key={v._id} value={v._id}>Villa {v.villaNumber}</Select.Option>)}
                                    </Select>
                                </Form.Item>
                            )}
                        </>
                    )}

                    {/* Show Supplier only if it's a purchase (Global or Direct Villa) */}
                    {isInward && (
                        <Form.Item
                            noStyle
                            shouldUpdate={(prevValues, currentValues) => prevValues.villa !== currentValues.villa}
                        >
                            {({ getFieldValue }) => {
                                const villaSelected = selectedVilla || getFieldValue('villa');
                                const showSupplier = !villaSelected || directToVilla;
                                return showSupplier ? (
                                    <Form.Item name="supplier" label="Supplier">
                                        <Select placeholder="Select Supplier" allowClear showSearch optionFilterProp="children">
                                            {suppliers?.map(s => <Select.Option key={s._id} value={s._id}>{s.name}</Select.Option>)}
                                        </Select>
                                    </Form.Item>
                                ) : null;
                            }}
                        </Form.Item>
                    )}

                    {!isInward && (
                        <>
                            <Form.Item name="usageCategory" label="Usage Reason" initialValue="daily_work">
                                <Select>
                                    <Select.Option value="daily_work">Daily Work</Select.Option>
                                    <Select.Option value="waste">Waste</Select.Option>
                                    <Select.Option value="transfer">Transfer</Select.Option>
                                    <Select.Option value="other">Other</Select.Option>
                                </Select>
                            </Form.Item>
                            <Form.Item name="issuedBy" label="Issued By" rules={[{ required: true, message: 'Please enter who issued this item' }]}>
                                <Input placeholder="Name of Engineer / Storekeeper" />
                            </Form.Item>
                        </>
                    )}

                    {/* Vehicle Number - Only for Purchases (Global or Direct Villa) */}
                    {isInward && (
                        <Form.Item
                            noStyle
                            shouldUpdate={(prevValues, currentValues) => prevValues.villa !== currentValues.villa}
                        >
                            {({ getFieldValue }) => {
                                const villaSelected = selectedVilla || getFieldValue('villa');
                                const showVehicle = !villaSelected || directToVilla;
                                return showVehicle ? (
                                    <Form.Item name="vehicleNumber" label="Vehicle Number">
                                        <Input placeholder="Enter Vehicle Number" />
                                    </Form.Item>
                                ) : null;
                            }}
                        </Form.Item>
                    )}

                    <Form.Item name="reference" label={isInward ? "Source / PO Number" : "Reference (Gate Pass / Slip No.)"} rules={[{ required: true }]}>
                        <Input />
                    </Form.Item>
                    <Form.Item name="notes" label="Notes">
                        <Input.TextArea />
                    </Form.Item>
                </Form>
            )}
        </Modal>
    );
}

function ReportModal({ open, onCancel, villas }) {
    const [form] = Form.useForm();
    const [loading, setLoading] = useState(false);

    const handleDownload = async () => {
        try {
            setLoading(true);
            const values = await form.validateFields();
            const { dateRange, villa } = values;
            const [start, end] = dateRange;

            const response = await request.download({
                entity: 'material',
                options: {
                    startDate: start.format('YYYY-MM-DD'),
                    endDate: end.format('YYYY-MM-DD'),
                    villa: villa || 'all'
                }
            });

            if (response.success === false) {
                message.error(response.message || 'Failed to download');
            } else {
                const blob = new Blob([response.data], { type: 'application/pdf' });
                const url = window.URL.createObjectURL(blob);
                const link = document.createElement('a');
                link.href = url;
                link.download = `InventoryReport_${Date.now()}.pdf`;
                document.body.appendChild(link);
                link.click();
                link.remove();
                window.URL.revokeObjectURL(url);
                onCancel();
            }
        } catch (e) {
            console.error(e);
            message.error('Failed to initiate download');
        } finally {
            setLoading(false);
        }
    };

    return (
        <Modal
            title="Download Inventory Report"
            open={open}
            onCancel={onCancel}
            onOk={handleDownload}
            okText="Download PDF"
            confirmLoading={loading}
            destroyOnClose={true}
            maskClosable={false}
        >
            <Form form={form} layout="vertical">
                <Form.Item name="dateRange" label="Date Range" rules={[{ required: true }]}>
                    <DatePicker.RangePicker style={{ width: '100%' }} />
                </Form.Item>
                <Form.Item name="villa" label="Filter by Villa (Optional)">
                    <Select placeholder="All Villas" allowClear>
                        <Select.Option value="all">All Villas</Select.Option>
                        {villas?.map(v => <Select.Option key={v._id} value={v._id}>Villa {v.villaNumber}</Select.Option>)}
                    </Select>
                </Form.Item>
            </Form>
        </Modal>
    );
}

// History Table Component with Pricing
function HistoryTable({ data, material, canEdit, onDelete }) {
    const { moneyFormatter } = useMoney();

    return (
        <Table
            dataSource={data}
            rowKey="_id"
            pagination={{ pageSize: 10 }}
            scroll={{ x: 1000 }}
            columns={[
                { title: 'Date', dataIndex: 'date', width: 110, render: d => dayjs(d).format('DD MMM YYYY') },
                { title: 'Type', dataIndex: 'type', width: 70, render: t => t === 'inward' ? <Tag color="green">IN</Tag> : <Tag color="red">OUT</Tag> },
                { title: 'Supplier', dataIndex: 'supplier', width: 150, render: s => s?.name || '-' },
                { title: 'Qty', dataIndex: 'quantity', width: 100, render: q => <b>{q} {material?.unit}</b> },
                { title: 'Rate/Unit', dataIndex: 'ratePerUnit', width: 110, render: rate => rate ? moneyFormatter({ amount: rate }) : '-' },
                { title: 'Total Cost', dataIndex: 'totalCost', width: 120, render: cost => cost ? <b>{moneyFormatter({ amount: cost })}</b> : '-' },
                { title: 'Villa', dataIndex: 'villa', width: 100, render: v => v ? <Tag color="blue">Villa {v.villaNumber}</Tag> : '-' },
                { title: 'Project', dataIndex: 'project', width: 120, render: p => p?.name || '-' },
                { title: 'Usage', dataIndex: 'usageCategory', width: 110, render: u => u ? <Tag size="small">{u?.replace('_', ' ')}</Tag> : '-' },
                { title: 'Issued By', dataIndex: 'issuedBy', width: 100, render: val => val || '-' },
                { title: 'Ref/Notes', key: 'notes', width: 120, render: (_, r) => <Tooltip title={r.notes}>{r.reference || '-'}</Tooltip> },
                ...(canEdit ? [{
                    title: 'Action',
                    key: 'action',
                    fixed: 'right',
                    width: 80,
                    render: (_, record) => (
                        <Tooltip title="Undo / Delete Transaction">
                            <Button
                                type="text"
                                danger
                                icon={<DeleteOutlined />}
                                onClick={() => onDelete(record)}
                            />
                        </Tooltip>
                    )
                }] : [])
            ]}
        />
    );
}

// Price Display Component with auto-calculation
function FormPriceDisplay({ material, form }) {
    const { moneyFormatter } = useMoney();

    return (
        <Form.Item noStyle shouldUpdate={(prev, curr) => prev.quantity !== curr.quantity || prev.ratePerUnit !== curr.ratePerUnit}>
            {() => {
                const quantity = form.getFieldValue('quantity');
                const ratePerUnit = form.getFieldValue('ratePerUnit');
                const totalCost = (quantity && ratePerUnit) ? quantity * ratePerUnit : 0;

                return (
                    <div style={{ marginBottom: 16, padding: 12, border: '1px dashed #d9d9d9', borderRadius: 4 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span style={{ fontWeight: 500 }}>Total Cost:</span>
                            <span style={{ fontSize: 18, fontWeight: 'bold', color: '#1890ff' }}>
                                {totalCost > 0 ? moneyFormatter({ amount: totalCost }) : '-'}
                            </span>
                        </div>
                    </div>
                );
            }}
        </Form.Item>
    );
}
