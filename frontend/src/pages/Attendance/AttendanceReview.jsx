import React, { useEffect, useState } from 'react';
import { Card, Tabs, Table, Select, DatePicker, Space, Tag, Empty, App, Button, Form, Modal, Input, InputNumber, Statistic, Row, Col, Divider, Typography, Descriptions } from 'antd';
import { CheckCircleOutlined, CloseCircleOutlined, DownloadOutlined, ClockCircleOutlined, FieldTimeOutlined, EditOutlined, DeleteOutlined, DollarOutlined, WalletOutlined, EyeOutlined } from '@ant-design/icons';
import { useAppContext } from '@/context/appContext';
import { request } from '@/request';
import dayjs from 'dayjs';
import { useUserRole } from '@/hooks/useUserRole';

const { RangePicker } = DatePicker;
const { Text } = Typography;

const AttendanceReview = () => {
    const [activeTab, setActiveTab] = useState('by-date');
    const { state: stateApp } = useAppContext();
    const companyId = stateApp.currentCompany;

    return (
        <div>
            <Card>
                <h2>Attendance Review</h2>
                <Tabs
                    activeKey={activeTab}
                    onChange={setActiveTab}
                    items={[
                        {
                            key: 'by-date',
                            label: 'By Date',
                            children: <ByDateView companyId={companyId} />,
                        },
                        {
                            key: 'by-labour',
                            label: 'By Labour',
                            children: <ByLabourView companyId={companyId} />,
                        },
                        {
                            key: 'payment',
                            label: <span><WalletOutlined /> Payment Summary</span>,
                            children: <PaymentSummaryView companyId={companyId} />,
                        },
                    ]}
                />
            </Card>
        </div>
    );
};

