import React, { useEffect, useState } from 'react';
import { Card, DatePicker, Row, Col, Statistic, Spin, message, Button, Space, Table, Tag, Divider, Modal, Progress, Form, Input, Select, InputNumber } from 'antd';
import { ArrowLeftOutlined, ReloadOutlined, WalletOutlined, BuildOutlined, UserOutlined, DownloadOutlined, EuroOutlined, DollarOutlined, PrinterOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import { request } from '@/request';
import { useAppContext } from '@/context/appContext';
import { useMoney } from '@/settings';

const DailyReport = () => {
    const [messageApi, contextHolder] = message.useMessage();
    const [date, setDate] = useState(dayjs());
    const [reportRange, setReportRange] = useState([dayjs(), dayjs()]);
    const [loading, setLoading] = useState(false);
    const [summary, setSummary] = useState(null);
    const { moneyFormatter, currency_symbol } = useMoney();
    const { state } = useAppContext();
    const companyId = state.currentCompany;

    useEffect(() => {
        fetchSummary();
    }, [date]);

    const fetchSummary = async () => {
        if (!companyId) return;
        setLoading(true);
        try {
            const dateStr = date.format('YYYY-MM-DD');
            const data = await request.get({ entity: `companies/${companyId}/daily-summary?date=${dateStr}` });
            setSummary(data);
        } catch (e) {
            messageApi.error('Failed to load daily summary');
        }
        setLoading(false);
    };

    const [downloading, setDownloading] = useState(false);
    const [progress, setProgress] = useState(0);

    const handleDownloadDaily = async () => {
        setDownloading(true);
        setProgress(0);

        // Fake progress up to 99%
        const timer = setInterval(() => {
            setProgress((prev) => {
                if (prev >= 99) {
                    clearInterval(timer);
                    return 99;
                }
                const increment = prev < 60 ? 10 : prev < 90 ? 5 : 1;
                return prev + increment;
            });
        }, 100);

        try {
            const dateStr = date.format('YYYY-MM-DD');

            // Use the single date endpoint
            const response = await request.pdf({
                entity: `companies/${companyId}/daily-report-pdf?date=${dateStr}`,
            });

            // Download complete
            clearInterval(timer);
            setProgress(100);

            // Handle direct blob response headers
            const blob = new Blob([response.data], { type: 'application/pdf' });
            const url = window.URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', `DailyReport_${dateStr}.pdf`);
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            window.URL.revokeObjectURL(url);

            // Close modal after short delay
            setTimeout(() => {
                setDownloading(false);
                setProgress(0);
            }, 1000);

        } catch (error) {
            console.error('Download failed:', error);
            clearInterval(timer);
            setDownloading(false);
            messageApi.error('Failed to download PDF report');
        }
    };

    const handleDownloadRange = async () => {
        if (!reportRange || reportRange.length !== 2) {
            messageApi.warning('Please select a date range');
            return;
        }

        setDownloading(true);
        setProgress(0);

        // Fake progress up to 99%
        const timer = setInterval(() => {
            setProgress((prev) => {
                if (prev >= 99) {
                    clearInterval(timer);
                    return 99;
                }
                const increment = prev < 60 ? 10 : prev < 90 ? 5 : 1;
                return prev + increment;
            });
        }, 100);

        try {
            const startDate = reportRange[0].format('YYYY-MM-DD');
            const endDate = reportRange[1].format('YYYY-MM-DD');

            // Use the date range endpoint
            const response = await request.pdf({
                entity: `companies/${companyId}/daily-report-pdf?startDate=${startDate}&endDate=${endDate}`,
            });

            // Download complete
            clearInterval(timer);
            setProgress(100);

            // Handle direct blob response headers
            const blob = new Blob([response.data], { type: 'application/pdf' });
            const url = window.URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', `DailyReport_${startDate}_to_${endDate}.pdf`);
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            window.URL.revokeObjectURL(url);

            // Close modal after short delay
            setTimeout(() => {
                setDownloading(false);
                setProgress(0);
            }, 1000);

        } catch (error) {
            console.error('Download failed:', error);
            clearInterval(timer);
            setDownloading(false);
            messageApi.error('Failed to download PDF report');
        }
    };

    // Expense Modal Logic
    const [expenseModalOpen, setExpenseModalOpen] = useState(false);
    const [expenseForm] = Form.useForm();
    const handleAddExpense = () => {
        setExpenseModalOpen(true);
        expenseForm.resetFields();
        expenseForm.setFieldsValue({
            date: date,
            paymentMode: 'Cash'
        });
    };

    const handleExpenseSubmit = async () => {
        try {
            const values = await expenseForm.validateFields();
            const payload = {
                ...values,
                recipientType: 'Other', // General Expense
                date: values.date.format('YYYY-MM-DD'),
                companyId,
            };

            await request.create({ entity: 'expense', jsonData: payload });
            messageApi.success('Expense added successfully');
            setExpenseModalOpen(false);
            fetchSummary(); // Refresh report
        } catch (e) {
            console.error(e);
            messageApi.error('Failed to add expense');
        }
    };

    return (
        <Card>
            {contextHolder}
            <Space direction="vertical" size="large" style={{ width: '100%' }}>
                <div style={{ marginBottom: 16 }}>
                    <Row gutter={[16, 16]} align="middle" justify="space-between">
                        <Col xs={24} md={6}>
                            <h2 style={{ margin: 0 }}>Daily Summary</h2>
                        </Col>
                        <Col xs={24} md={18}>
                            <Row gutter={[8, 8]} justify="end" align="middle">
                                <Col xs={24} sm={6}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                        <DatePicker value={date} onChange={setDate} allowClear={false} style={{ width: '100%' }} />
                                        <Button icon={<ReloadOutlined />} onClick={fetchSummary} loading={loading} />
                                    </div>
                                </Col>
                                <Col xs={12} sm={6}>
                                    <Button type="primary" onClick={handleAddExpense} style={{ width: '100%' }}>Add Expense</Button>
                                </Col>
                                <Col xs={12} sm={2}>
                                    <Button icon={<PrinterOutlined />} onClick={handleDownloadDaily} disabled={!summary} title="Download Daily Report" style={{ width: '100%' }} />
                                </Col>
                                <Col xs={24} sm={10}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                        <DatePicker.RangePicker
                                            value={reportRange}
                                            onChange={setReportRange}
                                            format="DD/MM/YYYY"
                                            allowClear={false}
                                            style={{ flex: 1 }}
                                        />
                                        <Button icon={<DownloadOutlined />} onClick={handleDownloadRange}>PDF</Button>
                                    </div>
                                </Col>
                            </Row>
                        </Col>
                    </Row>
                </div>

                {loading ? (
                    <div style={{ textAlign: 'center', padding: '50px' }}><Spin size="large" /></div>
                ) : summary ? (
                    <>
                        <Row gutter={[16, 16]}>
                            <Col xs={24} sm={8}>
                                <Card bordered={true}>
                                    <Statistic
                                        title="Labour Wages (Net)"
                                        value={summary.labour.netWage}
                                        precision={2}
                                        prefix={<UserOutlined />}
                                        suffix={currency_symbol}
                                    />
                                    <div style={{ fontSize: '12px', color: '#888', marginTop: 8 }}>
                                        {summary.labour.count} Workers Marked
                                    </div>
                                </Card>
                            </Col>
                            <Col xs={24} sm={8}>
                                <Card bordered={true}>
                                    <Statistic
                                        title="Petty Cash Expenses"
                                        value={summary.pettyCash?.expense || 0}
                                        precision={2}
                                        prefix={<EuroOutlined />}
                                        suffix={currency_symbol}
                                    />
                                    <div style={{ fontSize: '12px', color: '#888', marginTop: 8 }}>
                                        {summary.pettyCash?.count || 0} Transactions
                                    </div>
                                </Card>
                            </Col>
                            <Col xs={24} sm={8}>
                                <Card bordered={true}>
                                    <Statistic
                                        title="Customer Collections"
                                        value={summary.customerCollections}
                                        precision={2}
                                        prefix={<BuildOutlined />}
                                        suffix={currency_symbol}
                                        valueStyle={{ color: '#3f8600' }}
                                    />
                                </Card>
                            </Col>
                        </Row>

                        <Card title="Detailed Breakdown" size="small">
                            <Row gutter={[16, 32]}>
                                <Col xs={24} md={12}>
                                    <h4>Labour Adjustments</h4>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                                        <span>Total Advances Deducted:</span>
                                        <b style={{ color: 'red' }}>-{moneyFormatter({ amount: summary.labour.advances })}</b>
                                    </div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                        <span>Total Penalties Deducted:</span>
                                        <b style={{ color: 'red' }}>-{moneyFormatter({ amount: summary.labour.penalties })}</b>
                                    </div>
                                </Col>
                                <Col xs={24} md={12}>
                                    <h4>Expense Breakdown</h4>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                                        <span>Supplier Payments:</span>
                                        <b style={{ color: 'red' }}>-{moneyFormatter({ amount: summary.expenses?.supplier || 0 })}</b>
                                    </div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                                        <span>Labour Contracts:</span>
                                        <b style={{ color: 'red' }}>-{moneyFormatter({ amount: summary.expenses?.labourContract || 0 })}</b>
                                    </div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                                        <span>Other Expenses:</span>
                                        <b style={{ color: 'red' }}>-{moneyFormatter({ amount: summary.expenses?.other || 0 })}</b>
                                    </div>
                                    <Divider style={{ margin: '8px 0' }} />
                                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                        <span>Total (Non-Wage):</span>
                                        <b style={{ color: 'red' }}>-{moneyFormatter({ amount: summary.expenses?.amount || 0 })}</b>
                                    </div>
                                </Col>
                                <Col xs={24} md={12}>
                                    <h4>Inventory Activity</h4>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                                        <span>Materials Received (In):</span>
                                        <Tag color="green">{summary.inventory.inward} Items</Tag>
                                    </div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                        <span>Materials Issued (Out):</span>
                                        <Tag color="orange">{summary.inventory.outward} Items</Tag>
                                    </div>
                                </Col>
                            </Row>
                        </Card>
                    </>
                ) : null}
            </Space>

            {/* Add Expense Modal */}
            <Modal
                title="Add General Expense"
                open={expenseModalOpen}
                onOk={handleExpenseSubmit}
                onCancel={() => setExpenseModalOpen(false)}
            >
                <Form form={expenseForm} layout="vertical">
                    <Form.Item name="date" label="Date" rules={[{ required: true }]}>
                        <DatePicker style={{ width: '100%' }} />
                    </Form.Item>
                    <Form.Item name="otherRecipient" label="Payee Name (e.g. JCB Service)" rules={[{ required: true, message: 'Please enter payee name' }]}>
                        <Input placeholder="Enter name of person/service" />
                    </Form.Item>
                    <Form.Item name="amount" label="Amount" rules={[{ required: true }]}>
                        <InputNumber style={{ width: '100%' }} min={0} />
                    </Form.Item>
                    <Form.Item name="description" label="Description">
                        <Input.TextArea rows={2} />
                    </Form.Item>
                    <Row gutter={16}>
                        <Col span={12}>
                            <Form.Item name="reference" label="Ref Number">
                                <Input placeholder="Invoice/Bill No" />
                            </Form.Item>
                        </Col>
                        <Col span={12}>
                            <Form.Item name="transactionCode" label="Transaction No">
                                <Input placeholder="UPI/Cheque No" />
                            </Form.Item>
                        </Col>
                    </Row>
                    <Form.Item name="paymentMode" label="Payment Mode" rules={[{ required: true }]}>
                        <Select options={[
                            { value: 'Cash', label: 'Cash' },
                            { value: 'Bank Transfer', label: 'Bank Transfer' },
                            { value: 'UPI', label: 'UPI' },
                            { value: 'Cheque', label: 'Cheque' },
                            { value: 'Card', label: 'Card' },
                        ]} />
                    </Form.Item>
                </Form>
            </Modal>

            {/* Download Modal */}
            <Modal
                title="Generating Report"
                open={downloading}
                footer={null}
                closable={false}
                centered
            >
                <div style={{ textAlign: 'center', padding: '20px' }}>
                    <p>Please wait while we generate your PDF report...</p>
                    <Progress type="circle" percent={progress} status={progress === 100 ? "success" : "active"} />
                    <div style={{ marginTop: 10 }}>{progress === 100 ? "Download Complete!" : "Processing..."}</div>
                </div>
            </Modal>
        </Card>
    );
};

export default DailyReport;
