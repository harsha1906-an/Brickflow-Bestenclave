import React, { useState, useEffect } from 'react';
import { Row, Col, Tabs, Card, Button, Descriptions, Tag, Spin } from 'antd';
import { DownloadOutlined } from '@ant-design/icons';
import { useParams, useNavigate } from 'react-router-dom';
import useLanguage from '@/locale/useLanguage';
import { request } from '@/request';
import { useDate } from '@/settings';
import dayjs from 'dayjs';

// Import DataTable Modules to reuse existing lists with filters
import BookingDataTableModule from '@/modules/BookingModule/BookingDataTableModule';
import InvoiceDataTableModule from '@/modules/InvoiceModule/InvoiceDataTableModule';
import PaymentDataTableModule from '@/modules/PaymentModule/PaymentDataTableModule';
// Or use specific lightweight lists if DataTable is too heavy/context-sensitive.
// For now, let's try simple tables if DataTable is strict about full page layout.
// Actually, re-using DataTable might be tricky if it expects full page context.
// Let's create simple lists for this view for better control.

import { Table } from 'antd';
import { useMoney } from '@/settings';

export default function CustomerRead() {
    const { id } = useParams();
    const translate = useLanguage();
    const navigate = useNavigate();
    const { dateFormat } = useDate();
    const { moneyFormatter } = useMoney();
    const [client, setClient] = useState(null);
    const [loading, setLoading] = useState(true);
    const [downloading, setDownloading] = useState(false);

    const handleDownload = async () => {
        setDownloading(true);
        try {
            const response = await request.pdf({ entity: `customer/${id}/pdf-details` });
            const blob = new Blob([response.data], { type: 'application/pdf' });
            const url = window.URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', `Customer_${client.name}.pdf`);
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            window.URL.revokeObjectURL(url);
        } catch (error) {
            console.error(error);
        }
        setDownloading(false);
    };

    useEffect(() => {
        const fetchClient = async () => {
            try {
                const response = await request.read({ entity: 'client', id });
                if (response.success) {
                    setClient(response.result);
                }
            } catch (e) {
                console.error(e);
            }
            setLoading(false);
        };
        fetchClient();
    }, [id]);

    if (loading) return <Spin />;
    if (!client) return <div>Client not found</div>;

    const items = [
        {
            key: '1',
            label: translate('Details'),
            children: (
                <>
                    <Descriptions title={translate('Client Info')} bordered column={2}>
                        <Descriptions.Item label={translate('Name')}>{client.name}</Descriptions.Item>
                        <Descriptions.Item label={translate('Email')}>{client.email}</Descriptions.Item>
                        <Descriptions.Item label={translate('Phone')}>{client.phone}</Descriptions.Item>
                        <Descriptions.Item label={translate('Address')}>{client.address}</Descriptions.Item>
                        <Descriptions.Item label={translate('Customer ID')}>{client.customerId}</Descriptions.Item>
                        <Descriptions.Item label={translate('Gender')}>{client.gender ? translate(client.gender) : ''}</Descriptions.Item>
                        <Descriptions.Item label={translate('Father Name')}>{client.fatherName}</Descriptions.Item>
                        <Descriptions.Item label={translate('DOB')}>{client.dob ? dayjs(client.dob).format(dateFormat) : ''}</Descriptions.Item>
                        <Descriptions.Item label={translate('Aadhar Card Number')}>{client.aadharCardNumber}</Descriptions.Item>
                        <Descriptions.Item label={translate('PAN Card Number')}>{client.panCardNumber}</Descriptions.Item>
                        <Descriptions.Item label={translate('Driving Licence')} span={2}>{client.drivingLicence}</Descriptions.Item>
                    </Descriptions>
                    <Descriptions title={translate('Nominee Details')} bordered column={2} style={{ marginTop: '20px' }}>
                        <Descriptions.Item label={translate('Nominee Name')}>{client.nomineeName}</Descriptions.Item>
                        <Descriptions.Item label={translate("Father's / Husband's Name")}>{client.nomineeFatherHusbandName}</Descriptions.Item>
                        <Descriptions.Item label={translate('Relationship')}>{client.nomineeRelationship}</Descriptions.Item>
                        <Descriptions.Item label={translate('Date of Birth')}>{client.nomineeDob ? dayjs(client.nomineeDob).format(dateFormat) : ''}</Descriptions.Item>
                        <Descriptions.Item label={translate('Mobile Number')}>{client.nomineeMobile}</Descriptions.Item>
                        <Descriptions.Item label={translate('Address')}>{client.nomineeAddress}</Descriptions.Item>
                    </Descriptions>
                </>
            ),
        },
        {
            key: '2',
            label: translate('Properties / Bookings'),
            children: <ClientBookings clientId={id} moneyFormatter={moneyFormatter} dateFormat={dateFormat} translate={translate} />,
        },
        {
            key: '4',
            label: translate('Payments'),
            children: <ClientPayments clientId={id} moneyFormatter={moneyFormatter} dateFormat={dateFormat} translate={translate} />,
        },
    ];

    return (
        <div style={{ padding: '20px' }}>
            <div style={{ marginBottom: '20px' }}>
                <Button onClick={() => navigate('/customer')}>Back to List</Button>
                <Button icon={<DownloadOutlined />} onClick={handleDownload} loading={downloading} style={{ marginLeft: '10px' }}>Download PDF</Button>
                <h2 style={{ display: 'inline-block', marginLeft: '20px' }}>{client.name}</h2>
            </div>
            <Card>
                <Tabs defaultActiveKey="1" items={items} />
            </Card>
        </div>
    );
}