const ByDateView = ({ companyId }) => {
    const { message, modal } = App.useApp();
    const { role } = useUserRole();
    const isReadOnly = role === 'ACCOUNTANT';

    const [selectedDate, setSelectedDate] = useState(dayjs());
    const [data, setData] = useState([]);
    const [labourList, setLabourList] = useState([]);
    const [loading, setLoading] = useState(false);
    const [filter, setFilter] = useState('all'); // all, present, absent
    const [wageFilter, setWageFilter] = useState('all'); // all, daily, monthly, contract
    const [editRecord, setEditRecord] = useState(null);
    const [modalOpen, setModalOpen] = useState(false);

    useEffect(() => {
        if (companyId) {
            fetchData();
        }
        // eslint-disable-next-line
    }, [selectedDate, companyId]);

    useEffect(() => {
        if (companyId) {
            fetchLabourList();
        }
        // eslint-disable-next-line
    }, [companyId]);

    const fetchLabourList = async () => {
        try {
            const res = await request.get({ entity: `companies/${companyId}/labour` });
            setLabourList(res);
        } catch (e) {
            message.error('Failed to load labour list');
        }
    };

    const fetchData = async () => {
        setLoading(true);
        try {
            const dateStr = selectedDate.format('YYYY-MM-DD');
            const res = await request.get({ entity: `companies/${companyId}/attendance?date=${dateStr}` });
            setData(res);
        } catch (e) {
            message.error('Failed to load attendance');
        }
        setLoading(false);
    };

    useEffect(() => {
        const handleUndo = () => fetchData();
        window.addEventListener('undo-delete-refresh', handleUndo);
        return () => window.removeEventListener('undo-delete-refresh', handleUndo);
    });

    const getLabourName = (labourId) => {
        const labour = labourList.find(l => l._id === labourId);
        return labour ? labour.name : labourId;
    };

    const getLabourSkill = (labourId) => {
        const labour = labourList.find(l => l._id === labourId);
        if (!labour) return '-';
        const skillMap = {
            mason: 'Mason',
            electrician: 'Electrician',
            plumber: 'Plumber',
            helper: 'Helper',
            staff: 'Staff',
            other: 'Other'
        };
        return skillMap[labour.skill] || labour.skill;
    };

    const getLabourEmploymentType = (labourId) => {
        const labour = labourList.find(l => l._id === labourId);
        return labour ? labour.employmentType : null;
    };

    const filteredData = data.filter(record => {
        if (filter === 'present' && record.status !== 'present') return false;
        if (filter === 'absent' && record.status !== 'absent') return false;
        if (wageFilter !== 'all') {
            const empType = getLabourEmploymentType(record.labourId);
            if (empType !== wageFilter) return false;
        }
        return true;
    });

    const columns = [
        {
            title: 'Labour Name',
            dataIndex: 'labourId',
            key: 'labourId',
            render: (labourId) => getLabourName(labourId),
            sorter: (a, b) => getLabourName(a.labourId).localeCompare(getLabourName(b.labourId))
        },
        {
            title: 'Skill',
            dataIndex: 'labourId',
            key: 'skill',
            render: (labourId) => getLabourSkill(labourId)
        },
        {
            title: 'Status',
            dataIndex: 'status',
            key: 'status',
            render: (status) => {
                if (status === 'present') return <Tag icon={<CheckCircleOutlined />} color="success">Present</Tag>;
                if (status === 'absent') return <Tag icon={<CloseCircleOutlined />} color="error">Absent</Tag>;
                if (status === 'half-day') return <Tag icon={<FieldTimeOutlined />} color="processing">Half Day</Tag>;
                if (status === 'overtime') return <Tag icon={<ClockCircleOutlined />} color="purple">Overtime</Tag>;
                if (status === 'casual-leave') return <Tag icon={<CheckCircleOutlined />} color="blue">Casual Leave</Tag>;
                return status;
            },
            filters: [
                { text: 'Present', value: 'present' },
                { text: 'Absent', value: 'absent' },
                { text: 'Half Day', value: 'half-day' },
                { text: 'Overtime', value: 'overtime' },
                { text: 'Casual Leave', value: 'casual-leave' }
            ],
            onFilter: (value, record) => record.status === value
        },
        {
            title: 'Marked At',
            dataIndex: 'createdAt',
            key: 'createdAt',
            render: (date) => dayjs(date).format('DD MMM YYYY HH:mm'),
            sorter: (a, b) => dayjs(a.createdAt).unix() - dayjs(b.createdAt).unix()
        }
    ];

    columns.push({
        title: 'Action',
        key: 'action',
        width: 120,
        render: (_, record) => (
            <Space>
                <Button icon={<EditOutlined />} onClick={() => { setEditRecord(record); setModalOpen(true); }} size="small" />
                <Button icon={<DeleteOutlined />} danger onClick={() => handleDelete(record)} size="small" />
            </Space>
        )
    });

    const handleDelete = (record) => {
        modal.confirm({
            title: 'Delete Attendance',
            content: 'Are you sure you want to delete this attendance record?',
            okText: 'Delete',
            okType: 'danger',
            cancelText: 'Cancel',
            onOk: async () => {
                try {
                    await request.delete({
                        entity: `companies/${companyId}/attendance/${record._id}`
                    });
                    fetchData();
                } catch (e) {
                    console.error(e);
                    message.error('Failed to delete attendance');
                }
            }
        });
    };


    return (
        <Space direction="vertical" size="large" style={{ width: '100%' }}>
            <Space>
                <DatePicker
                    value={selectedDate}
                    onChange={setSelectedDate}
                    format="YYYY-MM-DD"
                    style={{ width: 200 }}
                />
                <Select
                    value={filter}
                    onChange={setFilter}
                    style={{ width: 150 }}
                    options={[
                        { label: 'All Status', value: 'all' },
                        { label: 'Present Only', value: 'present' },
                        { label: 'Absent Only', value: 'absent' }
                    ]}
                />
                <Select
                    value={wageFilter}
                    onChange={setWageFilter}
                    style={{ width: 170 }}
                    options={[
                        { label: 'All Wage Types', value: 'all' },
                        { label: 'Daily Wage', value: 'daily' },
                        { label: 'Monthly Wage', value: 'monthly' },
                        { label: 'Contract', value: 'contract' }
                    ]}
                />
            </Space>

            {filteredData.length > 0 && (
                <div>
                    <Space size="large">
                        <span>Showing: <strong>{filteredData.length}</strong>{filteredData.length !== data.length ? ` of ${data.length}` : ''}</span>
                        <span>Present: <strong style={{ color: '#52c41a' }}>{filteredData.filter(r => r.status === 'present').length}</strong></span>
                        <span>Absent: <strong style={{ color: '#ff4d4f' }}>{filteredData.filter(r => r.status === 'absent').length}</strong></span>
                    </Space>
                </div>
            )}

            <Table
                rowKey="_id"
                columns={columns}
                dataSource={filteredData}
                loading={loading}
                locale={{
                    emptyText: <Empty description={`No attendance records for ${selectedDate.format('DD MMM YYYY')}`} />
                }}
                pagination={{ pageSize: 20 }}
            />
            <EditAttendanceModal
                open={modalOpen}
                record={editRecord}
                onCancel={() => setModalOpen(false)}
                onSuccess={() => {
                    setModalOpen(false);
                    message.success('Attendance updated successfully');
                    fetchData();
                }}
                companyId={companyId}
            />
        </Space>
    );
};

