import React, { useState } from 'react';
import SupplierDataTableModule from '@/modules/SupplierModule/SupplierDataTableModule';
import { Table, Tag, Button, App, Modal, Progress } from 'antd';
import { DownloadOutlined } from '@ant-design/icons';
import { request } from '@/request';

export default function SupplierList() {
    const { message } = App.useApp();
    const [downloadingId, setDownloadingId] = useState(null);
    const [progress, setProgress] = useState(0);
    const [showProgress, setShowProgress] = useState(false);
    const entity = 'supplier';
    const searchConfig = {
        entity: 'supplier',
        displayLabels: ['name', 'email'],
        searchFields: 'name,email',
        outputValue: '_id',
    };

    const PANEL_TITLE = 'Supplier List';
    const dataTableTitle = 'Supplier Lists';
    const entityDisplayLabels = ['name'];

    const readColumns = [
        {
            title: 'Supplier Name',
            dataIndex: 'name',
        },
        {
            title: 'Type',
            dataIndex: 'supplierType',
            render: (type) => {
                const typeLabels = {
                    cement: 'Cement',
                    aggregate: 'Aggregate',
                    stones_bolders: 'Size Stones / Bolders',
                    waterproofing_chemicals: 'Waterproofing Chemicals',
                    steel: 'Steel',
                    rods: 'Steel Rods',
                    bricks: 'Bricks',
                    tiles: 'Tiles',
                    electrical: 'Electrical',
                    plumbing: 'Plumbing',
                    hardware: 'Hardware',
                    paint: 'Paint',
                    wood: 'Wood',
                    glass: 'Glass',
                    sanitary: 'Sanitary',
                    other: 'Other'
                };
                if (Array.isArray(type)) {
                    return (
                        <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                            {type.map(t => (
                                <Tag color="blue" key={t}>
                                    {typeLabels[t] || (t ? t.charAt(0).toUpperCase() + t.slice(1) : '')}
                                </Tag>
                            ))}
                        </div>
                    );
                }
                return <Tag color="blue">{typeLabels[type] || (type ? type.charAt(0).toUpperCase() + type.slice(1) : '')}</Tag>;
            }
        },
        {
            title: 'Email',
            dataIndex: 'email',
        },
        {
            title: 'Phone',
            dataIndex: 'phone',
        },
        {
            title: 'City',
            dataIndex: 'city',
        },
    ];

    const dataTableColumns = [
        {
            title: 'Report',
            key: 'report',
            render: (_, record) => (
                <Button
                    icon={<DownloadOutlined />}
                    loading={downloadingId === record._id}
                    onClick={(e) => {
                        e.stopPropagation();
                        handleDownload(record);
                    }}
                />
            ),
        },
        {
            title: 'Supplier Name',
            dataIndex: 'name',
        },
        {
            title: 'Type',
            dataIndex: 'supplierType',
            render: (type) => {
                const typeLabels = {
                    cement: 'Cement',
                    aggregate: 'Aggregate',
                    stones_bolders: 'Size Stones / Bolders',
                    waterproofing_chemicals: 'Waterproofing Chemicals',
                    steel: 'Steel',
                    rods: 'Steel Rods',
                    bricks: 'Bricks',
                    tiles: 'Tiles',
                    electrical: 'Electrical',
                    plumbing: 'Plumbing',
                    hardware: 'Hardware',
                    paint: 'Paint',
                    wood: 'Wood',
                    glass: 'Glass',
                    sanitary: 'Sanitary',
                    other: 'Other'
                };
                if (Array.isArray(type)) {
                    return (
                        <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                            {type.map(t => (
                                <Tag color="blue" key={t}>
                                    {typeLabels[t] || (t ? t.charAt(0).toUpperCase() + t.slice(1) : '')}
                                </Tag>
                            ))}
                        </div>
                    );
                }
                return <Tag color="blue">{typeLabels[type] || (type ? type.charAt(0).toUpperCase() + type.slice(1) : '')}</Tag>;
            }
        },
        {
            title: 'Email',
            dataIndex: 'email',
        },
        {
            title: 'Phone',
            dataIndex: 'phone',
        },
        {
            title: 'Tax Number',
            dataIndex: 'taxNumber',
        },
        {
            title: 'Status',
            dataIndex: 'enabled',
            render: (enabled) => (
                <Tag color={enabled ? 'green' : 'red'}>{enabled ? 'Active' : 'Disabled'}</Tag>
            ),
        },
    ];

    const ADD_NEW_ENTITY = 'Add new Supplier';
    const DATATABLE_TITLE = 'Supplier List';
    const ENTITY_NAME = 'supplier';
    const CREATE_ENTITY = 'Create Supplier';
    const UPDATE_ENTITY = 'Update Supplier';

    const handleDownload = async (record) => {
        console.log('handleDownload called', record);
        setDownloadingId(record._id);
        setShowProgress(true);
        console.log('State updated: showProgress=true');
        setProgress(0);

        // Simulate progress: 0 to 95% quickly
        const timer = setInterval(() => {
            setProgress((prev) => {
                if (prev >= 95) return prev;
                return prev + 10;
            });
        }, 100);

        try {
            const response = await request.pdf({ entity: `supplier/${record._id}/pdf-details` });

            clearInterval(timer);
            setProgress(100);

            const blob = new Blob([response.data], { type: 'application/pdf' });
            const url = window.URL.createObjectURL(blob);
            window.open(url, '_blank');

            // Close modal after a short delay
            setTimeout(() => {
                setShowProgress(false);
                setDownloadingId(null);
            }, 500);

        } catch (error) {
            clearInterval(timer);
            setShowProgress(false);
            setDownloadingId(null);
            console.error(error);
            message.error('Failed to download PDF');
        }
    };

    const config = {
        entity,
        PANEL_TITLE,
        dataTableTitle,
        ENTITY_NAME,
        CREATE_ENTITY,
        ADD_NEW_ENTITY,
        UPDATE_ENTITY,
        DATATABLE_TITLE,
        readColumns,
        dataTableColumns,
        searchConfig,
        entityDisplayLabels,
        deleteModalLabels: ['name'],
    };

    console.log('SupplierList Render: showProgress =', showProgress);

    return (
        <>
            <SupplierDataTableModule config={config} />
            <Modal
                title="Generating Report"
                open={showProgress}
                footer={null}
                closable={false}
                centered
                width={400}
                styles={{ body: { padding: '20px' } }}
            >
                <div style={{ textAlign: 'center' }}>
                    <Progress type="circle" percent={progress} width={80} status={progress === 100 ? 'success' : 'active'} />
                    <div style={{ marginTop: '15px', fontSize: '13px' }}>
                        {progress < 100 ? 'Generating PDF...' : 'Report Generated!'}
                    </div>
                </div>
            </Modal>
        </>
    );
}
