import React, { useState } from 'react';
import { Button, Upload, Modal, Spin } from 'antd';
import { CameraOutlined, LoadingOutlined } from '@ant-design/icons';
import axios from 'axios';
import { BASE_URL } from '@/config/serverApiConfig';
import { message } from '@/utils/antdGlobal';
import storePersist from '@/redux/storePersist';

export default function BillScanner({ onScanSuccess }) {
    const [loading, setLoading] = useState(false);

    const handleBeforeUpload = async (file) => {
        // Only accept images/PDFs
        const isImageOrPdf = file.type.startsWith('image/') || file.type === 'application/pdf';
        if (!isImageOrPdf) {
            message.error('You can only upload image or PDF files!');
            return Upload.LIST_IGNORE;
        }

        // Limit size to 10MB
        const isLt10M = file.size / 1024 / 1024 < 10;
        if (!isLt10M) {
            message.error('Image must be smaller than 10MB!');
            return Upload.LIST_IGNORE;
        }

        const formData = new FormData();
        formData.append('file', file);

        setLoading(true);
        message.loading({ content: 'Uploading and analyzing bill...', key: 'billscan', duration: 0 });

        try {
            // Retrieve token and company ID from storePersist / localStorage
            const auth = storePersist.get('auth');
            const token = auth?.current?.token || '';
            const currentCompany = window.localStorage.getItem('currentCompany') || '';

            const headers = {};
            if (token) {
                headers['Authorization'] = `Bearer ${token}`;
            }
            if (currentCompany) {
                headers['x-tenant-id'] = currentCompany;
            }

            const response = await axios.post(`${BASE_URL}api/bill/scan`, formData, {
                headers: {
                    'Content-Type': 'multipart/form-data',
                    ...headers
                }
            });

            if (response.data && response.data.success) {
                message.success({ content: 'Bill analyzed successfully!', key: 'billscan', duration: 3 });
                if (onScanSuccess) {
                    onScanSuccess(response.data.result);
                }
            } else {
                message.error({ content: response.data.message || 'Failed to scan bill.', key: 'billscan', duration: 4 });
            }
        } catch (error) {
            console.error('Error scanning bill:', error);
            const errMsg = error.response?.data?.message || 'An error occurred while processing the bill.';
            message.error({ content: errMsg, key: 'billscan', duration: 4 });
        } finally {
            setLoading(false);
        }

        // Prevent default upload behavior
        return false;
    };

    return (
        <>
            <Upload
                accept="image/*,application/pdf"
                showUploadList={false}
                beforeUpload={handleBeforeUpload}
                disabled={loading}
            >
                <Button
                    type="primary"
                    icon={loading ? <LoadingOutlined /> : <CameraOutlined />}
                    loading={loading}
                    style={{
                        backgroundColor: '#13c2c2',
                        borderColor: '#13c2c2',
                        fontWeight: 'bold',
                        borderRadius: '6px',
                        boxShadow: '0 2px 4px rgba(19, 194, 194, 0.2)'
                    }}
                >
                    Scan Bill with AI
                </Button>
            </Upload>

            <Modal
                open={loading}
                footer={null}
                closable={false}
                centered
                styles={{
                    body: {
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        padding: '40px 20px',
                    }
                }}
                width={350}
            >
                <Spin indicator={<LoadingOutlined style={{ fontSize: 48, color: '#13c2c2' }} spin />} />
                <div style={{ marginTop: 24, fontSize: 16, fontWeight: 500, color: '#333', textAlign: 'center' }}>
                    AI is reading your bill...
                </div>
                <div style={{ marginTop: 8, fontSize: 13, color: '#888', textAlign: 'center' }}>
                    Extracting items, rates, quantities & supplier info. This may take a few seconds.
                </div>
            </Modal>
        </>
    );
}