// By Labour View Component
const ByLabourView = ({ companyId }) => {
    const { message, modal } = App.useApp();
    const { role } = useUserRole();
    const isReadOnly = role === 'ACCOUNTANT';

    const [selectedLabour, setSelectedLabour] = useState(null);
    const [dateRange, setDateRange] = useState([dayjs().subtract(30, 'days'), dayjs()]);
    const [data, setData] = useState([]);
    const [labourList, setLabourList] = useState([]);
    const [loading, setLoading] = useState(false);
    const [editRecord, setEditRecord] = useState(null);
    const [modalOpen, setModalOpen] = useState(false);

    useEffect(() => {
        if (companyId) {
            fetchLabourList();
        }
        // eslint-disable-next-line
    }, [companyId]);

    useEffect(() => {
        if (selectedLabour && dateRange) {
            fetchData();
        }
        // eslint-disable-next-line
    }, [selectedLabour, dateRange]);

    const fetchLabourList = async () => {
        try {
            const res = await request.get({ entity: `companies/${companyId}/labour` });
            setLabourList(res);
            if (res.length > 0) {
                setSelectedLabour(res[0]._id);
            }
        } catch (e) {
            message.error('Failed to load labour list');
        }
    };

    const fetchData = async () => {
        setLoading(true);
        try {
            const res = await request.get({ entity: `companies/${companyId}/attendance?labourId=${selectedLabour}` });

            // Filter by date range
            const filtered = res.filter(record => {
                const recordDate = dayjs(record.date);
                return recordDate.isAfter(dateRange[0].subtract(1, 'day')) &&
                    recordDate.isBefore(dateRange[1].add(1, 'day'));
            });

            setData(filtered);
        } catch (e) {
            message.error('Failed to load attendance');
        }
        setLoading(false);
    };

    useEffect(() => {
        const handleUndo = () => fetchData();
        window.addEventListener('undo-delete-refresh', handleUndo);
        return () => window.removeEventListener('undo-delete-refresh', handleUndo);
    });

    const columns = [
        {
            title: 'Date',
            dataIndex: 'date',
            key: 'date',
            render: (date) => dayjs(date).format('DD MMM YYYY'),
            sorter: (a, b) => dayjs(a.date).unix() - dayjs(b.date).unix(),
            defaultSortOrder: 'descend'
        },
        {
            title: 'Day',
            dataIndex: 'date',
            key: 'day',
            render: (date) => dayjs(date).format('dddd')
        },
        {
            title: 'Status',
            dataIndex: 'status',
            key: 'status',
            render: (status) => {
                if (status === 'present') return <Tag icon={<CheckCircleOutlined />} color="success">Present</Tag>;
                if (status === 'absent') return <Tag icon={<CloseCircleOutlined />} color="error">Absent</Tag>;
                if (status === 'half-day') return <Tag icon={<FieldTimeOutlined />} color="processing">Half Day</Tag>;
                if (status === 'overtime') return <Tag icon={<ClockCircleOutlined />} color="purple">Overtime</Tag>;
                if (status === 'casual-leave') return <Tag icon={<CheckCircleOutlined />} color="blue">Casual Leave</Tag>;
                return status;
            }
        },
        {
            title: 'Marked At',
            dataIndex: 'createdAt',
            key: 'createdAt',
            render: (date) => dayjs(date).format('DD MMM YYYY HH:mm')
        }
    ];

    columns.push({
        title: 'Action',
        key: 'action',
        width: 120,
        render: (_, record) => (
            <Space>
                <Button icon={<EditOutlined />} onClick={() => { setEditRecord(record); setModalOpen(true); }} size="small" />
                <Button icon={<DeleteOutlined />} danger onClick={() => handleDelete(record)} size="small" />
            </Space>
        )
    });

    const handleDelete = (record) => {
        modal.confirm({
            title: 'Delete Attendance',
            content: 'Are you sure you want to delete this attendance record?',
            okText: 'Delete',
            okType: 'danger',
            cancelText: 'Cancel',
            onOk: async () => {
                try {
                    await request.delete({
                        entity: `companies/${companyId}/attendance/${record._id}`
                    });
                    fetchData();
                } catch (e) {
                    console.error(e);
                    message.error('Failed to delete attendance');
                }
            }
        });
    };

    const presentCount = data.filter(r => r.status === 'present').length;
    const totalDays = data.length;
    const attendancePercentage = totalDays > 0 ? ((presentCount / totalDays) * 100).toFixed(1) : 0;

    const selectedLabourData = labourList.find(l => l._id === selectedLabour);

    return (
        <Space direction="vertical" size="large" style={{ width: '100%' }}>
            <Space wrap>
                <Select
                    value={selectedLabour}
                    onChange={setSelectedLabour}
                    style={{ width: 250 }}
                    placeholder="Select Labour"
                    showSearch
                    filterOption={(input, option) =>
                        option.label.toLowerCase().includes(input.toLowerCase())
                    }
                    options={labourList.map(l => ({
                        label: `${l.name} (${l.skill})`,
                        value: l._id
                    }))}
                />
                <RangePicker
                    value={dateRange}
                    onChange={setDateRange}
                    format="YYYY-MM-DD"
                />
            </Space>

            {selectedLabourData && (
                <Card size="small">
                    <Space direction="vertical" style={{ width: '100%' }}>
                        <div><strong>Name:</strong> {selectedLabourData.name}</div>
                        <div><strong>Skill:</strong> {selectedLabourData.skill}</div>
                        <div><strong>Status:</strong> {selectedLabourData.isActive ?
                            <Tag color="success">Active</Tag> :
                            <Tag color="default">Inactive</Tag>
                        }</div>
                    </Space>
                </Card>
            )}

            {data.length > 0 && (
                <Card size="small">
                    <Space size="large">
                        <span>Total Days: <strong>{totalDays}</strong></span>
                        <span>Present: <strong style={{ color: '#52c41a' }}>{presentCount}</strong></span>
                        <span>Absent: <strong style={{ color: '#ff4d4f' }}>{totalDays - presentCount}</strong></span>
                        <span>Attendance: <strong style={{ color: attendancePercentage >= 80 ? '#52c41a' : '#faad14' }}>{attendancePercentage}%</strong></span>
                    </Space>
                </Card>
            )}

            <Table
                rowKey="_id"
                columns={columns}
                dataSource={data}
                loading={loading}
                locale={{
                    emptyText: <Empty description="No attendance records for selected period" />
                }}
                pagination={{ pageSize: 31, showSizeChanger: true, pageSizeOptions: ['31', '60', '90'] }}
            />
            <EditAttendanceModal
                open={modalOpen}
                record={editRecord}
                onCancel={() => setModalOpen(false)}
                onSuccess={() => {
                    setModalOpen(false);
                    message.success('Attendance updated successfully');
                    fetchData();
                }}
                companyId={companyId}
            />
        </Space>
    );
};

