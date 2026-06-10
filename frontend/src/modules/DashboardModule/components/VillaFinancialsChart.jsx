import React from 'react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts';
import { Spin } from 'antd';
import { useMoney } from '@/settings';
import { useSelector } from 'react-redux';
import { selectMoneyFormat } from '@/redux/settings/selectors';

export default function VillaFinancialsChart({ villas, isLoading }) {
    const { moneyFormatter } = useMoney();
    const money_format_settings = useSelector(selectMoneyFormat);
    const currency = money_format_settings.default_currency_code || 'USD';

    if (isLoading) {
        return (
            <div style={{ textAlign: 'center', padding: '100px 0' }}>
                <Spin size="large" />
            </div>
        );
    }

    if (!villas || villas.length === 0) {
        return (
            <div style={{
                textAlign: 'center',
                padding: '100px 20px',
                color: '#999',
                background: '#fafafa',
                borderRadius: '12px',
                border: '1px dashed #d9d9d9'
            }}>
                <div style={{ fontSize: '16px' }}>No villa financials available</div>
            </div>
        );
    }

    // Format data for Recharts
    const chartData = villas.map(v => ({
        name: v.name || `Villa ${v.villaNumber}`,
        Income: v.income || 0,
        Expense: v.expense || 0,
    }));

    const formatYAxis = (value) => {
        // Strip decimals for a cleaner axis look
        return moneyFormatter({ amount: value, currency_code: currency }).split('.')[0];
    };

    // Custom hover tooltip for clean currency presentation
    const CustomTooltip = ({ active, payload, label }) => {
        if (active && payload && payload.length) {
            return (
                <div style={{ 
                    backgroundColor: 'rgba(255, 255, 255, 0.98)', 
                    padding: '12px 16px', 
                    border: '1px solid #f0f0f0', 
                    borderRadius: '8px', 
                    boxShadow: '0 4px 15px rgba(0,0,0,0.08)' 
                }}>
                    <p style={{ fontWeight: '700', margin: '0 0 8px 0', color: '#1f1f1f' }}>{label}</p>
                    {payload.map((entry, index) => (
                        <p key={index} style={{ margin: '4px 0', color: entry.color, fontSize: '13px' }}>
                            <span style={{ fontWeight: 600 }}>{entry.name}:</span>{' '}
                            {moneyFormatter({ amount: entry.value, currency_code: currency })}
                        </p>
                    ))}
                </div>
            );
        }
        return null;
    };

    return (
        <div style={{ width: '100%', height: '360px', marginTop: '20px' }}>
            <ResponsiveContainer width="100%" height="100%">
                <BarChart
                    data={chartData}
                    margin={{ top: 10, right: 10, left: 10, bottom: 5 }}
                >
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                    <XAxis 
                        dataKey="name" 
                        stroke="#8c8c8c" 
                        fontSize={12} 
                        tickLine={false} 
                        axisLine={false} 
                    />
                    <YAxis 
                        tickFormatter={formatYAxis} 
                        stroke="#8c8c8c" 
                        fontSize={11} 
                        tickLine={false} 
                        axisLine={false} 
                        width={80}
                    />
                    <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(0, 0, 0, 0.02)' }} />
                    <Legend 
                        verticalAlign="top" 
                        height={36} 
                        iconType="circle" 
                        iconSize={8}
                        wrapperStyle={{ fontSize: '12px' }}
                    />
                    <Bar 
                        dataKey="Income" 
                        fill="#52c41a" 
                        radius={[4, 4, 0, 0]} 
                        barSize={24}
                    />
                    <Bar 
                        dataKey="Expense" 
                        fill="#ff4d4f" 
                        radius={[4, 4, 0, 0]} 
                        barSize={24}
                    />
                </BarChart>
            </ResponsiveContainer>
        </div>
    );
}
