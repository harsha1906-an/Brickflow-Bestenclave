import React, { useState, useEffect } from 'react';
import { Divider, Button, Row, Col, Descriptions, Statistic, Tag, Table, Modal, Tooltip, Card, theme as antTheme, Form, Input, InputNumber, Select, DatePicker } from 'antd';
import { PageHeader } from '@ant-design/pro-layout';
import {
    EditOutlined,
    FilePdfOutlined,
    CloseCircleOutlined,
    WalletOutlined,
    HistoryOutlined
} from '@ant-design/icons';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { erp } from '@/redux/erp/actions';
import { useMoney, useDate } from '@/settings';
import useLanguage from '@/locale/useLanguage';
import { request } from '@/request';
import SupplierForm from '@/forms/SupplierForm';
import dayjs from 'dayjs';
import storePersist from '@/redux/storePersist';
import { API_BASE_URL, DOWNLOAD_BASE_URL } from '@/config/serverApiConfig';

const SupplierDetails = ({ item, config }) => {
    const translate = useLanguage();
    const navigate = useNavigate();
    const dispatch = useDispatch();
    const { moneyFormatter, currency_symbol } = useMoney();
    const { dateFormat } = useDate();
    const { token } = antTheme.useToken();

    const [inventoryHistory, setInventoryHistory] = useState([]);
    const [expenseHistory, setExpenseHistory] = useState([]);
    const [loadingHistory, setLoadingHistory] = useState(false);

    const [paymentModalVisible, setPaymentModalVisible] = useState(false);

    // Calculations
    const [financials, setFinancials] = useState({
        totalMaterialCost: 0,
        totalPaid: 0,
        balance: 0
    });

    const handleDownloadSupplierDetails = () => {
        const auth = storePersist.get('auth');
        const token = auth?.current?.token;
        const url = `${API_BASE_URL}supplier/${item._id}/pdf-details?token=${token}`;
        window.open(url, '_blank');
    };

    const handleDownloadReceipt = (expenseId) => {
        const auth = storePersist.get('auth');
        const token = auth?.current?.token;
        const url = `${DOWNLOAD_BASE_URL}expense/expense-${expenseId}.pdf?token=${token}`;
        window.open(url, '_blank');
    };

    useEffect(() => {
        if (item?._id) {
            fetchHistory();
        }
    }, [item]);

    const fetchHistory = async () => {
        setLoadingHistory(true);
        try {
            const inventoryRes = await request.list({
                entity: 'inventorytransaction',
                options: {
                    filter: 'supplier',
                    equal: item._id,
                    items: 1000
                }
            });

            const expenseRes = await request.list({
                entity: 'expense',
                options: {
                    supplier: item._id,
                    recipientType: 'Supplier',
                    items: 1000
                }
            });

            const transactions = inventoryRes.result || [];
            const expenses = expenseRes.result || [];

            const transactionPayments = {};
            expenses.forEach(exp => {
                if (exp.supplierPayments && Array.isArray(exp.supplierPayments)) {
                    exp.supplierPayments.forEach(sp => {
                        const tId = sp.inventoryTransaction?._id || sp.inventoryTransaction;
                        if (tId) {
                            transactionPayments[tId] = (transactionPayments[tId] || 0) + (sp.amountPaid || 0);
                        }
                    });
                }
            });

            const enrichedTransactions = transactions.filter(t => t.type === 'inward').map(t => {
                const paid = transactionPayments[t._id] || 0;
                return {
                    ...t,
                    paidAmount: paid,
                    balanceAmount: (t.totalCost || 0) - paid
                };
            });

            setInventoryHistory(enrichedTransactions);
            setExpenseHistory(expenses);

            const totalMaterialCost = enrichedTransactions
                .reduce((sum, t) => sum + (t.totalCost || 0), 0);

            const totalPaid = expenses.reduce((sum, e) => sum + (e.totalAmount !== undefined ? e.totalAmount : (e.amount || 0)), 0);

            setFinancials({
                totalMaterialCost,
                totalPaid,
                balance: totalMaterialCost - totalPaid
            });

        } catch (error) {
            console.error("Error fetching supplier history:", error);
        } finally {
            setLoadingHistory(false);
        }
    };

    const handleMakePayment = () => {
        setPaymentModalVisible(true);
    };

    const handlePaymentSuccess = () => {
        setPaymentModalVisible(false);
        fetchHistory();
    };

    const formatDate = (date) => {
        if (!date) return '';
        return dayjs(date).format(dateFormat);
    };

    const inventoryColumns = [
        { title: 'Arrival Date', dataIndex: 'date', render: d => formatDate(d) },
        { title: 'Entry Date (Detected)', dataIndex: 'entryDate', render: d => d ? dayjs(d).format(dateFormat + ' HH:mm') : '-' },
        { title: 'Item', dataIndex: ['material', 'name'] },
        { title: 'Qty', dataIndex: 'quantity', render: (q, r) => `${q} ${r.material?.unit || ''}` },
        { title: 'Cost', dataIndex: 'totalCost', align: 'right', render: amount => moneyFormatter({ amount }) },
        { title: 'Paid', dataIndex: 'paidAmount', align: 'right', render: amount => moneyFormatter({ amount }) },
        { title: 'Balance', dataIndex: 'balanceAmount', align: 'right', render: amount => moneyFormatter({ amount }) },
        { title: 'Ref', dataIndex: 'reference' }
    ];

    const expenseColumns = [
        { title: 'Date', dataIndex: 'date', render: d => formatDate(d) },
        { title: 'Amount', dataIndex: 'totalAmount', align: 'right', render: (val, record) => moneyFormatter({ amount: val !== undefined ? val : record.amount }) },
        { title: 'Mode', dataIndex: 'paymentMode', render: m => <Tag color="blue">{m}</Tag> },
        { title: 'Ref', dataIndex: 'reference' },
        { title: 'Description', dataIndex: 'description', ellipsis: true },
        {
            title: 'Receipt',
            dataIndex: '_id',
            width: 80,
            align: 'center',
            render: (expenseId) => (
                <Tooltip title="Download Receipt">
                    <Button
                        type="text"
                        shape="circle"
                        icon={<FilePdfOutlined style={{ color: '#ff4d4f' }} />}
                        onClick={() => handleDownloadReceipt(expenseId)}
                    />
                </Tooltip>
            )
        }
    ];

    return (
        <>
            <PageHeader
                onBack={() => navigate('/supplier')}
                title={item.name}
                subTitle={
                    Array.isArray(item.supplierType) ? (
                        <div style={{ display: 'inline-flex', gap: '4px', flexWrap: 'wrap', verticalAlign: 'middle' }}>
                            {item.supplierType.map(type => {
                                const typeLabels = {
                                    cement: 'Cement',
                                    aggregate: 'Aggregate',
                                    stones_bolders: 'Size Stones / Bolders',
                                    waterproofing_chemicals: 'Waterproofing Chemicals',
                                    steel: 'Steel',
                                    rods: 'Steel Rods',
                                    bricks: 'Bricks',
                                    tiles: 'Tiles',
                                    electrical: 'Electrical',
                                    plumbing: 'Plumbing',
                                    hardware: 'Hardware',
                                    paint: 'Paint',
                                    wood: 'Wood',
                                    glass: 'Glass',
                                    sanitary: 'Sanitary',
                                    other: 'Other'
                                };
                                return (
                                    <Tag color="blue" key={type}>
                                        {typeLabels[type] || (type ? type.charAt(0).toUpperCase() + type.slice(1) : '')}
                                    </Tag>
                                );
                            })}
                        </div>
                    ) : (
                        item.supplierType && (() => {
                            const typeLabels = {
                                cement: 'Cement',
                                aggregate: 'Aggregate',
                                stones_bolders: 'Size Stones / Bolders',
                                waterproofing_chemicals: 'Waterproofing Chemicals',
                                steel: 'Steel',
                                rods: 'Steel Rods',
                                bricks: 'Bricks',
                                tiles: 'Tiles',
                                electrical: 'Electrical',
                                plumbing: 'Plumbing',
                                hardware: 'Hardware',
                                paint: 'Paint',
                                wood: 'Wood',
                                glass: 'Glass',
                                sanitary: 'Sanitary',
                                other: 'Other'
                            };
                            return (
                                <Tag color="blue">
                                    {typeLabels[item.supplierType] || (item.supplierType ? item.supplierType.charAt(0).toUpperCase() + item.supplierType.slice(1) : '')}
                                </Tag>
                            );
                        })()
                    )
                }
                extra={[
                    <Button key="close" onClick={() => navigate('/supplier')} icon={<CloseCircleOutlined />}>
                        {translate('Close')}
                    </Button>,
                    <Button
                        key="download-pdf"
                        onClick={handleDownloadSupplierDetails}
                        icon={<FilePdfOutlined />}
                    >
                        PDF
                    </Button>,
                    <Button
                        key="edit"
                        type="primary"
                        onClick={() => {
                            dispatch(
                                erp.currentAction({
                                    actionType: 'update',
                                    data: item,
                                })
                            );
                            navigate(`/supplier/update/${item._id}`);
                        }}
                        icon={<EditOutlined />}
                    >
                        {translate('Edit')}
                    </Button>,
                ]}
            >
                <Row gutter={16}>
                    <Col span={16}>
                        <Descriptions column={2}>
                            <Descriptions.Item label={translate('Email')}>{item.email}</Descriptions.Item>
                            <Descriptions.Item label={translate('Phone')}>{item.phone}</Descriptions.Item>
                            <Descriptions.Item label={translate('City')}>{item.city}</Descriptions.Item>
                            <Descriptions.Item label={translate('Tax ID')}>{item.taxNumber}</Descriptions.Item>
                            <Descriptions.Item label={translate('Address')} span={2}>{item.address}</Descriptions.Item>
                        </Descriptions>
                    </Col>
                    <Col span={8} style={{ textAlign: 'right' }}>
                        <Button
                            type="primary"
                            size="large"
                            icon={<WalletOutlined />}
                            onClick={handleMakePayment}
                            style={{ marginBottom: 10, background: token.colorSuccess, borderColor: token.colorSuccess }}
                        >
                            Make Payment
                        </Button>
                    </Col>
                </Row>
            </PageHeader>

            <Divider dashed />

            <Row gutter={16} style={{ marginBottom: 24 }}>
                <Col span={8}>
                    <Card bordered={true} style={{ borderColor: token.colorSuccess, textAlign: 'center' }}>
                        <Statistic
                            title="Total Material Cost"
                            value={financials.totalMaterialCost}
                            precision={2}
                            formatter={val => moneyFormatter({ amount: val })}
                            valueStyle={{ color: token.colorSuccess }}
                        />
                    </Card>
                </Col>
                <Col span={8}>
                    <Card bordered={true} style={{ borderColor: token.colorPrimary, textAlign: 'center' }}>
                        <Statistic
                            title="Total Paid"
                            value={financials.totalPaid}
                            precision={2}
                            formatter={val => moneyFormatter({ amount: val })}
                            valueStyle={{ color: token.colorPrimary }}
                        />
                    </Card>
                </Col>
                <Col span={8}>
                    <StatisticCard Balance={financials.balance} moneyFormatter={moneyFormatter} token={token} />
                </Col>
            </Row>

            <Row gutter={24}>
                <Col span={12}>
                    <Divider orientation="left"><HistoryOutlined /> Material History (Inward)</Divider>
                    <Table
                        columns={inventoryColumns}
                        dataSource={inventoryHistory}
                        rowKey="_id"
                        loading={loadingHistory}
                        pagination={{ pageSize: 5 }}
                        size="small"
                    />
                </Col>
                <Col span={12}>
                    <Divider orientation="left"><WalletOutlined /> Payment History</Divider>
                    <Table
                        columns={expenseColumns}
                        dataSource={expenseHistory}
                        rowKey="_id"
                        loading={loadingHistory}
                        pagination={{ pageSize: 5 }}
                        size="small"
                    />
                </Col>
            </Row>

            {/* Payment Modal */}
            <Modal
                title={`Make Payment to ${item.name}`}
                open={paymentModalVisible}
                onCancel={() => setPaymentModalVisible(false)}
                footer={null}
                destroyOnClose
                width={1000}
            >
                <PaymentWrapper
                    supplier={item}
                    onSuccess={handlePaymentSuccess}
                    maxAmount={financials.balance > 0 ? financials.balance : null}
                    moneyFormatter={moneyFormatter}
                    currency_symbol={currency_symbol}
                    pendingTransactions={inventoryHistory.filter(t => t.balanceAmount > 0)}
                    formatDate={formatDate}
                />
            </Modal>
        </>
    );
};