// Reusable Edit Attendance Modal Component
const EditAttendanceModal = ({ open, record, onCancel, onSuccess, companyId }) => {
    const [form] = Form.useForm();
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        if (open && record) {
            form.setFieldsValue({
                status: record.status,
                otHours: record.otHours || 0,
                advanceDeduction: record.advanceDeduction || 0,
                penalty: record.penalty || 0,
                miscWorkDescription: record.miscWorkDescription || ''
            });
        }
    }, [open, record, form]);

    const handleOk = async () => {
        try {
            const values = await form.validateFields();
            setSaving(true);
            await request.patch({
                entity: `companies/${companyId}/attendance/${record._id}`,
                jsonData: values
            });
            onSuccess();
        } catch (e) {
            console.error(e);
        } finally {
            setSaving(false);
        }
    };

    return (
        <Modal
            title="Edit Attendance"
            open={open}
            onCancel={onCancel}
            onOk={handleOk}
            confirmLoading={saving}
            destroyOnClose
        >
            <Form form={form} layout="vertical">
                <Form.Item name="status" label="Status" rules={[{ required: true }]}>
                    <Select
                        options={[
                            { value: 'present', label: 'Present' },
                            { value: 'half-day', label: 'Half Day' },
                            { value: 'overtime', label: 'Overtime' },
                            { value: 'casual-leave', label: 'Casual Leave' },
                            { value: 'absent', label: 'Absent' }
                        ]}
                    />
                </Form.Item>
                
                <Form.Item noStyle shouldUpdate={(prev, curr) => prev.status !== curr.status}>
                    {({ getFieldValue }) => {
                        const status = getFieldValue('status');
                        if (status === 'overtime') {
                            return (
                                <Form.Item name="otHours" label="Overtime Hours" rules={[{ required: true, message: 'Please enter OT hours' }]}>
                                    <InputNumber min={0.5} max={8} step={0.5} style={{ width: '100%' }} />
                                </Form.Item>
                            );
                        }
                        return null;
                    }}
                </Form.Item>

                <Form.Item name="advanceDeduction" label="Advance Deduction">
                    <InputNumber min={0} style={{ width: '100%' }} />
                </Form.Item>

                <Form.Item name="penalty" label="Penalty">
                    <InputNumber min={0} style={{ width: '100%' }} />
                </Form.Item>

                <Form.Item name="miscWorkDescription" label="Misc Work Description">
                    <Input.TextArea rows={2} />
                </Form.Item>
            </Form>
        </Modal>
    );
};

