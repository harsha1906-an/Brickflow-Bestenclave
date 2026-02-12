import React, { useState, useEffect } from 'react';
import { Table, Card, Button, Input, Select, Tag, Popconfirm, Space } from 'antd';
import { PlusOutlined, SearchOutlined, EyeOutlined, DeleteOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { request } from '@/request';
import { message } from '@/utils/antdGlobal';
import { useUserRole } from '@/hooks/useUserRole';
import LeadCreate from './LeadCreate';

export default function LeadList() {
    const [data, setData] = useState([]);
    const [loading, setLoading] = useState(false);
    const [statusFilter, setStatusFilter] = useState('all');
    const [searchText, setSearchText] = useState('');
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

    const navigate = useNavigate();
    const { role } = useUserRole();
    const canEdit = role === 'OWNER' || role === 'ENGINEER' || role === 'MANAGER';
    const canDelete = role === 'OWNER' || role === 'MANAGER';

    useEffect(() => {
        fetchData();
        // eslint-disable-next-line
    }, []);

    const fetchData = async () => {
        setLoading(true);
        try {
            // Use listAll to get everything or list for pagination. listAll is simpler for now.
            const data = await request.listAll({ entity: 'lead' });
            if (data.success) {
                setData(data.result);
            }
        } catch (error) {
            console.error(error);
            message.error('Failed to fetch leads');
        }
        setLoading(false);
    };

    const filteredData = data.filter(item => {
        const matchesStatus = statusFilter === 'all' || item.status === statusFilter;
        const matchesSearch = item.name.toLowerCase().includes(searchText.toLowerCase()) ||
            item.phone.includes(searchText) ||
            (item.email && item.email.toLowerCase().includes(searchText.toLowerCase()));

        return matchesStatus && matchesSearch;
    });

    const columns = [
        {
            title: 'Name',
            dataIndex: 'name',
            key: 'name',
            sorter: (a, b) => a.name.localeCompare(b.name),
        },
        {
            title: 'Status',
            dataIndex: 'status',
            key: 'status',
            render: (status) => {
                let color = 'default';
                if (status === 'New') color = 'blue';
                if (status === 'Contacted') color = 'cyan';
                if (status === 'Site Visit') color = 'orange';
                if (status === 'Negotiation') color = 'purple';
                if (status === 'Converted') color = 'green';
                if (status === 'Lost') color = 'red';
                return <Tag color={color}>{status}</Tag>;
            }
        },
        {
            title: 'Phone',
            dataIndex: 'phone',
            key: 'phone',
        },
        {
            title: 'Source',
            dataIndex: 'source',
            key: 'source',
        },
        {
            title: 'Interested In',
            dataIndex: 'interestedVillaType',
            key: 'interestedVillaType',
        },
        {
            title: 'Action',
            key: 'action',
            render: (_, record) => (
                <Space>
                    <Button
                        icon={<EyeOutlined />}
                        onClick={() => navigate(`/lead/read/${record._id}`)}
                        size="small"
                    >
                        View
                    </Button>
                    {canDelete && (
                        <Popconfirm title="Delete?" onConfirm={() => handleDelete(record._id)}>
                            <Button danger icon={<DeleteOutlined />} size="small" />
                        </Popconfirm>
                    )}
                </Space>
            ),
        },
    ];

    const handleDelete = async (id) => {
        try {
            await request.delete({ entity: 'lead', id });
            message.success('Lead deleted');
            fetchData();
        } catch (e) {
            message.error('Failed to delete');
        }
    }

    return (
        <>
            <Card>
                <div style={{ marginBottom: 20, display: 'flex', justifyContent: 'space-between' }}>
                    <Space>
                        <Input
                            placeholder="Search leads..."
                            prefix={<SearchOutlined />}
                            onChange={e => setSearchText(e.target.value)}
                            style={{ width: 200 }}
                        />
                        <Select
                            defaultValue="all"
                            style={{ width: 150 }}
                            onChange={setStatusFilter}
                            options={[
                                { value: 'all', label: 'All Status' },
                                { value: 'New', label: 'New' },
                                { value: 'Contacted', label: 'Contacted' },
                                { value: 'Site Visit', label: 'Site Visit' },
                                { value: 'Negotiation', label: 'Negotiation' },
                                { value: 'Converted', label: 'Converted' },
                                { value: 'Lost', label: 'Lost' },
                            ]}
                        />
                        {/* Simple stats */}
                        <Tag color="blue">Total: {data.length}</Tag>
                        <Tag color="green">Converted: {data.filter(x => x.status === 'Converted').length}</Tag>
                    </Space>

                    {canEdit && (
                        <Button type="primary" icon={<PlusOutlined />} onClick={() => setIsCreateModalOpen(true)}>
                            Add New Lead
                        </Button>
                    )}
                </div>

                <Table
                    columns={columns}
                    dataSource={filteredData}
                    rowKey="_id"
                    loading={loading}
                    pagination={{ pageSize: 10 }}
                />
            </Card>

            {isCreateModalOpen && (
                <LeadCreate
                    open={isCreateModalOpen}
                    onCancel={() => setIsCreateModalOpen(false)}
                    onSuccess={() => {
                        setIsCreateModalOpen(false);
                        fetchData();
                    }}
                />
            )}
        </>
    );
}