const StatisticCard = ({ Balance, moneyFormatter, token }) => {
    return (
        <Card bordered={true} style={{ borderColor: Balance > 0 ? token.colorError : token.colorSuccess, textAlign: 'center' }}>
            <Statistic
                title="Balance Payable"
                value={Balance}
                precision={2}
                formatter={val => moneyFormatter({ amount: val })}
                valueStyle={{ color: Balance > 0 ? token.colorError : token.colorSuccess }}
            />
        </Card>
    )
}

const PaymentWrapper = ({ supplier, onSuccess, maxAmount, moneyFormatter, currency_symbol, pendingTransactions, formatDate }) => {
    const [form] = Form.useForm();
    const [loading, setLoading] = useState(false);
    const [selectedRowKeys, setSelectedRowKeys] = useState([]);
    const [allocations, setAllocations] = useState({});

    // When rows are selected/deselected, update total amount
    useEffect(() => {
        let total = 0;
        selectedRowKeys.forEach(key => {
            total += allocations[key] || 0;
        });
        form.setFieldsValue({ amount: total });
    }, [selectedRowKeys, allocations, form]);

    const handleAllocationChange = (val, recordId) => {
        setAllocations(prev => ({
            ...prev,
            [recordId]: val
        }));
    };

    const rowSelection = {
        selectedRowKeys,
        onChange: (newSelectedRowKeys, selectedRows) => {
            setSelectedRowKeys(newSelectedRowKeys);
            // Default allocation is the full balance if not already set
            const newAllocations = { ...allocations };
            selectedRows.forEach(row => {
                if (!newAllocations[row._id]) {
                    newAllocations[row._id] = row.balanceAmount;
                }
            });
            setAllocations(newAllocations);
        },
    };

    const columns = [
        { title: 'Date', dataIndex: 'date', render: d => formatDate(d) },
        { title: 'Material', dataIndex: ['material', 'name'] },
        { title: 'Cost', dataIndex: 'totalCost', align: 'right', render: amount => moneyFormatter({ amount }) },
        { title: 'Balance', dataIndex: 'balanceAmount', align: 'right', render: amount => moneyFormatter({ amount }) },
        { 
            title: 'Payment Amount', 
            dataIndex: 'paymentAmount', 
            width: 150,
            render: (_, record) => {
                const isSelected = selectedRowKeys.includes(record._id);
                return (
                    <InputNumber
                        min={0}
                        max={record.balanceAmount}
                        disabled={!isSelected}
                        value={allocations[record._id] !== undefined ? allocations[record._id] : record.balanceAmount}
                        onChange={(val) => handleAllocationChange(val, record._id)}
                        style={{ width: '100%' }}
                    />
                );
            }
        }
    ];

    const onFinish = async (values) => {
        if (values.amount <= 0) {
            return;
        }
        setLoading(true);
        try {
            const supplierPayments = selectedRowKeys.map(key => ({
                inventoryTransaction: key,
                amountPaid: allocations[key] || 0
            })).filter(sp => sp.amountPaid > 0);

            // Calculate tax, discount, roundOff
            const taxRate = values.taxRate || 0;
            const taxAmount = values.amount * (taxRate / 100);
            const discount = values.discount || 0;
            const roundOff = values.roundOff || 0;
            const totalAmount = values.amount + taxAmount - discount + roundOff;

            const payload = {
                ...values,
                taxRate,
                taxAmount,
                discount,
                roundOff,
                totalAmount,
                recipientType: 'Supplier',
                supplier: supplier._id, // Enforce current supplier
                supplierPayments
            };
            const response = await request.create({ entity: 'expense', jsonData: payload });
            if (response.success) {
                onSuccess();
            }
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    }

    return (
        <Form
            form={form}
            layout="vertical"
            onFinish={onFinish}
            initialValues={{
                paymentMode: 'Cash',
                recipientType: 'Supplier',
                supplier: supplier._id,
                amount: 0,
                discount: 0,
                roundOff: 0,
                gstin: supplier?.taxNumber || ''
            }}
        >
            <Form.Item name="recipientType" hidden><Input /></Form.Item>
            <Form.Item name="supplier" hidden><Input /></Form.Item>

            <Divider orientation="left">Select Transactions to Pay</Divider>
            <Table
                rowSelection={rowSelection}
                columns={columns}
                dataSource={pendingTransactions}
                rowKey="_id"
                pagination={false}
                size="small"
                style={{ marginBottom: 24 }}
                scroll={{ y: 240 }}
            />

            <QuickPaymentForm currency_symbol={currency_symbol} />

            <Form.Item shouldUpdate>
                {() => {
                    const amount = form.getFieldValue('amount') || 0;
                    const taxRate = form.getFieldValue('taxRate') || 0;
                    const taxAmount = amount * (taxRate / 100);
                    const discount = form.getFieldValue('discount') || 0;
                    const roundOff = form.getFieldValue('roundOff') || 0;
                    const totalAmount = amount + taxAmount - discount + roundOff;
                    
                    return (
                        <Button 
                            type="primary" 
                            htmlType="submit" 
                            loading={loading} 
                            block 
                            disabled={!amount || amount <= 0}
                        >
                            Record Payment of {moneyFormatter({ amount: totalAmount })}
                        </Button>
                    );
                }}
            </Form.Item>
        </Form>
    );
};

const QuickPaymentForm = ({ currency_symbol }) => {
    return (
        <>
            <Row gutter={16}>
                <Col span={12}>
                    <Form.Item name="date" label="Date" initialValue={dayjs()} rules={[{ required: true }]}>
                        <DatePicker style={{ width: '100%' }} />
                    </Form.Item>
                </Col>
                <Col span={12}>
                    <Form.Item name="amount" label="Base Amount" rules={[{ required: true }]}>
                        <InputNumber
                            min={0}
                            style={{ width: '100%' }}
                            addonBefore={currency_symbol}
                            disabled
                        />
                    </Form.Item>
                </Col>
            </Row>
            <Row gutter={16}>
                <Col span={12}>
                    <Form.Item name="discount" label="Discount">
                        <InputNumber
                            min={0}
                            style={{ width: '100%' }}
                            addonBefore={currency_symbol}
                        />
                    </Form.Item>
                </Col>
                <Col span={12}>
                    <Form.Item name="roundOff" label="Round Off">
                        <InputNumber
                            style={{ width: '100%' }}
                            addonBefore={currency_symbol}
                        />
                    </Form.Item>
                </Col>
            </Row>
            <Row gutter={16}>
                <Col span={12}>
                    <Form.Item name="taxRate" label="Tax Slab (India)">
                        <Select allowClear placeholder="Select Tax Slab">
                            <Select.Option value={0}>0%</Select.Option>
                            <Select.Option value={5}>5%</Select.Option>
                            <Select.Option value={12}>12%</Select.Option>
                            <Select.Option value={18}>18%</Select.Option>
                            <Select.Option value={28}>28%</Select.Option>
                        </Select>
                    </Form.Item>
                </Col>
                <Col span={12}>
                    <Form.Item name="taxType" label="Tax Type">
                        <Select allowClear placeholder="Select Tax Type">
                            <Select.Option value="IGST">IGST</Select.Option>
                            <Select.Option value="CGST_SGST">CGST & SGST</Select.Option>
                        </Select>
                    </Form.Item>
                </Col>
            </Row>
            <Row gutter={16}>
                <Col span={12}>
                    <Form.Item name="paymentMode" label="Payment Mode" rules={[{ required: true }]}>
                        <Select>
                            <Select.Option value="Cash">Cash</Select.Option>
                            <Select.Option value="Bank Transfer">Bank Transfer</Select.Option>
                            <Select.Option value="Cheque">Cheque</Select.Option>
                            <Select.Option value="UPI">UPI</Select.Option>
                            <Select.Option value="Card">Card</Select.Option>
                        </Select>
                    </Form.Item>
                </Col>
                <Col span={12}>
                    <Form.Item name="reference" label="Reference / Transaction ID">
                        <Input />
                    </Form.Item>
                </Col>
            </Row>
            <Row gutter={16}>
                <Col span={12}>
                    <Form.Item name="gstin" label="GSTIN Number">
                        <Input placeholder="Enter GSTIN Number" />
                    </Form.Item>
                </Col>
                <Col span={12}>
                    <Form.Item name="description" label="Notes">
                        <Input.TextArea rows={1} />
                    </Form.Item>
                </Col>
            </Row>
        </>
    )
}

export default SupplierDetails;