// Payment Summary View Component
const PaymentSummaryView = ({ companyId }) => {
    const { message } = App.useApp();
    const [dateRange, setDateRange] = useState([dayjs().startOf('month'), dayjs()]);
    const [labourList, setLabourList] = useState([]);
    const [attendanceData, setAttendanceData] = useState([]);
    const [loading, setLoading] = useState(false);
    const [wageFilter, setWageFilter] = useState('all');

    // Payment recording states
    const [villas, setVillas] = useState([]);
    const [projects, setProjects] = useState([]);
    const [paymentModalOpen, setPaymentModalOpen] = useState(false);
    const [selectedLabourRecord, setSelectedLabourRecord] = useState(null);
    const [submittingPayment, setSubmittingPayment] = useState(false);
    const [paymentForm] = Form.useForm();

    // Details Modal states
    const [detailsModalOpen, setDetailsModalOpen] = useState(false);
    const [selectedDetailsRecord, setSelectedDetailsRecord] = useState(null);

    // Bulk payment states
    const [selectedRowKeys, setSelectedRowKeys] = useState([]);
    const [bulkModalOpen, setBulkModalOpen] = useState(false);
    const [submittingBulk, setSubmittingBulk] = useState(false);
    const [bulkForm] = Form.useForm();

    useEffect(() => {
        if (companyId) {
            fetchLabourList();
            fetchVillas();
            fetchProjects();
        }
    }, [companyId]);

    useEffect(() => {
        if (companyId && dateRange && dateRange[0] && dateRange[1]) {
            fetchAttendanceData();
        }
    }, [companyId, dateRange]);

    const fetchVillas = async () => {
        try {
            const res = await request.listAll({ entity: 'villa' });
            if (res.success) {
                setVillas(res.result || []);
            }
        } catch (e) {
            console.error('Failed to load villas:', e);
        }
    };

    const fetchProjects = async () => {
        try {
            const res = await request.listAll({ entity: 'project' });
            if (res.success) {
                setProjects(res.result || []);
            }
        } catch (e) {
            console.error('Failed to load projects:', e);
        }
    };

    const handleOpenPaymentModal = (record) => {
        setSelectedLabourRecord(record);
        paymentForm.setFieldsValue({
            amount: record.netPayable,
            date: dayjs(),
            paymentMode: 'Cash',
            description: `Attendance Payment for period ${dateRange[0].format('DD MMM YYYY')} to ${dateRange[1].format('DD MMM YYYY')} (Effective Days: ${record.effectiveDays})`
        });
        setPaymentModalOpen(true);
    };

    const handleRecordPayment = async () => {
        try {
            const values = await paymentForm.validateFields();
            setSubmittingPayment(true);
            const payload = {
                recipientType: 'Labour',
                labour: selectedLabourRecord.labourId,
                amount: values.amount,
                totalAmount: values.amount,
                paymentMode: values.paymentMode,
                description: values.description,
                date: values.date.format('YYYY-MM-DD'),
                companyId: companyId,
                villa: values.villa || undefined,
                project: values.project || undefined
            };

            await request.post({
                entity: 'expense',
                jsonData: payload
            });

            message.success('Payment successfully recorded as an expense');
            setPaymentModalOpen(false);
            setSelectedLabourRecord(null);
            paymentForm.resetFields();
            
            // Refresh data
            fetchAttendanceData();
        } catch (e) {
            console.error(e);
            message.error(e.response?.data?.message || 'Failed to record payment');
        } finally {
            setSubmittingPayment(false);
        }
    };

    useEffect(() => {
        setSelectedRowKeys([]);
    }, [dateRange, companyId, wageFilter]);

    const handleOpenBulkModal = () => {
        bulkForm.setFieldsValue({
            date: dayjs(),
            paymentMode: 'Cash',
            description: `Bulk Attendance Payment for period ${dateRange[0].format('DD MMM YYYY')} to ${dateRange[1].format('DD MMM YYYY')}`
        });
        setBulkModalOpen(true);
    };

    const handleRecordBulkPayment = async () => {
        try {
            const values = await bulkForm.validateFields();
            setSubmittingBulk(true);
            
            // Loop through selected rows and record payment for each
            for (const record of selectedRowsData) {
                const payload = {
                    recipientType: 'Labour',
                    labour: record.labourId,
                    amount: record.netPayable,
                    totalAmount: record.netPayable,
                    paymentMode: values.paymentMode,
                    description: `${values.description} - ${record.name} (Effective Days: ${record.effectiveDays})`,
                    date: values.date.format('YYYY-MM-DD'),
                    companyId: companyId,
                    villa: values.villa || undefined,
                    project: values.project || undefined
                };

                await request.post({
                    entity: 'expense',
                    jsonData: payload
                });
            }

            message.success(`Successfully recorded payments for ${selectedRowsData.length} labourers`);
            setBulkModalOpen(false);
            setSelectedRowKeys([]);
            bulkForm.resetFields();
            
            // Refresh data
            fetchAttendanceData();
        } catch (e) {
            console.error(e);
            message.error(e.response?.data?.message || 'Failed to record bulk payments');
        } finally {
            setSubmittingBulk(false);
        }
    };

    const fetchLabourList = async () => {
        try {
            const res = await request.get({ entity: `companies/${companyId}/labour` });
            setLabourList(res || []);
        } catch (e) {
            message.error('Failed to load labour list');
        }
    };

    const fetchAttendanceData = async () => {
        setLoading(true);
        try {
            const startDate = dateRange[0].format('YYYY-MM-DD');
            const endDate = dateRange[1].format('YYYY-MM-DD');
            const res = await request.get({
                entity: `companies/${companyId}/attendance?startDate=${startDate}&endDate=${endDate}`
            });
            setAttendanceData(res || []);
        } catch (e) {
            message.error('Failed to load attendance data');
        }
        setLoading(false);
    };

    const getLabourInfo = (labourId) => {
        return labourList.find(l => l._id === labourId) || {};
    };

    const skillMap = {
        mason: 'Mason', electrician: 'Electrician', plumber: 'Plumber',
        helper: 'Helper', staff: 'Staff', other: 'Other'
    };

    // Aggregate attendance data per labour
    const paymentData = React.useMemo(() => {
        const labourMap = {};

        attendanceData.forEach(record => {
            const id = record.labourId;
            const labour = getLabourInfo(id);
            if (!labour || !labour._id) {
                // Skip deleted/unknown labourers who are no longer in the active database list
                return;
            }
            if (!labourMap[id]) {
                labourMap[id] = {
                    key: id,
                    labourId: id,
                    name: labour.name || 'Unknown',
                    skill: skillMap[labour.skill] || labour.skill || '-',
                    employmentType: labour.employmentType || 'daily',
                    dailyWage: labour.dailyWage || 0,
                    monthlySalary: labour.monthlySalary || 0,
                    daysPresent: 0,
                    halfDays: 0,
                    overtimeDays: 0,
                    otHours: 0,
                    daysAbsent: 0,
                    totalWage: 0,
                    totalDeductions: 0,
                    totalPenalty: 0,
                };
            }

            const entry = labourMap[id];

            if (record.status === 'present') entry.daysPresent++;
            else if (record.status === 'half-day') entry.halfDays++;
            else if (record.status === 'overtime') {
                entry.overtimeDays++;
                entry.daysPresent++;
                entry.otHours += record.otHours || 0;
            } else if (record.status === 'absent' || record.status === 'casual-leave') {
                entry.daysAbsent++;
            }

            entry.totalWage += record.wage || 0;
            entry.totalDeductions += record.advanceDeduction || 0;
            entry.totalPenalty += record.penalty || 0;
        });

        return Object.values(labourMap)
            .filter(item => item.employmentType !== 'contract')
            .filter(item => wageFilter === 'all' || item.employmentType === wageFilter)
            .map(item => ({
                ...item,
                effectiveDays: item.daysPresent + (item.halfDays * 0.5),
                netPayable: item.totalWage - item.totalDeductions - item.totalPenalty
            }));
    }, [attendanceData, labourList, wageFilter]);

    const totals = React.useMemo(() => {
        return paymentData.reduce((acc, item) => ({
            daysPresent: acc.daysPresent + item.daysPresent,
            halfDays: acc.halfDays + item.halfDays,
            effectiveDays: acc.effectiveDays + item.effectiveDays,
            otHours: acc.otHours + item.otHours,
            totalWage: acc.totalWage + item.totalWage,
            totalDeductions: acc.totalDeductions + item.totalDeductions,
            totalPenalty: acc.totalPenalty + item.totalPenalty,
            netPayable: acc.netPayable + item.netPayable,
        }), { daysPresent: 0, halfDays: 0, effectiveDays: 0, otHours: 0, totalWage: 0, totalDeductions: 0, totalPenalty: 0, netPayable: 0 });
    }, [paymentData]);

    const selectedRowsData = React.useMemo(() => {
        return paymentData.filter(item => selectedRowKeys.includes(item.key));
    }, [paymentData, selectedRowKeys]);

    const totalSelectedAmount = React.useMemo(() => {
        return selectedRowsData.reduce((sum, item) => sum + item.netPayable, 0);
    }, [selectedRowsData]);

    const empTypeColors = { daily: 'blue', monthly: 'green', contract: 'orange' };
    const empTypeLabels = { daily: 'Daily', monthly: 'Monthly', contract: 'Contract' };

    const columns = [
        {
            title: 'Labour Name',
            key: 'name',
            sorter: (a, b) => a.name.localeCompare(b.name),
            fixed: 'left',
            width: 180,
            render: (_, record) => (
                <div>
                    <div style={{ fontWeight: 'bold' }}>{record.name}</div>
                    <div style={{ fontSize: '11px', color: '#8c8c8c' }}>
                        {record.skill} • {empTypeLabels[record.employmentType]}
                    </div>
                </div>
            )
        },
        {
            title: 'Present Days',
            dataIndex: 'effectiveDays',
            key: 'effectiveDays',
            width: 120,
            sorter: (a, b) => a.effectiveDays - b.effectiveDays,
            render: (val) => <Text strong>{val} days</Text>
        },
        {
            title: 'Absent Days',
            dataIndex: 'daysAbsent',
            key: 'daysAbsent',
            width: 120,
            sorter: (a, b) => a.daysAbsent - b.daysAbsent,
            render: (val) => <Text style={{ color: '#ff4d4f' }}>{val} days</Text>
        },
        {
            title: 'Net Payable (₹)',
            dataIndex: 'netPayable',
            key: 'netPayable',
            width: 130,
            sorter: (a, b) => a.netPayable - b.netPayable,
            render: (val) => (
                <Text strong style={{ color: val >= 0 ? '#1890ff' : '#ff4d4f', fontSize: '14px' }}>
                    ₹{val.toLocaleString('en-IN')}
                </Text>
            )
        },
        {
            title: 'Actions',
            key: 'action',
            fixed: 'right',
            width: 140,
            render: (_, record) => (
                <Space size="small">
                    <Button 
                        icon={<EyeOutlined />} 
                        size="small"
                        onClick={() => {
                            setSelectedDetailsRecord(record);
                            setDetailsModalOpen(true);
                        }}
                    >
                        View
                    </Button>
                    <Button 
                        type="primary" 
                        size="small" 
                        icon={<DollarOutlined />} 
                        disabled={record.netPayable <= 0}
                        onClick={() => handleOpenPaymentModal(record)}
                    >
                        Pay
                    </Button>
                </Space>
            )
        },
    ];

    const rowSelection = {
        selectedRowKeys,
        onChange: (keys) => setSelectedRowKeys(keys),
        getCheckboxProps: (record) => ({
            disabled: record.netPayable <= 0,
        }),
    };

    const periodDays = dateRange && dateRange[0] && dateRange[1]
        ? dateRange[1].diff(dateRange[0], 'day') + 1
        : 0;

    return (
        <Space direction="vertical" size="large" style={{ width: '100%' }}>
            <Space wrap>
                <RangePicker
                    value={dateRange}
                    onChange={setDateRange}
                    format="DD MMM YYYY"
                    presets={[
                        { label: 'This Week', value: [dayjs().startOf('week'), dayjs()] },
                        { label: 'This Month', value: [dayjs().startOf('month'), dayjs()] },
                        { label: 'Last Month', value: [dayjs().subtract(1, 'month').startOf('month'), dayjs().subtract(1, 'month').endOf('month')] },
                        { label: 'Last 7 Days', value: [dayjs().subtract(6, 'day'), dayjs()] },
                        { label: 'Last 30 Days', value: [dayjs().subtract(29, 'day'), dayjs()] },
                    ]}
                    style={{ width: 300 }}
                />
                <Select
                    value={wageFilter}
                    onChange={setWageFilter}
                    style={{ width: 170 }}
                    options={[
                        { label: 'All Wage Types', value: 'all' },
                        { label: 'Daily Wage', value: 'daily' },
                        { label: 'Monthly Wage', value: 'monthly' }
                    ]}
                />
            </Space>

            {paymentData.length > 0 && (
                <>
                    <Row gutter={[16, 16]}>
                        <Col xs={12} sm={6} md={4}>
                            <Statistic title="Period" value={`${periodDays} days`} />
                        </Col>
                        <Col xs={12} sm={6} md={4}>
                            <Statistic title="Total Labourers" value={paymentData.length} />
                        </Col>
                        <Col xs={12} sm={6} md={4}>
                            <Statistic title="Total Present Days" value={totals.effectiveDays} valueStyle={{ color: '#52c41a' }} />
                        </Col>
                        <Col xs={12} sm={6} md={4}>
                            <Statistic title="Gross Wages" value={totals.totalWage} prefix="₹" valueStyle={{ color: '#1890ff' }} />
                        </Col>
                        <Col xs={12} sm={6} md={4}>
                            <Statistic title="Total Deductions" value={totals.totalDeductions + totals.totalPenalty} prefix="₹" valueStyle={{ color: '#ff4d4f' }} />
                        </Col>
                        <Col xs={12} sm={6} md={4}>
                            <Statistic title="Net Payable" value={totals.netPayable} prefix="₹" valueStyle={{ color: '#1890ff', fontWeight: 'bold', fontSize: '20px' }} />
                        </Col>
                    </Row>
                    <Divider style={{ margin: '8px 0' }} />
                </>
            )}

            {selectedRowKeys.length > 0 && (
                <div style={{ background: '#e6f7ff', border: '1px solid #91d5ff', padding: '12px 16px', borderRadius: '4px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span>Selected <strong style={{ color: '#1890ff' }}>{selectedRowKeys.length}</strong> labourer{selectedRowKeys.length > 1 ? 's' : ''} | Total Selected: <strong style={{ color: '#52c41a' }}>₹{totalSelectedAmount.toLocaleString('en-IN')}</strong></span>
                    <Button type="primary" icon={<DollarOutlined />} onClick={handleOpenBulkModal}>
                        Pay Selected
                    </Button>
                </div>
            )}

            <Table
                rowKey="key"
                rowSelection={rowSelection}
                columns={columns}
                dataSource={paymentData}
                loading={loading}
                locale={{
                    emptyText: <Empty description="Select a date range to view payment summary" />
                }}
                pagination={false}
                scroll={{ x: 'max-content' }}
                summary={() => paymentData.length > 0 ? (
                    <Table.Summary fixed>
                        <Table.Summary.Row style={{ backgroundColor: '#fafafa' }}>
                            <Table.Summary.Cell index={0} colSpan={2}>
                                <Text strong>TOTAL ({paymentData.length} labourers)</Text>
                            </Table.Summary.Cell>
                            <Table.Summary.Cell index={2}>
                                <Text strong>{totals.effectiveDays} days</Text>
                            </Table.Summary.Cell>
                            <Table.Summary.Cell index={3}>
                                <Text strong style={{ color: '#ff4d4f' }}>{totals.daysAbsent} days</Text>
                            </Table.Summary.Cell>
                            <Table.Summary.Cell index={4}>
                                <Text strong style={{ color: '#1890ff', fontSize: '14px' }}>
                                    ₹{totals.netPayable.toLocaleString('en-IN')}
                                </Text>
                            </Table.Summary.Cell>
                            <Table.Summary.Cell index={5}>
                                {/* Empty cell for actions column */}
                            </Table.Summary.Cell>
                        </Table.Summary.Row>
                    </Table.Summary>
                ) : null}
            />
            <Modal
                title={`Record Payment for ${selectedLabourRecord?.name}`}
                open={paymentModalOpen}
                onCancel={() => {
                    setPaymentModalOpen(false);
                    setSelectedLabourRecord(null);
                    paymentForm.resetFields();
                }}
                onOk={handleRecordPayment}
                confirmLoading={submittingPayment}
                destroyOnClose
            >
                <div style={{ marginBottom: 16 }}>
                    <Text type="secondary">This will record a payment of ₹{selectedLabourRecord?.netPayable?.toLocaleString('en-IN')} as an Expense for {selectedLabourRecord?.name}.</Text>
                </div>
                <Form form={paymentForm} layout="vertical">
                    <Form.Item name="amount" label="Amount (₹)" rules={[{ required: true, message: 'Please enter amount' }]}>
                        <InputNumber style={{ width: '100%' }} min={0.01} precision={2} />
                    </Form.Item>
                    <Form.Item name="date" label="Payment Date" rules={[{ required: true }]}>
                        <DatePicker style={{ width: '100%' }} />
                    </Form.Item>
                    <Form.Item name="paymentMode" label="Payment Mode" rules={[{ required: true }]}>
                        <Select options={[
                            { value: 'Cash', label: 'Cash' },
                            { value: 'Bank Transfer', label: 'Bank Transfer' },
                            { value: 'Cheque', label: 'Cheque' },
                            { value: 'UPI', label: 'UPI' },
                            { value: 'Card', label: 'Card' },
                        ]} />
                    </Form.Item>
                    <Form.Item name="project" label="Project (Optional)">
                        <Select placeholder="Associate with Project" allowClear>
                            {projects.map(p => <Select.Option key={p._id} value={p._id}>{p.name}</Select.Option>)}
                        </Select>
                    </Form.Item>
                    <Form.Item name="villa" label="Villa (Optional)">
                        <Select placeholder="Associate with Villa" allowClear>
                            {villas.map(v => <Select.Option key={v._id} value={v._id}>Villa {v.villaNumber}</Select.Option>)}
                        </Select>
                    </Form.Item>
                    <Form.Item name="description" label="Description">
                        <Input.TextArea rows={3} />
                    </Form.Item>
                </Form>
            </Modal>
            <Modal
                title={`Record Bulk Payment (${selectedRowKeys.length} Labourers)`}
                open={bulkModalOpen}
                onCancel={() => {
                    setBulkModalOpen(false);
                    bulkForm.resetFields();
                }}
                onOk={handleRecordBulkPayment}
                confirmLoading={submittingBulk}
                destroyOnClose
            >
                <div style={{ marginBottom: 16 }}>
                    <Text type="secondary">This will record individual payments for <strong>{selectedRowKeys.length} selected labourers</strong>, totalling <strong>₹{totalSelectedAmount.toLocaleString('en-IN')}</strong>, as separate Expenses.</Text>
                </div>
                <Form form={bulkForm} layout="vertical">
                    <Form.Item name="date" label="Payment Date" rules={[{ required: true }]}>
                        <DatePicker style={{ width: '100%' }} />
                    </Form.Item>
                    <Form.Item name="paymentMode" label="Payment Mode" rules={[{ required: true }]}>
                        <Select options={[
                            { value: 'Cash', label: 'Cash' },
                            { value: 'Bank Transfer', label: 'Bank Transfer' },
                            { value: 'Cheque', label: 'Cheque' },
                            { value: 'UPI', label: 'UPI' },
                            { value: 'Card', label: 'Card' },
                        ]} />
                    </Form.Item>
                    <Form.Item name="project" label="Project (Optional)">
                        <Select placeholder="Associate with Project" allowClear>
                            {projects.map(p => <Select.Option key={p._id} value={p._id}>{p.name}</Select.Option>)}
                        </Select>
                    </Form.Item>
                    <Form.Item name="villa" label="Villa (Optional)">
                        <Select placeholder="Associate with Villa" allowClear>
                            {villas.map(v => <Select.Option key={v._id} value={v._id}>Villa {v.villaNumber}</Select.Option>)}
                        </Select>
                    </Form.Item>
                    <Form.Item name="description" label="Base Description">
                        <Input.TextArea rows={3} />
                    </Form.Item>
                </Form>
            </Modal>
            <Modal
                title={`Labour Payment Details - ${selectedDetailsRecord?.name}`}
                open={detailsModalOpen}
                onCancel={() => {
                    setDetailsModalOpen(false);
                    setSelectedDetailsRecord(null);
                }}
                footer={[
                    <Button 
                        key="close" 
                        onClick={() => {
                            setDetailsModalOpen(false);
                            setSelectedDetailsRecord(null);
                        }}
                    >
                        Close
                    </Button>
                ]}
                width={500}
                destroyOnClose
            >
                {selectedDetailsRecord && (
                    <Descriptions column={1} bordered size="small">
                        <Descriptions.Item label="Labour Name">
                            <strong>{selectedDetailsRecord.name}</strong>
                        </Descriptions.Item>
                        <Descriptions.Item label="Skill / Work Type">
                            {selectedDetailsRecord.skill}
                        </Descriptions.Item>
                        <Descriptions.Item label="Employment Type">
                            {empTypeLabels[selectedDetailsRecord.employmentType]}
                        </Descriptions.Item>
                        <Descriptions.Item label="Base Wage Rate">
                            {selectedDetailsRecord.employmentType === 'daily' 
                                ? `₹${selectedDetailsRecord.dailyWage.toLocaleString('en-IN')}/day` 
                                : `₹${selectedDetailsRecord.monthlySalary.toLocaleString('en-IN')}/month`}
                        </Descriptions.Item>
                        <Descriptions.Item label="Present Days">
                            {selectedDetailsRecord.daysPresent} days
                        </Descriptions.Item>
                        <Descriptions.Item label="Half Days">
                            {selectedDetailsRecord.halfDays} days
                        </Descriptions.Item>
                        <Descriptions.Item label="Effective Days Worked">
                            <strong>{selectedDetailsRecord.effectiveDays} days</strong>
                        </Descriptions.Item>
                        <Descriptions.Item label="OT Hours">
                            {selectedDetailsRecord.otHours} hours
                        </Descriptions.Item>
                        <Descriptions.Item label="Gross Wage">
                            ₹{selectedDetailsRecord.totalWage.toLocaleString('en-IN')}
                        </Descriptions.Item>
                        <Descriptions.Item label="Advance Deductions">
                            <span style={{ color: selectedDetailsRecord.totalDeductions > 0 ? '#ff4d4f' : 'inherit' }}>
                                -₹{selectedDetailsRecord.totalDeductions.toLocaleString('en-IN')}
                            </span>
                        </Descriptions.Item>
                        <Descriptions.Item label="Penalties">
                            <span style={{ color: selectedDetailsRecord.totalPenalty > 0 ? '#ff4d4f' : 'inherit' }}>
                                -₹{selectedDetailsRecord.totalPenalty.toLocaleString('en-IN')}
                            </span>
                        </Descriptions.Item>
                        <Descriptions.Item label="Net Payable">
                            <strong style={{ color: selectedDetailsRecord.netPayable >= 0 ? '#1890ff' : '#ff4d4f', fontSize: '16px' }}>
                                ₹{selectedDetailsRecord.netPayable.toLocaleString('en-IN')}
                            </strong>
                        </Descriptions.Item>
                    </Descriptions>
                )}
            </Modal>
        </Space>
    );
};

export default AttendanceReview;
