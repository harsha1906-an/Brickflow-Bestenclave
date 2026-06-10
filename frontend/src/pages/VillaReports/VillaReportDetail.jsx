import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, Row, Col, Statistic, Table, Button, Tabs, Spin, Typography, Space, Tag, Divider } from 'antd';
import { ArrowLeftOutlined, PrinterOutlined, ToolOutlined, TeamOutlined, DollarOutlined, BankOutlined, PlusOutlined, MinusOutlined, WalletOutlined } from '@ant-design/icons';
import { request } from '@/request';
import useMoney from '@/settings/useMoney';
import { API_BASE_URL } from '@/config/serverApiConfig';
import dayjs from 'dayjs';


const { Title, Text } = Typography;

export default function VillaReportDetail() {
    const { id } = useParams();
    const navigate = useNavigate();
    const { moneyFormatter } = useMoney();
    const [loading, setLoading] = useState(false);
    const [villa, setVilla] = useState(null);
    const [stats, setStats] = useState({ material: 0, labour: 0, total: 0, payments: 0, balance: 0 });
    const [labourExpenses, setLabourExpenses] = useState([]);
    const [materialTransactions, setMaterialTransactions] = useState([]);
    const [payments, setPayments] = useState([]);



    useEffect(() => {
        if (id) {
            fetchDetails();
        }
    }, [id]);

    const fetchDetails = async () => {
        setLoading(true);
        try {
            // 1. Fetch Villa Details
            const villaRes = await request.read({ entity: 'villa', id });
            if (villaRes.success) {
                setVilla(villaRes.result);
            }

            // 2. Fetch Labour Expenses
            const labourRes = await request.filter({
                entity: 'expense',
                options: {
                    filter: 'villa',
                    equal: id
                }
            });

            let lExpenses = [];
            let lTotal = 0;
            if (labourRes.success && labourRes.result) {
                lExpenses = labourRes.result.filter(e => e.recipientType === 'Labour');
                lTotal = lExpenses.reduce((sum, e) => sum + (e.amount || 0), 0);
                setLabourExpenses(lExpenses);
            }

            // 3. Fetch Material Transactions (Inventory)
            const inventoryRes = await request.filter({
                entity: 'inventorytransaction',
                options: {
                    filter: 'villa',
                    equal: id
                }
            });

            let mTrans = [];
            let mTotal = 0;
            if (inventoryRes.success && inventoryRes.result) {
                mTrans = inventoryRes.result.filter(t => t.type === 'inward');
                mTotal = mTrans.reduce((sum, t) => sum + (t.totalCost || 0), 0);
                setMaterialTransactions(mTrans);
            }

            // 4. Fetch Customer Payments
            const paymentRes = await request.filter({
                entity: 'payment',
                options: {
                    filter: 'villa',
                    equal: id
                }
            });

            let pTrans = [];
            let pTotal = 0;
            if (paymentRes.success && paymentRes.result) {
                pTrans = paymentRes.result;
                pTotal = pTrans.reduce((sum, p) => sum + (p.amount || 0), 0);
                setPayments(pTrans);
            }

            setStats({
                material: mTotal,
                labour: lTotal,
                total: mTotal + lTotal,
                payments: pTotal,
                balance: pTotal - (mTotal + lTotal)
            });

            // 5. Fetch Labour Contracts
            const contractRes = await request.filter({
                entity: 'labourcontract',
                options: {
                    filter: 'villa',
                    equal: id
                }
            });

            let contractTotal = 0;
            let contractPaid = 0;
            let contractList = [];
            const milestoneExpenseMap = {}; // Map expenseId to grossAmount

            if (contractRes.success && contractRes.result) {
                contractList = contractRes.result;
                contractList.forEach(contract => {
                    contractTotal += contract.totalAmount || 0;
                    if (contract.milestones && Array.isArray(contract.milestones)) {
                        contract.milestones.forEach(ms => {
                            if (ms.isCompleted) {
                                contractPaid += ms.amount || 0;
                                if (ms.expenseId) {
                                    milestoneExpenseMap[ms.expenseId] = ms.amount; // Store Gross Amount
                                }
                            }
                        });
                    }
                });
            }

            // Adjust Labour Expenses to use Gross Amount for Milestones
            const adjustedLabourExpenses = lExpenses.map(exp => {
                if (milestoneExpenseMap[exp._id]) {
                    return { ...exp, amount: milestoneExpenseMap[exp._id] };
                }
                return exp;
            });
            
            // Recalculate Labour Total based on adjustments
            const adjustedLabourTotal = adjustedLabourExpenses.reduce((sum, e) => sum + (e.amount || 0), 0);

            setLabourExpenses(adjustedLabourExpenses);

            setStats({
                material: mTotal,
                labour: adjustedLabourTotal,
                total: mTotal + adjustedLabourTotal,
                payments: pTotal,
                balance: pTotal - (mTotal + adjustedLabourTotal),
                contractTotal: contractTotal,
                contractPaid: contractPaid,
                contractRemaining: contractTotal - contractPaid
            });

        } catch (e) {
            console.error(e);
        }
        setLoading(false);
    };

    const labourColumns = [
        {
            title: 'Date',
            dataIndex: 'date',
            key: 'date',
            render: (text) => dayjs(text).format('DD/MM/YYYY')
        },
        {
            title: 'Worker Name',
            key: 'worker',
            render: (_, record) => record.labour?.name || '-'
        },
        {
            title: 'Description',
            dataIndex: 'description',
            key: 'description',
        },
        {
            title: 'Reference',
            dataIndex: 'reference',
            key: 'reference',
        },
        {
            title: 'Amount',
            dataIndex: 'amount',
            key: 'amount',
            align: 'right',
            render: (amount) => <b>{moneyFormatter({ amount })}</b>
        }
    ];

    const materialColumns = [
        {
            title: 'Date',
            dataIndex: 'date',
            key: 'date',
            render: (text) => dayjs(text).format('DD/MM/YYYY')
        },
        {
            title: 'Material',
            key: 'material',
            render: (_, record) => record.material?.name || '-'
        },
        {
            title: 'Quantity',
            dataIndex: 'quantity',
            key: 'quantity',
            render: (qty, record) => `${qty} ${record.material?.unit || ''}`
        },
        {
            title: 'Unit Cost',
            dataIndex: 'unitCost',
            key: 'unitCost',
            align: 'right',
            render: (amount) => moneyFormatter({ amount })
        },
        {
            title: 'Total Cost',
            dataIndex: 'totalCost',
            key: 'totalCost',
            align: 'right',
            render: (amount) => <b>{moneyFormatter({ amount })}</b>
        }
    ];

    const paymentColumns = [
        {
            title: 'Date',
            dataIndex: 'date',
            key: 'date',
            render: (text) => dayjs(text).format('DD/MM/YYYY')
        },
        {
            title: 'Receipt #',
            dataIndex: 'number',
            key: 'number',
        },
        {
            title: 'Customer',
            key: 'client',
            render: (_, record) => record.client?.name || '-'
        },
        {
            title: 'Mode',
            dataIndex: 'paymentMode',
            key: 'paymentMode',
        },
        {
            title: 'Amount',
            dataIndex: 'amount',
            key: 'amount',
            align: 'right',
            render: (amount) => <b style={{ color: 'green' }}>{moneyFormatter({ amount })}</b>
        }
    ];

    const handleDownload = async () => {
        try {
            setLoading(true);
            const response = await request.pdf({ entity: `villa/report/${id}` });
            const url = window.URL.createObjectURL(new Blob([response.data]));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', `Villa_Report_${villa.villaNumber}.pdf`);
            document.body.appendChild(link);
            link.click();
            window.URL.revokeObjectURL(url);
            document.body.removeChild(link);
            setLoading(false);
        } catch (error) {
            console.error('Download failed:', error);
            setLoading(false);
        }
    };

    if (loading) return <div style={{ textAlign: 'center', marginTop: 100 }}><Spin size="large" /></div>;

    return (
        <div style={{ padding: 24 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 24 }}>
                <Space>
                    <Button icon={<ArrowLeftOutlined />} onClick={() => navigate('/villa-reports')}>Back</Button>
                    <Title level={3} style={{ margin: 0 }}>
                        {villa ? `Villa ${villa.villaNumber} Report` : 'Detailed Report'}
                    </Title>
                </Space>
                <Space>
                    <Button icon={<PrinterOutlined />} onClick={handleDownload} type="primary">Download Report</Button>
                </Space>
            </div>

            <div style={{ padding: 20 }}>
                {/* Income Section */}
                <Divider orientation="left" style={{ borderColor: '#3f8600', color: '#3f8600' }}>
                    <BankOutlined /> Income Overview
                </Divider>
                <Row gutter={24} style={{ marginBottom: 24 }}>
                    <Col span={8}>
                        <Card>
                            <Statistic
                                title="Total Villa Value"
                                value={villa?.totalAmount || 0}
                                precision={2}
                                valueStyle={{ color: '#1890ff' }}
                                prefix={<DollarOutlined />}
                                formatter={(v) => moneyFormatter({ amount: v })}
                            />
                        </Card>
                    </Col>
                    <Col span={8}>
                        <Card>
                            <Statistic
                                title="Total Receipts"
                                value={stats.payments}
                                precision={2}
                                valueStyle={{ color: '#3f8600' }}
                                prefix={<PlusOutlined />}
                                formatter={(v) => moneyFormatter({ amount: v })}
                            />
                        </Card>
                    </Col>
                    <Col span={8}>
                        <Card>
                            <Statistic
                                title="Remaining Balance"
                                value={(villa?.totalAmount || 0) - stats.payments}
                                precision={2}
                                valueStyle={{ color: ((villa?.totalAmount || 0) - stats.payments) > 0 ? '#cf1322' : '#3f8600' }}
                                prefix={<WalletOutlined />}
                                formatter={(v) => moneyFormatter({ amount: v })}
                            />
                        </Card>
                    </Col>
                </Row>

                {/* Labour Contracts Section */}
                <Divider orientation="left" style={{ borderColor: '#722ed1', color: '#722ed1' }}>
                    <TeamOutlined /> Labour Contracts Overview
                </Divider>
                <Row gutter={24} style={{ marginBottom: 24 }}>
                    <Col span={8}>
                        <Card>
                            <Statistic
                                title="Total Contract Value"
                                value={stats.contractTotal || 0}
                                precision={2}
                                valueStyle={{ color: '#722ed1' }}
                                prefix={<DollarOutlined />}
                                formatter={(v) => moneyFormatter({ amount: v })}
                            />
                        </Card>
                    </Col>
                    <Col span={8}>
                        <Card>
                            <Statistic
                                title="Paid to Contractors"
                                value={stats.contractPaid || 0}
                                precision={2}
                                valueStyle={{ color: '#52c41a' }}
                                prefix={<WalletOutlined />}
                                formatter={(v) => moneyFormatter({ amount: v })}
                            />
                        </Card>
                    </Col>
                    <Col span={8}>
                        <Card>
                            <Statistic
                                title="Remaining to Pay"
                                value={stats.contractRemaining || 0}
                                precision={2}
                                valueStyle={{ color: (stats.contractRemaining || 0) > 0 ? '#cf1322' : '#52c41a' }}
                                prefix={<BankOutlined />}
                                formatter={(v) => moneyFormatter({ amount: v })}
                            />
                        </Card>
                    </Col>
                </Row>

                {/* Expense Section */}
                <Divider orientation="left" style={{ borderColor: '#cf1322', color: '#cf1322' }}>
                    <DollarOutlined /> Expense Overview
                </Divider>
                <Row gutter={24} style={{ marginBottom: 24 }}>
                    <Col span={8}>
                        <Card>
                            <Statistic
                                title="Total Expenses"
                                value={stats.total}
                                precision={2}
                                valueStyle={{ color: '#cf1322' }}
                                prefix={<MinusOutlined />}
                                formatter={(v) => moneyFormatter({ amount: v })}
                            />
                        </Card>
                    </Col>
                    <Col span={8}>
                        <Card>
                            <Statistic
                                title="Labour Costs"
                                value={stats.labour}
                                precision={2}
                                valueStyle={{ color: '#1890ff' }}
                                prefix={<TeamOutlined />}
                                formatter={(v) => moneyFormatter({ amount: v })}
                            />
                        </Card>
                    </Col>
                    <Col span={8}>
                        <Card>
                            <Statistic
                                title="Material Costs"
                                value={stats.material}
                                precision={2}
                                valueStyle={{ color: '#52c41a' }}
                                prefix={<ToolOutlined />}
                                formatter={(v) => moneyFormatter({ amount: v })}
                            />
                        </Card>
                    </Col>
                </Row>

                <Tabs defaultActiveKey="payments" type="card"
                    items={[
                        {
                            key: 'payments',
                            label: <span><BankOutlined /> Receipts (Income)</span>,
                            children: (
                                <Table
                                    columns={paymentColumns}
                                    dataSource={payments}
                                    rowKey="_id"
                                    pagination={false}
                                    bordered
                                    summary={() => (
                                        <Table.Summary fixed>
                                            <Table.Summary.Row>
                                                <Table.Summary.Cell index={0} colSpan={4} align="right">
                                                    <strong>Income</strong>
                                                </Table.Summary.Cell>
                                                <Table.Summary.Cell index={1} align="right">
                                                    <Text type="success">{moneyFormatter({ amount: stats.payments })}</Text>
                                                </Table.Summary.Cell>
                                            </Table.Summary.Row>
                                        </Table.Summary>
                                    )}
                                />
                            )
                        },
                        {
                            key: 'labour',
                            label: <span><TeamOutlined /> Labour Expenses</span>,
                            children: (
                                <Table
                                    columns={labourColumns}
                                    dataSource={labourExpenses}
                                    rowKey="_id"
                                    pagination={false}
                                    bordered
                                    summary={() => (
                                        <Table.Summary fixed>
                                            <Table.Summary.Row>
                                                <Table.Summary.Cell index={0} colSpan={4} align="right">
                                                    <strong>Total Labour Cost</strong>
                                                </Table.Summary.Cell>
                                                <Table.Summary.Cell index={1} align="right">
                                                    <Text type="danger">{moneyFormatter({ amount: stats.labour })}</Text>
                                                </Table.Summary.Cell>
                                            </Table.Summary.Row>
                                        </Table.Summary>
                                    )}
                                />
                            )
                        },
                        {
                            key: 'material',
                            label: <span><ToolOutlined /> Material Expenses</span>,
                            children: (
                                <Table
                                    columns={materialColumns}
                                    dataSource={materialTransactions}
                                    rowKey="_id"
                                    pagination={false}
                                    bordered
                                    summary={() => (
                                        <Table.Summary fixed>
                                            <Table.Summary.Row>
                                                <Table.Summary.Cell index={0} colSpan={4} align="right">
                                                    <strong>Total Material Cost</strong>
                                                </Table.Summary.Cell>
                                                <Table.Summary.Cell index={1} align="right">
                                                    <Text type="danger">{moneyFormatter({ amount: stats.material })}</Text>
                                                </Table.Summary.Cell>
                                            </Table.Summary.Row>
                                        </Table.Summary>
                                    )}
                                />
                            )
                        }
                    ]}
                />
            </div>
        </div>
    );
}