function ClientBookings({ clientId, moneyFormatter, dateFormat, translate }) {
    const [data, setData] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        request.list({ entity: 'booking', options: { client: clientId } }).then((res) => {
            if (res.success) setData(res.result);
            setLoading(false);
        });
    }, [clientId]);

    const columns = [
        { title: translate('Villa'), dataIndex: ['villa', 'villaNumber'], key: 'villa' },
        { title: translate('Status'), dataIndex: 'status', key: 'status' },
        { title: translate('Total Amount'), dataIndex: 'totalAmount', key: 'totalAmount', render: (val) => moneyFormatter({ amount: val }) },
        { title: translate('Date'), dataIndex: 'created', key: 'created', render: (val) => dayjs(val).format(dateFormat) },
    ];

    return <Table dataSource={data} columns={columns} rowKey="_id" loading={loading} />;
}

function ClientInvoices({ clientId, moneyFormatter, dateFormat, translate }) {
    const [data, setData] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        request.list({ entity: 'invoice', options: { client: clientId } }).then((res) => {
            if (res.success) setData(res.result);
            setLoading(false);
        });
    }, [clientId]);

    const columns = [
        { title: translate('Number'), dataIndex: 'number', key: 'number' },
        { title: translate('Villa'), dataIndex: ['villa', 'villaNumber'], key: 'villa' },
        { title: translate('Status'), dataIndex: 'status', key: 'status' },
        { title: translate('Total'), dataIndex: 'total', key: 'total', render: (val) => moneyFormatter({ amount: val }) },
        { title: translate('Date'), dataIndex: 'date', key: 'date', render: (val) => dayjs(val).format(dateFormat) },
    ];

    return <Table dataSource={data} columns={columns} rowKey="_id" loading={loading} />;
}

function ClientPayments({ clientId, moneyFormatter, dateFormat, translate }) {
    const [data, setData] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        request.list({ entity: 'payment', options: { client: clientId } }).then((res) => {
            if (res.success) setData(res.result);
            setLoading(false);
        });
    }, [clientId]);

    const columns = [
        { title: translate('Number'), dataIndex: 'number', key: 'number' },
        { title: translate('Villa'), dataIndex: ['villa', 'villaNumber'], key: 'villa' },
        { title: translate('Payment Mode'), dataIndex: 'paymentMode', key: 'paymentMode' },
        { title: translate('Amount'), dataIndex: 'amount', key: 'amount', render: (val) => moneyFormatter({ amount: val }) },
        { title: translate('Date'), dataIndex: 'date', key: 'date', render: (val) => dayjs(val).format(dateFormat) },
    ];

    return <Table dataSource={data} columns={columns} rowKey="_id" loading={loading} />;
}
