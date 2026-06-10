import { useState, useEffect } from 'react';
import { Card, Button, Typography, Spin, Space, Tag } from 'antd';
import { WhatsAppOutlined, ReloadOutlined } from '@ant-design/icons';
import { request } from '@/request';

const { Title, Text } = Typography;

export default function WhatsAppSettings() {
    const [status, setStatus] = useState('LOADING');
    const [qrCode, setQrCode] = useState(null);
    const [loading, setLoading] = useState(false);

    const fetchStatus = async () => {
        setLoading(true);
        try {
            const { result } = await request.get({ entity: 'whatsapp/status' });
            if (result) {
                setStatus(result.status);
                setQrCode(result.qrCode);
            }
        } catch (error) {
            console.error('Failed to fetch WhatsApp status', error);
            setStatus('ERROR');
        }
        setLoading(false);
    };

    const resetConnection = async () => {
        setLoading(true);
        try {
            await request.post({ entity: 'whatsapp/reset' });
            setTimeout(fetchStatus, 3000); // Wait for restart
        } catch (error) {
            console.error('Failed to reset connection', error);
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchStatus();
        const interval = setInterval(fetchStatus, 10000); // Poll every 10s
        return () => clearInterval(interval);
    }, []);

    const getStatusTag = () => {
        switch(status) {
            case 'READY':
                return <Tag color="success">Connected & Ready</Tag>;
            case 'AUTHENTICATED':
                return <Tag color="processing">Authenticating...</Tag>;
            case 'QR_READY':
                return <Tag color="warning">Action Required: Scan QR</Tag>;
            case 'DISCONNECTED':
                return <Tag color="error">Disconnected</Tag>;
            default:
                return <Tag color="default">Loading...</Tag>;
        }
    };

    return (
        <Card title="WhatsApp Web Integration" bordered={false}>
            <div style={{ textAlign: 'center', padding: '20px' }}>
                <Space direction="vertical" size="large">
                    <WhatsAppOutlined style={{ fontSize: '48px', color: '#25D366' }} />
                    <Title level={4}>WhatsApp Status: {getStatusTag()}</Title>

                    {status === 'QR_READY' && qrCode && (
                        <div>
                            <Text>Please open WhatsApp on your phone, go to Linked Devices, and scan this QR code:</Text>
                            <div style={{ marginTop: '20px' }}>
                                <img src={qrCode} alt="WhatsApp QR Code" style={{ width: 256, height: 256 }} />
                            </div>
                        </div>
                    )}

                    {(status === 'DISCONNECTED' || status === 'ERROR') && (
                        <Text type="danger">
                            The WhatsApp client is currently disconnected. Please click Reset to generate a new QR code.
                        </Text>
                    )}

                    {status === 'READY' && (
                        <Text type="success">
                            Your WhatsApp account is successfully linked to BrickFlow! You can now send automated messages.
                        </Text>
                    )}

                    <div style={{ marginTop: '20px' }}>
                        <Button 
                            icon={<ReloadOutlined />} 
                            onClick={resetConnection} 
                            loading={loading}
                            type={status === 'DISCONNECTED' ? 'primary' : 'default'}
                        >
                            Reset WhatsApp Connection
                        </Button>
                    </div>
                </Space>
            </div>
        </Card>
    );
}
