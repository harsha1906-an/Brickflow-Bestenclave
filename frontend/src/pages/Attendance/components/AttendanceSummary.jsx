import React from 'react';
import { Card, Row, Col, Statistic } from 'antd';
import { CheckCircleOutlined, CloseCircleOutlined, WarningOutlined } from '@ant-design/icons';

import useMobile from '@/hooks/useMobile';

const AttendanceSummary = ({ total, present, absent, unmarked }) => {
    const isMobile = useMobile();

    if (isMobile) {
        return (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px', marginBottom: '16px' }}>
                {/* Total Labour */}
                <div style={{ background: '#ffffff', padding: '16px', borderRadius: '16px', border: '1px solid #f1f5f9', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.02)' }}>
                    <div style={{ fontSize: '10px', fontWeight: '700', color: '#888', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '4px' }}>
                        Total Labour
                    </div>
                    <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#1e293b' }}>
                        {total}
                    </div>
                </div>

                {/* Present */}
                <div style={{ background: '#f0fdf4', padding: '16px', borderRadius: '16px', border: '1px solid #dcfce7', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.02)', position: 'relative' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <span style={{ fontSize: '10px', fontWeight: '700', color: '#15803d', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Present</span>
                        <CheckCircleOutlined style={{ color: '#15803d', fontSize: '14px' }} />
                    </div>
                    <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#15803d', marginTop: '4px' }}>
                        {present}
                    </div>
                </div>

                {/* Absent */}
                <div style={{ background: '#fef2f2', padding: '16px', borderRadius: '16px', border: '1px solid #fee2e2', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.02)', position: 'relative' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <span style={{ fontSize: '10px', fontWeight: '700', color: '#b91c1c', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Absent</span>
                        <CloseCircleOutlined style={{ color: '#b91c1c', fontSize: '14px' }} />
                    </div>
                    <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#b91c1c', marginTop: '4px' }}>
                        {absent}
                    </div>
                </div>

                {/* Unmarked */}
                <div style={{ background: '#f8fafc', padding: '16px', borderRadius: '16px', border: '1px solid #f1f5f9', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.02)', position: 'relative' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <span style={{ fontSize: '10px', fontWeight: '700', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Unmarked</span>
                        <WarningOutlined style={{ color: '#64748b', fontSize: '14px' }} />
                    </div>
                    <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#64748b', marginTop: '4px' }}>
                        {unmarked}
                    </div>
                </div>
            </div>
        );
    }

    return (
        <Card size="small" style={{ marginBottom: 16 }}>
            <Row gutter={16}>
                <Col span={6}>
                    <Statistic
                        title="Total Labour"
                        value={total}
                        valueStyle={{ color: '#1890ff' }}
                    />
                </Col>
                <Col span={6}>
                    <Statistic
                        title="Present"
                        value={present}
                        valueStyle={{ color: '#52c41a' }}
                        prefix={<CheckCircleOutlined />}
                    />
                </Col>
                <Col span={6}>
                    <Statistic
                        title="Absent"
                        value={absent}
                        valueStyle={{ color: '#ff4d4f' }}
                        prefix={<CloseCircleOutlined />}
                    />
                </Col>
                <Col span={6}>
                    <Statistic
                        title="Unmarked"
                        value={unmarked}
                        valueStyle={{ color: unmarked > 0 ? '#faad14' : '#52c41a' }}
                        prefix={unmarked > 0 ? <WarningOutlined /> : <CheckCircleOutlined />}
                    />
                </Col>
            </Row>
        </Card>
    );
};

export default AttendanceSummary;
