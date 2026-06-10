import React, { useEffect, useState } from 'react';
import { Card, Descriptions, Table, Tag, Button, Row, Col, App, Statistic, Divider, Modal, Form, DatePicker, InputNumber, Select, Input, Tabs, Checkbox } from 'antd';
import { useParams, useNavigate } from 'react-router-dom';
import { FilePdfOutlined } from '@ant-design/icons';
import axios from 'axios';
import useLanguage from '@/locale/useLanguage';
import { DOWNLOAD_BASE_URL, API_BASE_URL } from '@/config/serverApiConfig';
import { request } from '@/request';
import storePersist from '@/redux/storePersist';
import { useMoney, useDate } from '@/settings';
import dayjs from 'dayjs';
import { PageHeader } from '@ant-design/pro-layout';

export default function BookingRead() {
    const { message } = App.useApp();
    const { id } = useParams();
    const navigate = useNavigate();
    const translate = useLanguage();
    const { moneyFormatter } = useMoney();
    const { dateFormat } = useDate();
    const [booking, setBooking] = useState(null);
    const [loading, setLoading] = useState(true);

    // --- Payment Modal State ---
    const [paymentModal, setPaymentModal] = useState({ open: false, milestone: null });
    const [isPartialPayment, setIsPartialPayment] = useState(false);
    const [form] = Form.useForm(); // Needed for PaymentModal



    const [payments, setPayments] = useState([]);

    const fetchBooking = async () => {
        setLoading(true);
        const response = await request.read({ entity: 'booking', id });
        if (response.success) {
            setBooking(response.result);
            // Fetch payments
            const paymentResponse = await request.list({ entity: 'payment', options: { booking: id } });
            if (paymentResponse.success) {
                setPayments(paymentResponse.result);
            }
        } else {
            message.error('Failed to load booking');
            navigate('/booking');
        }
        setLoading(false);
    };

    useEffect(() => {
        fetchBooking();
    }, [id]);

    if (!booking) return <></>;

    const handlePay = (milestone) => {
        setIsPartialPayment(false);
        setPaymentModal({ open: true, milestone });
    };

    const handlePaymentSubmit = async () => {
        try {
            const values = await form.validateFields();
            setLoading(true);

            const basePayload = {
                booking: id,
                client: booking.client._id,
                villa: booking.villa._id,
                villaId: booking.villa._id,
                number: Math.floor(Math.random() * 1000000),
                buildingStage: paymentModal.milestone?.name,
                milestoneId: paymentModal.milestone?._id,
                date: values.date,
                description: values.description,
            };

            let successCount = 0;
            let totalToSubmit = 0;

            if (values.whiteAmount > 0) {
                totalToSubmit++;
                const payloadWhite = {
                    ...basePayload,
                    amount: values.whiteAmount,
                    paymentMode: values.whitePaymentMode,
                    ref: values.whiteRef,
                    ledger: 'official'
                };
                const res = await request.create({ entity: 'payment', jsonData: payloadWhite });
                if (res.success) successCount++;
            }

            if (values.blackAmount > 0) {
                totalToSubmit++;
                const payloadBlack = {
                    ...basePayload,
                    amount: values.blackAmount,
                    paymentMode: values.blackPaymentMode,
                    ref: values.blackRef,
                    ledger: 'internal'
                };
                // Ensure a unique number for the second payment
                payloadBlack.number = Math.floor(Math.random() * 1000000);
                const res = await request.create({ entity: 'payment', jsonData: payloadBlack });
                if (res.success) successCount++;
            }

            if (successCount > 0) {
                message.success(`${successCount} payment(s) recorded successfully`);
                // Close modal FIRST, then refresh data
                setPaymentModal({ open: false, milestone: null });
                setIsPartialPayment(false);
                form.resetFields();
                await fetchBooking(); // Wait for fresh data before allowing any further actions
            } else if (totalToSubmit === 0) {
                message.warning('Please enter an amount to pay');
            } else {
                message.error('Failed to record payments');
            }
        } catch (e) {
            console.error(e);
            message.error('Please check the form fields');
        } finally {
            setLoading(false);
        }
    };

    // Helper: get payments matching a specific milestone by ID (not name)
    const getPaymentsForMilestone = (milestone) => {
        return payments.filter(p => {
            if (p.milestoneId && milestone._id) {
                return String(p.milestoneId) === String(milestone._id);
            }
            // Fallback for old payments without milestoneId
            return p.buildingStage === milestone.name;
        });
    };

    useEffect(() => {
        if (paymentModal.open && paymentModal.milestone) {
            const ms = paymentModal.milestone;
            const msPayments = getPaymentsForMilestone(ms);
            const paidWhite = msPayments.filter(p => p.ledger === 'official').reduce((sum, p) => sum + (p.amount || 0), 0);
            const paidBlack = msPayments.filter(p => p.ledger === 'internal').reduce((sum, p) => sum + (p.amount || 0), 0);
            const pendingWhite = Math.max(0, (ms.accountableAmount || 0) - paidWhite);
            const pendingBlack = Math.max(0, (ms.nonAccountableAmount || 0) - paidBlack);

            form.setFieldsValue({
                date: dayjs(),
                whiteAmount: pendingWhite,
                blackAmount: pendingBlack,
                whitePaymentMode: 'Bank Transfer',
                blackPaymentMode: 'Cash',
                whiteRef: '',
                blackRef: '',
                description: ''
            });
        } else {
            form.resetFields();
        }
    }, [paymentModal.open, paymentModal.milestone]);


    const paymentPlanColumns = [
        { title: translate('Milestone'), dataIndex: 'name', key: 'name' },
        { title: translate('Due Date'), dataIndex: 'dueDate', key: 'dueDate', render: (d) => d ? dayjs(d).format(dateFormat) : '-' },
        { title: translate('Amount'), dataIndex: 'amount', key: 'amount', render: (amount) => moneyFormatter({ amount }) },
        { title: translate('White Amount'), dataIndex: 'accountableAmount', key: 'accountableAmount', render: (amount) => amount ? moneyFormatter({ amount }) : '-' },
        { title: translate('Black Amount'), dataIndex: 'nonAccountableAmount', key: 'nonAccountableAmount', render: (amount) => amount ? moneyFormatter({ amount }) : '-' },
        {
            title: translate('Paid'),
            key: 'calculatedPaid',
            render: (_, record) => {
                const msPayments = getPaymentsForMilestone(record);
                const paid = msPayments.reduce((sum, p) => sum + (p.amount || 0), 0);
                return <b style={{ color: 'green' }}>{moneyFormatter({ amount: paid })}</b>;
            }
        },
        {
            title: translate('Status'), key: 'calculatedStatus', render: (_, record) => {
                const msPayments = getPaymentsForMilestone(record);
                const paid = msPayments.reduce((sum, p) => sum + (p.amount || 0), 0);
                const effectiveTotal = (record.accountableAmount || 0) + (record.nonAccountableAmount || 0) || record.amount;
                let status = paid >= effectiveTotal ? 'paid' : paid > 0 ? 'partially' : 'pending';
                let color = status === 'paid' ? 'green' : status === 'overdue' ? 'red' : 'gold';
                return <Tag color={color}>{status.toUpperCase()}</Tag>;
            }
        },
        {
            title: translate('Action'), key: 'action', render: (_, record) => {
                const msPayments = getPaymentsForMilestone(record);
                const paid = msPayments.reduce((sum, p) => sum + (p.amount || 0), 0);
                const effectiveTotal = (record.accountableAmount || 0) + (record.nonAccountableAmount || 0) || record.amount;
                const pending = effectiveTotal - paid;
                // If not fully paid, show Pay button
                if (pending > 0) {
                    return <Button type="primary" size="small" onClick={() => handlePay(record)}>Pay</Button>
                }
                // If paid, show Download Receipt button
                return (
                    <Button
                        size="small"
                        icon={<FilePdfOutlined />}
                        onClick={() => downloadMilestoneReceipt(record)}
                    >
                        Receipt
                    </Button>
                );
            }
        }
    ];

    const downloadMilestoneReceipt = async (record) => {
        try {
            message.loading({ content: 'Generating Receipt...', key: 'pdf_download' });
            // Use the request helper instead of direct axios if possible, or keep axios but use new route
            const response = await request.pdf({ entity: `booking/${id}/pdf-receipt?milestoneId=${record._id}` });

            const blob = new Blob([response.data], { type: 'application/pdf' });
            const url = window.URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', `Receipt_${record.name}.pdf`);
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            window.URL.revokeObjectURL(url);
            message.success({ content: 'Receipt Downloaded', key: 'pdf_download' });
        } catch (error) {
            console.error(error);
            message.error({ content: 'Failed to download receipt', key: 'pdf_download' });
        }
    };

    const tabItems = [
        {
            key: '1',
            label: translate('Booking Information'),
            children: (
                <>
                    <Card title="Booking Information" bordered={false}>
                        <Descriptions column={2} title="Basic Information">
                            <Descriptions.Item label="Client">{booking.client?.name}</Descriptions.Item>
                            <Descriptions.Item label="Villa">{booking.villa?.villaNumber}</Descriptions.Item>
                            <Descriptions.Item label="Date">{dayjs(booking.bookingDate).format(dateFormat)}</Descriptions.Item>
                            <Descriptions.Item label="Status"><Tag color="blue">{booking.status}</Tag></Descriptions.Item>
                        </Descriptions>
                        <Divider />
                        <Descriptions column={2} title="Client Details">
                            <Descriptions.Item label="Customer ID">{booking.customerId}</Descriptions.Item>
                            <Descriptions.Item label="Gender">{booking.gender}</Descriptions.Item>
                            <Descriptions.Item label="Father Name">{booking.fatherName}</Descriptions.Item>
                            <Descriptions.Item label="DOB">{booking.dob ? dayjs(booking.dob).format(dateFormat) : '-'}</Descriptions.Item>
                            <Descriptions.Item label="Phone">{booking.phone}</Descriptions.Item>
                            <Descriptions.Item label="Email">{booking.email}</Descriptions.Item>
                            <Descriptions.Item label="PAN Card">{booking.panCardNumber}</Descriptions.Item>
                            <Descriptions.Item label="Aadhar Card">{booking.aadharCardNumber}</Descriptions.Item>
                            <Descriptions.Item label="Driving Licence" span={2}>{booking.drivingLicence}</Descriptions.Item>
                            <Descriptions.Item label="Address" span={2}>{booking.address}</Descriptions.Item>
                        </Descriptions>
                        <Divider />
                        <Descriptions column={2} title="Villa Details">
                            <Descriptions.Item label="Villa Number">{booking.villaNumber}</Descriptions.Item>
                            <Descriptions.Item label="House Type">{booking.houseType}</Descriptions.Item>
                            <Descriptions.Item label="Facing">{booking.facing}</Descriptions.Item>
                            <Descriptions.Item label="Land Area">{booking.landArea} sqft</Descriptions.Item>
                            <Descriptions.Item label="Built Up Area">{booking.builtUpArea} sqft</Descriptions.Item>
                            <Descriptions.Item label="Ground Floor">{booking.groundFloorArea} sqft</Descriptions.Item>
                            <Descriptions.Item label="1st Floor">{booking.firstFloorArea} sqft</Descriptions.Item>
                            <Descriptions.Item label="2nd Floor">{booking.secondFloorArea} sqft</Descriptions.Item>
                            <Descriptions.Item label="Official Price">{moneyFormatter({ amount: booking.accountableAmount || 0 })}</Descriptions.Item>
                            <Descriptions.Item label="Internal Price">{moneyFormatter({ amount: booking.nonAccountableAmount || 0 })}</Descriptions.Item>
                        </Descriptions>
                        <Divider />
                        <Descriptions column={2} title="Payment Details">
                            <Descriptions.Item label="Payment Mode">{booking.paymentMode?.toUpperCase()}</Descriptions.Item>
                            <Descriptions.Item label="EMI Amount">{moneyFormatter({ amount: booking.emiAmount || 0 })}</Descriptions.Item>
                            <Descriptions.Item label="No. of EMIs">{booking.noOfEmi}</Descriptions.Item>
                        </Descriptions>
                        <Divider />
                        <Descriptions column={2} title="Nominee Information">
                            <Descriptions.Item label="Nominee Name">{booking.nomineeName}</Descriptions.Item>
                            <Descriptions.Item label="Father/Husband Name">{booking.nomineeFatherHusbandName}</Descriptions.Item>
                            <Descriptions.Item label="Relationship">{booking.nomineeRelationship}</Descriptions.Item>
                            <Descriptions.Item label="Mobile Number">{booking.nomineeMobile}</Descriptions.Item>
                            <Descriptions.Item label="Date of Birth">{booking.nomineeDob ? dayjs(booking.nomineeDob).format(dateFormat) : '-'}</Descriptions.Item>
                            <Descriptions.Item label="Agent">{booking.agent}</Descriptions.Item>
                            <Descriptions.Item label="Address" span={2}>{booking.nomineeAddress}</Descriptions.Item>
                        </Descriptions>
                        <Divider />
                        <h3>Payment Plan / Milestones</h3>
                        <Table
                            dataSource={booking.paymentPlan}
                            columns={paymentPlanColumns}
                            pagination={false}
                            rowKey={(record) => record._id || record.name}
                            scroll={{ x: 'max-content' }}
                        />
                    </Card>

                    <Card title="Financials" bordered={false} style={{ marginTop: 16 }}>
                        <Row gutter={48}>
                            <Col>
                                <Statistic title="Total Amount" value={moneyFormatter({ amount: booking.totalAmount })} />
                            </Col>
                            <Col>
                                <Statistic
                                    title="Paid Amount"
                                    value={moneyFormatter({ amount: payments.reduce((acc, curr) => acc + (curr.amount || 0), 0) })}
                                    valueStyle={{ color: '#3f8600' }}
                                />
                            </Col>
                            <Col>
                                <Statistic
                                    title="Pending Amount"
                                    value={moneyFormatter({ amount: booking.totalAmount - payments.reduce((acc, curr) => acc + (curr.amount || 0), 0) })}
                                    valueStyle={{ color: '#cf1322' }}
                                />
                            </Col>
                        </Row>
                    </Card>
                </>
            )
        },
        {
            key: '2',
            label: translate('Payment Requests'),
            children: (
                <Card title={translate('Generate Payment Request Forms')} bordered={false}>
                    <Table
                        dataSource={booking.paymentPlan}
                        rowKey="_id"
                        pagination={false}
                        columns={[
                            { title: translate('Milestone'), dataIndex: 'name', key: 'name' },
                            { title: translate('Amount'), dataIndex: 'amount', key: 'amount', render: (val) => moneyFormatter({ amount: val }) },
                            { title: translate('Due Date'), dataIndex: 'dueDate', key: 'dueDate', render: (d) => d ? dayjs(d).format(dateFormat) : '-' },
                            {
                                title: translate('Form'),
                                key: 'download',
                                render: (_, record) => (
                                    <Button
                                        type="primary"
                                        icon={<FilePdfOutlined />}
                                        onClick={() => {
                                              const auth = storePersist.get('auth');
                                              const token = auth?.current?.token || '';
                                              window.open(
                                                  `${DOWNLOAD_BASE_URL}paymentrequest/paymentrequest-${id}.pdf?milestoneId=${record._id}&token=${token}`,
                                                '_blank'
                                            );
                                        }}
                                    >
                                        Download Form
                                    </Button>
                                )
                            }
                        ]}
                    />
                </Card>
            )
        }
    ];

    return (
        <div style={{ padding: '20px' }}>
            <PageHeader
                onBack={() => navigate('/booking')}
                title={translate('Booking Details')}
                subTitle={`#${id.substr(-6)}`}
                extra={[
                    <Button key="pdf-details" icon={<FilePdfOutlined />} onClick={() => {
                          const auth = storePersist.get('auth');
                          const token = auth?.current?.token || '';
                          window.open(`${API_BASE_URL}booking/${id}/pdf-details?token=${token}`, '_blank');
                    }}>Download Booking Details</Button>,
                    <Button 
                        key="edit" 
                        disabled={payments.length > 0} 
                        onClick={() => navigate(`/booking/update/${id}`)}
                        title={payments.length > 0 ? "Cannot edit booking after payments are made" : "Edit Booking"}
                    >
                        Edit
                    </Button>,
                    <Button key="refresh" onClick={fetchBooking}>Refresh</Button>
                ]}
            />

            <Tabs defaultActiveKey="1" items={tabItems} />

            {/* Record Payment Modal */}
            <Modal
                title={`Record Payment: ${paymentModal.milestone?.name}`}
                open={paymentModal.open}
                onCancel={() => setPaymentModal({ open: false, milestone: null })}
                onOk={handlePaymentSubmit}
                okText="Record Payment"
                confirmLoading={loading}
                destroyOnClose
                width={700}
            >
                {(() => {
                    const ms = paymentModal.milestone;
                    if (!ms) return null;
                    const msPayments = getPaymentsForMilestone(ms);
                    const paidWhite = msPayments.filter(p => p.ledger === 'official').reduce((sum, p) => sum + (p.amount || 0), 0);
                    const paidBlack = msPayments.filter(p => p.ledger === 'internal').reduce((sum, p) => sum + (p.amount || 0), 0);
                    const pendingWhite = Math.max(0, (ms.accountableAmount || 0) - paidWhite);
                    const pendingBlack = Math.max(0, (ms.nonAccountableAmount || 0) - paidBlack);

                    return (
                        <Form form={form} layout="vertical" initialValues={{
                            date: dayjs(),
                            whiteAmount: pendingWhite,
                            blackAmount: pendingBlack,
                            whitePaymentMode: 'Bank Transfer',
                            blackPaymentMode: 'Cash'
                        }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 }}>
                                <Form.Item name="date" label="Date" rules={[{ required: true }]} style={{ marginBottom: 0, flex: 1, marginRight: 20 }}>
                                    <DatePicker style={{ width: '100%' }} />
                                </Form.Item>
                                
                                <Checkbox 
                                    checked={isPartialPayment} 
                                    onChange={(e) => setIsPartialPayment(e.target.checked)}
                                    style={{ marginTop: 25 }}
                                >
                                    Make Partial Payment
                                </Checkbox>
                            </div>
                            
                            <Row gutter={24}>
                                {/* OFFICIAL (WHITE) SECTION */}
                                {pendingWhite > 0 && (
                                <Col span={pendingBlack > 0 ? 12 : 24}>
                                    <div style={{ padding: '15px', background: 'rgba(24, 144, 255, 0.1)', borderRadius: '8px', border: '1px solid rgba(24, 144, 255, 0.3)' }}>
                                        <h4 style={{ color: '#69c0ff', marginTop: 0, marginBottom: '5px' }}>Official (White)</h4>
                                        <div style={{ marginBottom: 15, fontSize: '13px' }}>
                                            Pending: <strong style={{ color: '#1890ff' }}>{moneyFormatter({ amount: pendingWhite })}</strong>
                                        </div>
                                        <Form.Item name="whiteAmount" label="Paying Amount">
                                            <InputNumber style={{ width: '100%' }} min={0} disabled={!isPartialPayment} />
                                        </Form.Item>
                                        <Form.Item name="whitePaymentMode" label="Payment Mode">
                                            <Select>
                                                <Select.Option value="Bank Transfer">Bank Transfer</Select.Option>
                                                <Select.Option value="Cash">Cash</Select.Option>
                                                <Select.Option value="Cheque">Cheque</Select.Option>
                                                <Select.Option value="Card">Card</Select.Option>
                                                <Select.Option value="Loan">Loan</Select.Option>
                                            </Select>
                                        </Form.Item>
                                        <Form.Item
                                            noStyle
                                            shouldUpdate={(prevValues, currentValues) => prevValues.whitePaymentMode !== currentValues.whitePaymentMode}
                                        >
                                            {({ getFieldValue }) => {
                                                const mode = getFieldValue('whitePaymentMode');
                                                return (
                                                    <Form.Item
                                                        name="whiteRef"
                                                        label="Reference / Transaction ID"
                                                        rules={[{ required: mode && mode !== 'Cash', message: 'Required' }]}
                                                    >
                                                        <Input placeholder="Txn ID" />
                                                    </Form.Item>
                                                );
                                            }}
                                        </Form.Item>
                                    </div>
                                </Col>
                                )}

                                {/* INTERNAL (BLACK) SECTION */}
                                {pendingBlack > 0 && (
                                <Col span={pendingWhite > 0 ? 12 : 24}>
                                    <div style={{ padding: '15px', background: 'rgba(245, 34, 45, 0.1)', borderRadius: '8px', border: '1px solid rgba(245, 34, 45, 0.3)' }}>
                                        <h4 style={{ color: '#ff7875', marginTop: 0, marginBottom: '5px' }}>Internal (Black)</h4>
                                        <div style={{ marginBottom: 15, fontSize: '13px' }}>
                                            Pending: <strong style={{ color: '#ff4d4f' }}>{moneyFormatter({ amount: pendingBlack })}</strong>
                                        </div>
                                        <Form.Item name="blackAmount" label="Paying Amount">
                                            <InputNumber style={{ width: '100%' }} min={0} disabled={!isPartialPayment} />
                                        </Form.Item>
                                        <Form.Item name="blackPaymentMode" label="Payment Mode">
                                            <Select>
                                                <Select.Option value="Cash">Cash</Select.Option>
                                                <Select.Option value="Bank Transfer">Bank Transfer</Select.Option>
                                                <Select.Option value="Cheque">Cheque</Select.Option>
                                            </Select>
                                        </Form.Item>
                                        <Form.Item
                                            noStyle
                                            shouldUpdate={(prevValues, currentValues) => prevValues.blackPaymentMode !== currentValues.blackPaymentMode}
                                        >
                                            {({ getFieldValue }) => {
                                                const mode = getFieldValue('blackPaymentMode');
                                                return (
                                                    <Form.Item
                                                        name="blackRef"
                                                        label="Reference / Transaction ID"
                                                        rules={[{ required: mode && mode !== 'Cash', message: 'Required' }]}
                                                    >
                                                        <Input placeholder="Txn ID" />
                                                    </Form.Item>
                                                );
                                            }}
                                        </Form.Item>
                                    </div>
                                </Col>
                                )}
                            </Row>

                            <Form.Item name="description" label="Description" style={{ marginTop: '20px' }}>
                                <Input.TextArea placeholder="Optional notes for this transaction..." />
                            </Form.Item>
                        </Form>
                    );
                })()}
            </Modal>
        </div>
    );
}
