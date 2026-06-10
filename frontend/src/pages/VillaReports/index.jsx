import React, { useState, useEffect } from 'react';
import { Card, Row, Col, Statistic, Spin, Empty, Button, Divider, Input } from 'antd';
import { DollarOutlined, ToolOutlined, TeamOutlined, EyeOutlined, BankOutlined, PlusOutlined, MinusOutlined, SearchOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { request } from '@/request';
import { message } from '@/utils/antdGlobal';
import useMoney from '@/settings/useMoney';

export default function VillaReports() {
    const [villas, setVillas] = useState([]);
    const [loading, setLoading] = useState(false);
    const [expenseSummaries, setExpenseSummaries] = useState({});
    const [searchText, setSearchText] = useState('');
    const navigate = useNavigate();
    const { moneyFormatter } = useMoney();

    useEffect(() => {
        fetchVillasAndExpenses();
    }, []);

    const fetchVillasAndExpenses = async () => {
        setLoading(true);
        try {
            // Fetch all villas
            const villaData = await request.listAll({ entity: 'villa' });
            if (villaData.success) {
                setVillas(villaData.result);

                // For each villa, fetch basic expense summary
                const summaries = {};
                for (const villa of villaData.result) {
                    const summary = await fetchVillaExpenseSummary(villa._id);
                    summaries[villa._id] = summary;
                }
                setExpenseSummaries(summaries);
            }
        } catch (e) {
            message.error('Failed to load villas');
            console.error(e);
        }
        setLoading(false);
    };

    const fetchVillaExpenseSummary = async (villaId) => {
        try {
            // Fetch inventory transactions for this villa
            const inventoryData = await request.filter({
                entity: 'inventorytransaction',
                options: {
                    filter: 'villa',
                    equal: villaId
                }
            });

            // Calculate material costs
            let materialCost = 0;
            if (inventoryData.success && inventoryData.result) {
                materialCost = inventoryData.result
                    .filter(t => t.type === 'inward')
                    .reduce((sum, t) => sum + (t.totalCost || 0), 0);
            }

            // Fetch labour contract for this villa to get Gross Amount
            const contractRes = await request.filter({
                entity: 'labourcontract',
                options: {
                    filter: 'villa',
                    equal: villaId
                }
            });

            let labourCost = 0;
            if (contractRes.success && contractRes.result) {
                 contractRes.result.forEach(contract => {
                    if (contract.milestones && Array.isArray(contract.milestones)) {
                        contract.milestones.forEach(ms => {
                            if (ms.isCompleted) {
                                labourCost += ms.amount || 0;
                            }
                        });
                    }
                });
            }

            // Fetch Customer Payments (Income)
            const paymentData = await request.filter({
                entity: 'payment',
                options: {
                    filter: 'villa',
                    equal: villaId
                }
            });

            let totalReceipts = 0;
            if (paymentData.success && paymentData.result) {
                totalReceipts = paymentData.result.reduce((sum, p) => sum + (p.amount || 0), 0);
            }

            return {
                materialCost,
                labourCost,
                totalExpenses: materialCost + labourCost,
                totalReceipts
            };
        } catch (e) {
            console.error('Failed to fetch expense summary for villa:', villaId, e);
            return { materialCost: 0, labourCost: 0, totalExpenses: 0, totalReceipts: 0 };
        }
    };

    const handleViewReport = (villaId) => {
        navigate(`/villa-reports/${villaId}`);
    };

    if (loading) {
        return (
            <div style={{ textAlign: 'center', padding: '100px 0' }}>
                <Spin size="large" />
            </div>
        );
    }

    if (villas.length === 0) {
        return (
            <Card>
                <Empty description="No villas found" />
            </Card>
        );
    }

    const filteredVillas = villas.filter(villa =>
        villa.villaNumber?.toString().toLowerCase().includes(searchText.toLowerCase())
    );

    return (
        <div style={{ padding: '24px' }}>
            <h1 style={{ marginBottom: 24 }}>Villa Reports</h1>

            <Input
                placeholder="Search Villa Number..."
                prefix={<SearchOutlined />}
                style={{ marginBottom: 24, width: 300 }}
                onChange={e => setSearchText(e.target.value)}
                allowClear
            />

            <Row gutter={[16, 16]}>
                {filteredVillas.map(villa => {
                    const summary = expenseSummaries[villa._id] || { materialCost: 0, labourCost: 0, totalExpenses: 0, totalReceipts: 0 };
                    return (
                        <Col key={villa._id} span={24}>
                            <Card
                                hoverable
                                title={`Villa ${villa.villaNumber}`}
                                extra={
                                    <Button
                                        type="primary"
                                        icon={<EyeOutlined />}
                                        onClick={() => handleViewReport(villa._id)}
                                    >
                                        View Details
                                    </Button>
                                }
                                styles={{ body: { padding: '24px' } }}
                            >
                                <Row gutter={24}>
                                    <Col span={6}>
                                        <Statistic
                                            title="Income"
                                            value={summary.totalReceipts}
                                            prefix={<BankOutlined />}
                                            formatter={(value) => moneyFormatter({ amount: value })}
                                            valueStyle={{ color: '#3f8600', fontSize: 24 }}
                                        />
                                    </Col>
                                    <Col span={6}>
                                        <Statistic
                                            title="Total Expenses"
                                            value={summary.totalExpenses}
                                            prefix={<DollarOutlined />}
                                            formatter={(value) => moneyFormatter({ amount: value })}
                                            valueStyle={{ color: '#cf1322', fontSize: 24 }}
                                        />
                                    </Col>
                                    <Col span={6}>
                                        <Statistic
                                            title="Materials"
                                            value={summary.materialCost}
                                            prefix={<ToolOutlined />}
                                            formatter={(value) => moneyFormatter({ amount: value })}
                                            valueStyle={{ fontSize: 18, color: '#595959' }}
                                        />
                                    </Col>
                                    <Col span={6}>
                                        <Statistic
                                            title="Labour"
                                            value={summary.labourCost}
                                            prefix={<TeamOutlined />}
                                            formatter={(value) => moneyFormatter({ amount: value })}
                                            valueStyle={{ fontSize: 18, color: '#595959' }}
                                        />
                                    </Col>
                                </Row>

                            </Card>
                        </Col>
                    );
                })}
            </Row>
        </div>
    );
}
