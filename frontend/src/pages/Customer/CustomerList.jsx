import React, { useEffect, useState } from 'react';
import { Table, Button, Modal, Form, Input, Select, DatePicker, App, Card, Descriptions, Tag } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined, EyeOutlined, DownloadOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import useLanguage from '@/locale/useLanguage';
import { request } from '@/request';
import DynamicForm from '@/forms/DynamicForm';
import { fields } from './config';
import dayjs from 'dayjs';

const CustomerList = () => {
    const { message, modal } = App.useApp();
    const [data, setData] = useState([]);
    const [bookings, setBookings] = useState({});
    const [loading, setLoading] = useState(false);
    const [modalOpen, setModalOpen] = useState(false);
    const [editing, setEditing] = useState(null);
    const [form] = Form.useForm();
    const translate = useLanguage();

    const fetchCustomers = async () => {
        setLoading(true);
        try {
            const res = await request.list({ entity: 'client' });
            if (res.success) {
                setData(res.result);
                // Fetch bookings for each customer
                fetchBookingsForCustomers(res.result);
            }
        } catch (e) {
            message.error('Failed to load customers');
        }
        setLoading(false);
    };

    const fetchBookingsForCustomers = async (customers) => {
        try {
            const bookingMap = {};
            for (const customer of customers) {
                const res = await request.list({
                    entity: 'booking',
                    options: { client: customer._id, items: 1 }
                });
                if (res.success && res.result && res.result.length > 0) {
                    // Get the most recent booking
                    bookingMap[customer._id] = res.result[0].villa?.villaNumber || '-';
                }
            }
            setBookings(bookingMap);
        } catch (e) {
            console.error('Failed to fetch bookings', e);
        }
    };

    useEffect(() => {
        fetchCustomers();
    }, []);

    useEffect(() => {
        if (modalOpen) {
            if (editing) {
                form.setFieldsValue({
                    ...editing,
                    dob: editing.dob ? dayjs(editing.dob) : null,
                    nomineeDob: editing.nomineeDob ? dayjs(editing.nomineeDob) : null
                });
            } else {
                form.resetFields();
            }
        }
    }, [modalOpen, editing, form]);

    const openModal = (record = null) => {
        setEditing(record);
        setModalOpen(true);
    };

    const handleOk = async () => {
        try {
            const values = await form.validateFields();
            console.log('=== CUSTOMER FORM SUBMISSION ===');
            console.log('Form values:', values);

            if (editing) {
                await request.update({ entity: 'client', id: editing._id, jsonData: values });
                message.success('Customer updated');
            } else {
                console.log('Creating customer with data:', values);
                const response = await request.create({ entity: 'client', jsonData: values });
                console.log('Create response:', response);
                message.success('Customer created');
            }
            setModalOpen(false);
            fetchCustomers();
        } catch (e) {
            console.error('=== CUSTOMER SAVE ERROR ===');
            console.error('Error object:', e);
            console.error('Error response:', e.response);
            console.error('Error data:', e.response?.data);
            message.error(e.response?.data?.message || 'Failed to save customer');
        }
    };

    const handleDownloadCustomer = async (record) => {
        try {
            const response = await request.pdf({ entity: `customer/${record._id}/pdf-details` });
            const blob = new Blob([response.data], { type: 'application/pdf' });
            const url = window.URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', `Customer_${record.name}.pdf`);
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            window.URL.revokeObjectURL(url);
        } catch (error) {
            console.error(error);
            message.error('Failed to download PDF');
        }
    };

    const handleDelete = async (record) => {
        modal.confirm({
            title: 'Delete Customer',
            content: `Are you sure you want to delete ${record.name}?`,
            onOk: async () => {
                try {
                    await request.delete({ entity: 'client', id: record._id });
                    message.success('Customer deleted');
                    fetchCustomers();
                } catch (e) {
                    message.error('Failed to delete customer');
                }
            }
        });
    };

    const columns = [
        {
            title: 'Name',
            dataIndex: 'name',
            key: 'name',
            render: (text) => <strong>{text}</strong>
        },
        {
            title: 'Customer ID',
            dataIndex: 'customerId',
            key: 'customerId',
            render: (text) => text || '-'
        },
        {
            title: 'Phone',
            dataIndex: 'phone',
            key: 'phone',
        },
        {
            title: 'Booked Villa',
            key: 'villa',
            render: (_, record) => {
                const villa = bookings[record._id];
                return villa ? <Tag color="blue">{villa}</Tag> : <Tag>No Booking</Tag>;
            }
        },
        {
            title: 'Actions',
            key: 'actions',
            render: (_, record) => (
                <div style={{ display: 'flex', gap: '8px' }}>
                    <Button icon={<DownloadOutlined />} onClick={() => handleDownloadCustomer(record)} />
                    <Button icon={<EditOutlined />} onClick={() => openModal(record)} />
                    <Button danger icon={<DeleteOutlined />} onClick={() => handleDelete(record)} />
                </div>
            )
        }
    ];

    const expandedRowRender = (record) => {
        return (
            <Descriptions bordered size="small" column={2}>
                <Descriptions.Item label="Customer ID">{record.customerId || '-'}</Descriptions.Item>
                <Descriptions.Item label="Email">{record.email || '-'}</Descriptions.Item>
                <Descriptions.Item label="Gender">{record.gender || '-'}</Descriptions.Item>
                <Descriptions.Item label="Date of Birth">
                    {record.dob ? dayjs(record.dob).format('DD/MM/YYYY') : '-'}
                </Descriptions.Item>
                <Descriptions.Item label="Father's Name">{record.fatherName || '-'}</Descriptions.Item>
                <Descriptions.Item label="Address" span={2}>{record.address || '-'}</Descriptions.Item>
                <Descriptions.Item label="Aadhar Card">{record.aadharCardNumber || '-'}</Descriptions.Item>
                <Descriptions.Item label="PAN Card">{record.panCardNumber || '-'}</Descriptions.Item>
                <Descriptions.Item label="Driving Licence" span={2}>{record.drivingLicence || '-'}</Descriptions.Item>
            </Descriptions>
        );
    };


    return (
        <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                <h2 style={{ margin: 0 }}>Customer Management</h2>
                <div style={{ display: 'flex', gap: '10px' }}>
                    <Button type="primary" icon={<PlusOutlined />} onClick={() => openModal()}>
                        Add Customer
                    </Button>
                </div>
            </div>

            <Table
                rowKey="_id"
                columns={columns}
                dataSource={data}
                loading={loading}
                expandable={{
                    expandedRowRender,
                    expandIcon: ({ expanded, onExpand, record }) =>
                        expanded ? (
                            <EyeOutlined onClick={e => onExpand(record, e)} style={{ marginRight: 8, color: '#1890ff' }} />
                        ) : (
                            <EyeOutlined onClick={e => onExpand(record, e)} style={{ marginRight: 8 }} />
                        )
                }}
            />

            <Modal
                title={editing ? 'Edit Customer' : 'Add Customer'}
                open={modalOpen}
                onOk={handleOk}
                onCancel={() => setModalOpen(false)}
                destroyOnClose
                width={800}
            >
                <Form form={form} layout="vertical">
                    <DynamicForm fields={fields} />
                </Form>
            </Modal>
        </div>
    );
};

export default CustomerList;
