import React, { useState, useEffect } from 'react';
import { Badge, Popover, List, Avatar, Typography, Button, Empty } from 'antd';
import { BellOutlined, ExclamationCircleOutlined, DollarCircleOutlined, ShopOutlined } from '@ant-design/icons';
import { useThemeContext } from '@/context/ThemeContext';
import { request } from '@/request';

const { Text, Paragraph } = Typography;

const NotificationBell = () => {
    const { isDarkMode } = useThemeContext();
    const [open, setOpen] = useState(false);
    const [notifications, setNotifications] = useState([]);
    const [loading, setLoading] = useState(false);

    const fetchNotifications = async () => {
        setLoading(true);
        try {
            // Fetch Payment Due (Invoices)
            const invoiceResponse = await request.list({ entity: 'invoice', options: { items: 100 } });
            
            const invoices = invoiceResponse.result || [];
            const currentDate = new Date();

            const overdueInvoices = invoices
                .filter(invoice => {
                     // Check if not paid and overdue
                     const isPaid = invoice.paymentStatus === 'paid';
                     if (isPaid) return false;
                     
                     if (!invoice.expiredDate) return false;
                     
                     const dueDate = new Date(invoice.expiredDate);
                     return dueDate < currentDate;
                })
                .map(invoice => ({
                    id: `inv-${invoice._id}`,
                    type: 'payment',
                    title: 'Payment Overdue',
                    description: `Invoice #${invoice.number} - ${invoice.client && invoice.client.name ? invoice.client.name : 'Unknown Client'}`,
                    timestamp: new Date(invoice.expiredDate).toLocaleDateString(),
                    read: false
                }));

            // Fetch Item Shortage (Material)
            // Call the correct entity 'material' instead of 'inventory'
            const inventoryResponse = await request.list({ entity: 'material', options: { items: 100 } });
            const inventory = inventoryResponse.result || [];
            
            const lowStockItems = inventory
                .filter(item => {
                    const stock = item.currentStock || 0;
                    const threshold = item.reorderLevel && item.reorderLevel > 0 ? item.reorderLevel : 5;
                    return stock < threshold;
                }) 
                .map(item => ({
                    id: `item-${item._id}`,
                    type: 'shortage',
                    title: 'Item Shortage',
                    description: `Material "${item.name}" is running low (Details: ${item.currentStock} ${item.unit || ''}).`,
                    timestamp: 'Now',
                    read: false
                }));

            setNotifications([...overdueInvoices, ...lowStockItems]);
        } catch (error) {
            console.error("Failed to fetch notifications:", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchNotifications();
        // Poll every 5 minutes
        const interval = setInterval(fetchNotifications, 5 * 60 * 1000);
        return () => clearInterval(interval);
    }, []);

    const unreadCount = notifications.filter(n => !n.read).length;

    const handleOpenChange = (newOpen) => {
        setOpen(newOpen);
        if (newOpen) {
            fetchNotifications();
        }
    };

    const markAsRead = (id) => {
        setNotifications(notifications.map(n => n.id === id ? { ...n, read: true } : n));
    };

    const markAllAsRead = () => {
        setNotifications(notifications.map(n => ({ ...n, read: true })));
    };

    const getIcon = (type) => {
        switch (type) {
            case 'payment':
                return <DollarCircleOutlined style={{ color: '#ff4d4f' }} />;
            case 'shortage':
                return <ShopOutlined style={{ color: '#faad14' }} />;
            default:
                return <ExclamationCircleOutlined style={{ color: '#1890ff' }} />;
        }
    };

    const notificationContent = (
        <div style={{ width: 350, maxHeight: 400, overflow: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 16px', borderBottom: '1px solid #f0f0f0' }}>
                <Text strong>Notifications</Text>
                {unreadCount > 0 && (
                    <Button type="link" size="small" onClick={markAllAsRead}>
                        Mark all as read
                    </Button>
                )}
            </div>
            
            {notifications.length > 0 ? (
                <List
                    itemLayout="horizontal"
                    dataSource={notifications}
                    loading={loading}
                    renderItem={(item) => (
                        <List.Item 
                            key={item.id}
                            style={{ 
                                padding: '12px 16px', 
                                background: item.read ? 'transparent' : (isDarkMode ? '#1f1f1f' : '#f0faff'), 
                                cursor: 'pointer',
                                transition: 'background 0.3s'
                            }}
                            className="notification-item"
                            onClick={() => markAsRead(item.id)}
                        >
                            <List.Item.Meta
                                avatar={<Avatar style={{ backgroundColor: isDarkMode ? '#333' : '#fff' }} icon={getIcon(item.type)} />}
                                title={
                                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                        <Text strong={!item.read} style={{ fontSize: '13px' }}>{item.title}</Text>
                                        <Text type="secondary" style={{ fontSize: '11px' }}>{item.timestamp}</Text>
                                    </div>
                                }
                                description={
                                    <Paragraph ellipsis={{ rows: 2 }} style={{ margin: 0, fontSize: '12px' }}>
                                        {item.description}
                                    </Paragraph>
                                }
                            />
                            {!item.read && <Badge status="processing" style={{ marginLeft: 8 }} />}
                        </List.Item>
                    )}
                />
            ) : (
                <Empty description="No notifications" image={Empty.PRESENTED_IMAGE_SIMPLE} style={{ padding: '20px 0' }} />
            )}
        </div>
    );

    return (
        <Popover
            content={notificationContent}
            title={null}
            trigger="click"
            open={open}
            onOpenChange={handleOpenChange}
            placement="bottomRight"
            overlayClassName={isDarkMode ? 'dark-popover' : ''}
        >
            <Badge count={unreadCount} size="small" offset={[-2, 2]}>
                <Button
                    type="text"
                    shape="circle"
                    icon={<BellOutlined style={{ fontSize: '18px', color: isDarkMode ? '#fff' : '#000' }} />}
                    style={{ margin: '0 8px' }}
                />
            </Badge>
        </Popover>
    );
};

export default NotificationBell;
