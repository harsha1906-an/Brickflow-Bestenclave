import React, { useEffect, useState } from 'react';
import { Table, Button, Modal, Tag, Form, Input, InputNumber, App, Card, Row, Col, Statistic, DatePicker } from 'antd';
import { PlusOutlined, MinusOutlined, WalletOutlined, PrinterOutlined, DownloadOutlined } from '@ant-design/icons';
import useLanguage from '@/locale/useLanguage';
import { useUserRole } from '@/hooks/useUserRole';
import { request } from '@/request';
import { useMoney } from '@/settings';
import dayjs from 'dayjs';
import storePersist from '@/redux/storePersist';
import { useAppContext } from '@/context/appContext';
import numberToWords from '@/utils/numberToWords';

const PettyCashList = () => {
    const { message } = App.useApp();
    const { moneyFormatter, inputFormatter, inputParser } = useMoney();
    const [data, setData] = useState([]);
    const [loading, setLoading] = useState(false);
    const [summary, setSummary] = useState({ totalInward: 0, totalOutward: 0, balance: 0 });
    const [modalOpen, setModalOpen] = useState(false);
    const [modalType, setModalType] = useState('outward'); // 'inward' or 'outward'
    const [form] = Form.useForm();
    const translate = useLanguage();
    const { role } = useUserRole();

    const [reportRange, setReportRange] = useState([dayjs(), dayjs()]);
    const [reportDate, setReportDate] = useState(dayjs());

    const { state } = useAppContext();
    const companyId = state.currentCompany;

    const fetchData = async () => {
        setLoading(true);
        try {
            const [listRes, summaryRes] = await Promise.all([
                request.list({ entity: 'pettycashtransaction' }),
                request.summary({ entity: 'pettycashtransaction' })
            ]);
            setData(listRes.result);
            setSummary(summaryRes.result);
        } catch (e) {
            console.error(e);
            message.error('Failed to load petty cash data');
        }
        setLoading(false);
    };

    const handleDownloadDailyReport = async () => {
        if (!reportDate) {
            message.warning('Please select a date for the report');
            return;
        }
        const dateStr = reportDate.format('YYYY-MM-DD');
        await downloadReport(`date=${dateStr}`, `PettyCashBook_${dateStr}.pdf`);
    };

    const handleDownloadRangeReport = async () => {
        if (!reportRange || reportRange.length !== 2) {
            message.warning('Please select a date range for the report');
            return;
        }
        const startDate = reportRange[0].format('YYYY-MM-DD');
        const endDate = reportRange[1].format('YYYY-MM-DD');
        await downloadReport(`startDate=${startDate}&endDate=${endDate}`, `PettyCashBook_${startDate}_to_${endDate}.pdf`);
    };

    const downloadReport = async (queryParams, filename) => {
        if (!companyId) {
            message.error('Company ID missing');
            return;
        }
        try {
            message.loading({ content: 'Generating report...', key: 'reporting' });

            const auth = storePersist.get('auth');
            const token = auth?.current?.token;
            const baseUrl = import.meta.env.VITE_BACKEND_SERVER.endsWith('/')
                ? import.meta.env.VITE_BACKEND_SERVER
                : import.meta.env.VITE_BACKEND_SERVER + '/';

            const apiUrl = `${baseUrl}api/pettycashtransaction/report?${queryParams}`;

            const downloadRes = await fetch(apiUrl, {
                headers: {
                    'Authorization': token ? `Bearer ${token}` : '',
                }
            });

            if (!downloadRes.ok) throw new Error('Failed to generate report');

            const contentType = downloadRes.headers.get('content-type');
            if (contentType && contentType.indexOf('application/pdf') === -1) {
                const text = await downloadRes.text();
                const json = JSON.parse(text);
                throw new Error(json.message || 'Server error');
            }

            const blob = await downloadRes.blob();
            const downloadUrl = window.URL.createObjectURL(blob);
            window.open(downloadUrl, '_blank');

            message.success({ content: 'Report generated successfully', key: 'reporting' });
        } catch (error) {
            message.error({ content: error.message || 'Failed to download report', key: 'reporting' });
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    const openModal = (type) => {
        setModalType(type);
        setModalOpen(true);
    };

    useEffect(() => {
        if (modalOpen) {
            form.resetFields();
            form.setFieldsValue({ date: dayjs() });
        }
    }, [modalOpen]);

    const handleOk = async () => {
        try {
            const values = await form.validateFields();
            values.type = modalType;
            // Convert dayjs to JS Date for backend
            if (values.date) values.date = values.date.toDate();

            await request.post({ entity: 'pettycashtransaction/create', jsonData: values });
            message.success(modalType === 'inward' ? 'Cash added successfully' : 'Expense recorded successfully');
            setModalOpen(false);
            fetchData();
        } catch (e) {
            if (e.errorFields) return;
            message.error(e.response?.data?.message || 'Failed to save transaction');
        }
    };

    const handleDownloadVoucher = async (transactionId) => {
        if (!transactionId) return;
        try {
            message.loading({ content: 'Generating Voucher...', key: 'voucher_download' });
            
            const auth = storePersist.get('auth');
            const token = auth?.current?.token;
            
            const baseUrl = import.meta.env.VITE_BACKEND_SERVER.endsWith('/')
                ? import.meta.env.VITE_BACKEND_SERVER
                : import.meta.env.VITE_BACKEND_SERVER + '/';
            const downloadUrl = `${baseUrl}download/pettycashtransaction/pettycashtransaction-${transactionId}.pdf`;
            
            const response = await fetch(downloadUrl, {
                headers: {
                    'Authorization': token ? `Bearer ${token}` : '',
                    'ngrok-skip-browser-warning': 'true',
                },
            });
            
            if (!response.ok) {
                throw new Error('Failed to download voucher');
            }
            
            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            window.open(url, '_blank');
            
            message.success({ content: 'Voucher Opened', key: 'voucher_download' });
        } catch (error) {
            console.error('Voucher download error:', error);
            message.error({ content: 'Failed to download voucher.', key: 'voucher_download' });
        }
    };

    const columns = [
        { title: 'Date', dataIndex: 'date', key: 'date', render: (date) => dayjs(date).format('DD/MM/YYYY') },
        { title: 'Description', dataIndex: 'name', key: 'name' },
        {
            title: 'Type',
            dataIndex: 'type',
            key: 'type',
            render: (type) => type === 'inward' ? <Tag color="green">Top-up</Tag> : <Tag color="red">Expense</Tag>
        },
        {
            title: 'Amount',
            dataIndex: 'amount',
            key: 'amount',
            render: (amount, record) => (
                <span style={{ color: record.type === 'inward' ? 'green' : 'red', fontWeight: 'bold' }}>
                    {record.type === 'inward' ? '+' : '-'}{moneyFormatter({ amount })}
                </span>
            )
        },
        { title: 'Receipt #', dataIndex: 'receiptNumber', key: 'receiptNumber' },
        { title: 'Notes', dataIndex: 'note', key: 'note' },
        {
            title: 'Action',
            key: 'action',
            render: (_, record) => (
                <Button 
                    type="link" 
                    icon={<DownloadOutlined />} 
                    onClick={() => handleDownloadVoucher(record._id)}
                >
                    Voucher
                </Button>
            )
        }
    ];

    return (
        <div style={{ padding: '20px' }}>
            <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
                <Col xs={24} sm={8}>
                    <Card bordered={false} className="summary-card">
                        <Statistic title="Total Cash Received" value={summary.totalInward} precision={2} prefix={<WalletOutlined />} valueStyle={{ color: '#3f8600' }} />
                        {summary.totalInward > 0 && (
                            <div style={{ fontSize: '11px', color: '#888', fontStyle: 'italic', marginTop: '4px' }}>
                                {numberToWords(summary.totalInward)}
                            </div>
                        )}
                    </Card>
                </Col>
                <Col xs={24} sm={8}>
                    <Card bordered={false} className="summary-card">
                        <Statistic title="Total Expenses" value={summary.totalOutward} precision={2} prefix={<MinusOutlined />} valueStyle={{ color: '#cf1322' }} />
                        {summary.totalOutward > 0 && (
                            <div style={{ fontSize: '11px', color: '#888', fontStyle: 'italic', marginTop: '4px' }}>
                                {numberToWords(summary.totalOutward)}
                            </div>
                        )}
                    </Card>
                </Col>
                <Col xs={24} sm={8}>
                    <Card bordered={false} className="summary-card">
                        <Statistic title="Current Balance" value={summary.balance} precision={2} prefix={<WalletOutlined />} valueStyle={{ color: summary.balance < 0 ? '#cf1322' : '#1890ff' }} />
                        {summary.balance !== 0 && (
                            <div style={{ fontSize: '11px', color: '#888', fontStyle: 'italic', marginTop: '4px' }}>
                                {summary.balance < 0 ? `Minus ${numberToWords(Math.abs(summary.balance))}` : numberToWords(summary.balance)}
                            </div>
                        )}
                    </Card>
                </Col>
            </Row>

            <div style={{ marginBottom: 16 }}>
                <Row gutter={[16, 16]} align="middle" justify="space-between">
                    <Col xs={24} md={6}>
                        <h2 style={{ margin: 0 }}>Petty Cash Ledger</h2>
                    </Col>
                    <Col xs={24} md={18}>
                        <Row gutter={[16, 16]} justify="end" align="middle">
                            <Col xs={24} sm={10}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                                    <span style={{ fontSize: '12px', color: '#666' }}>Date:</span>
                                    <DatePicker
                                        value={reportDate}
                                        onChange={setReportDate}
                                        format="DD/MM/YYYY"
                                        allowClear={false}
                                        style={{ flex: 1 }}
                                    />
                                    <Button
                                        icon={<PrinterOutlined />}
                                        onClick={handleDownloadDailyReport}
                                        title="Download Petty Cash Book (Daily)"
                                    />
                                </div>
                            </Col>
                            <Col xs={24} sm={14}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                                    <span style={{ fontSize: '12px', color: '#666' }}>Range:</span>
                                    <DatePicker.RangePicker
                                        value={reportRange}
                                        onChange={setReportRange}
                                        format="DD/MM/YYYY"
                                        allowClear={false}
                                        style={{ flex: 1 }}
                                    />
                                    <Button
                                        icon={<PrinterOutlined />}
                                        onClick={handleDownloadRangeReport}
                                        title="Download Petty Cash Book"
                                    />
                                </div>
                            </Col>
                            <Col xs={12} sm={4}>
                                {role === 'OWNER' && (
                                    <Button type="primary" icon={<PlusOutlined />} onClick={() => openModal('inward')} style={{ backgroundColor: '#52c41a', borderColor: '#52c41a', width: '100%' }}>
                                        Add
                                    </Button>
                                )}
                            </Col>
                            <Col xs={12} sm={4}>
                                {(role === 'OWNER' || role === 'ENGINEER') && (
                                    <Button type="primary" danger icon={<MinusOutlined />} onClick={() => openModal('outward')} style={{ width: '100%' }}>
                                        Log
                                    </Button>
                                )}
                            </Col>
                        </Row>
                    </Col>
                </Row>
            </div>

            <Table
                rowKey="_id"
                columns={columns}
                dataSource={data}
                loading={loading}
                pagination={{ pageSize: 10 }}
                scroll={{ x: 700 }}
                style={{ borderRadius: '8px', overflow: 'hidden' }}
            />

            <Modal
                title={modalType === 'inward' ? 'Add Petty Cash (Top-up)' : 'Record New Expense'}
                open={modalOpen}
                onCancel={() => setModalOpen(false)}
                onOk={handleOk}
                destroyOnClose
                okText="Confirm"
            >
                <Form form={form} layout="vertical">
                    <Form.Item name="name" label={modalType === 'inward' ? 'Reference / Title' : 'Expense Description'} rules={[{ required: true, message: 'Please enter a name' }]}>
                        <Input placeholder={modalType === 'inward' ? 'e.g. Weekly Cash for Site' : 'e.g. Material Purchase'} />
                    </Form.Item>
                    <Form.Item
                        noStyle
                        shouldUpdate={(prev, curr) => prev.amount !== curr.amount}
                    >
                        {({ getFieldValue }) => {
                            const amountWatch = getFieldValue('amount') || 0;
                            return (
                                <Form.Item
                                    name="amount"
                                    label="Amount"
                                    rules={[{ required: true, message: 'Please enter amount' }]}
                                    extra={amountWatch > 0 ? <div style={{ fontSize: '12px', fontStyle: 'italic', color: '#888', marginTop: '5px' }}>{numberToWords(amountWatch)}</div> : null}
                                >
                                    <InputNumber
                                        style={{ width: '100%' }}
                                        min={1}
                                        placeholder="0.00"
                                        formatter={inputFormatter}
                                        parser={inputParser}
                                    />
                                </Form.Item>
                            );
                        }}
                    </Form.Item>
                    <Form.Item name="date" label="Date" rules={[{ required: true }]}>
                        <DatePicker style={{ width: '100%' }} format="DD/MM/YYYY" />
                    </Form.Item>
                    <Form.Item name="receiptNumber" label="Receipt / Voucher Number">
                        <Input placeholder="Optional" />
                    </Form.Item>
                    <Form.Item name="note" label="Additional Notes">
                        <Input.TextArea placeholder="Describe the transaction detail..." />
                    </Form.Item>
                </Form>
            </Modal>
        </div>
    );
};

export default PettyCashList;
