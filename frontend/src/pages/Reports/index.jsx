import React, { useState, useEffect, useRef } from 'react';
import { Card, DatePicker, Row, Col, Button, Space, Select, Radio, Spin, App, Empty, Divider } from 'antd';
import { DownloadOutlined, PrinterOutlined, EyeOutlined, InfoCircleOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import { request } from '@/request';
import { useAppContext } from '@/context/appContext';

const { RangePicker } = DatePicker;

export default function Reports() {
    const { message } = App.useApp();
    const { state } = useAppContext();
    const companyId = state.currentCompany;

    const iframeRef = useRef(null);

    // Main states
    const [category, setCategory] = useState('daily-summary');
    const [reportCategory, setReportCategory] = useState('all');
    const [loading, setLoading] = useState(false);
    const [pdfUrl, setPdfUrl] = useState(null);

    // Filters & Date States
    const [dateMode, setDateMode] = useState('single'); // 'single' or 'range'
    const [singleDate, setSingleDate] = useState(dayjs());
    const [rangeDate, setRangeDate] = useState([dayjs().subtract(30, 'days'), dayjs()]);

    // Dynamic Lists from Backend
    const [villas, setVillas] = useState([]);
    const [suppliers, setSuppliers] = useState([]);
    const [clients, setClients] = useState([]);
    const [bookings, setBookings] = useState([]);

    // Custom Filters
    const [selectedVilla, setSelectedVilla] = useState('all');
    const [labourSkill, setLabourSkill] = useState('all');
    const [selectedSupplier, setSelectedSupplier] = useState('all');
    const [supplierType, setSupplierType] = useState('all');
    const [selectedClient, setSelectedClient] = useState(null);
    const [selectedBooking, setSelectedBooking] = useState(null);

    // Sorting
    const [sortBy, setSortBy] = useState('date');
    const [sortOrder, setSortOrder] = useState('desc');

    // Load static items once
    useEffect(() => {
        const fetchDropdownData = async () => {
            try {
                const villasRes = await request.listAll({ entity: 'villa' });
                if (villasRes.success) {
                    setVillas(villasRes.result || []);
                }
                const suppliersRes = await request.listAll({ entity: 'supplier' });
                if (suppliersRes.success) {
                    setSuppliers(suppliersRes.result || []);
                }
                const clientsRes = await request.listAll({ entity: 'client' });
                if (clientsRes.success) {
                    setClients(clientsRes.result || []);
                }
                const bookingsRes = await request.listAll({ entity: 'booking' });
                if (bookingsRes.success) {
                    setBookings(bookingsRes.result || []);
                }
            } catch (err) {
                console.error('Failed to load list data:', err);
            }
        };
        fetchDropdownData();
    }, []);

    // Set default sort/date options when category changes
    useEffect(() => {
        // Clear old preview when switching categories
        if (pdfUrl) {
            URL.revokeObjectURL(pdfUrl);
            setPdfUrl(null);
        }

        // Apply sensible defaults
        if (category === 'daily-summary' || category === 'pettycash') {
            setDateMode('single');
        } else {
            setDateMode('range');
        }

        setReportCategory('all');

        if (category === 'daily-summary') {
            setSortBy('date');
        } else if (category === 'expense') {
            setSortBy('date');
            setSelectedVilla('all');
            setLabourSkill('all');
            setSelectedSupplier('all');
            setSupplierType('all');
        } else if (category === 'tax') {
            setSortBy('date');
        } else if (category === 'inventory') {
            setSortBy('date');
            setSelectedVilla('all');
        } else if (category === 'supplier-details') {
            if (suppliers.length > 0 && (!selectedSupplier || selectedSupplier === 'all')) {
                setSelectedSupplier(suppliers[0]._id);
            }
        } else if (category === 'customer') {
            if (!selectedClient) {
                setSelectedClient('all');
            }
        } else if (category === 'booking-details') {
            if (bookings.length > 0 && !selectedBooking) {
                setSelectedBooking(bookings[0]._id);
            }
        } else if (category === 'villa-details') {
            if (villas.length > 0 && (!selectedVilla || selectedVilla === 'all')) {
                setSelectedVilla(villas[0]._id);
            }
        }
    }, [category, suppliers, clients, bookings, villas]);

    const handlePreviewPDF = async () => {
        if (!companyId) {
            message.warning('Please select a company first');
            return;
        }

        setLoading(true);
        try {
            // Revoke old URL to avoid memory leaks
            if (pdfUrl) {
                URL.revokeObjectURL(pdfUrl);
                setPdfUrl(null);
            }

            const params = {};
            let entityPath = '';

            // Handle date parameter
            if (isDateSupported) {
                if (dateMode === 'single') {
                    params.date = singleDate.format('YYYY-MM-DD');
                } else {
                    if (!rangeDate || rangeDate.length !== 2) {
                        message.warning('Please select a date range');
                        setLoading(false);
                        return;
                    }
                    params.startDate = rangeDate[0].format('YYYY-MM-DD');
                    params.endDate = rangeDate[1].format('YYYY-MM-DD');
                }
            }

            // Bind paths and dynamic filters
            if (category === 'daily-summary') {
                entityPath = `companies/${companyId}/daily-report-pdf`;
                params.reportCategory = reportCategory;
            } else if (category === 'expense') {
                entityPath = `expense/pdf-report/${companyId}`;
                
                if (reportCategory && reportCategory !== 'all') {
                    params.recipientType = reportCategory;
                }

                if (reportCategory === 'Labour') {
                    if (selectedVilla && selectedVilla !== 'all') params.villa = selectedVilla;
                    if (labourSkill && labourSkill !== 'all') params.labourSkill = labourSkill;
                } else if (reportCategory === 'Supplier') {
                    if (selectedSupplier && selectedSupplier !== 'all') params.supplier = selectedSupplier;
                    if (supplierType && supplierType !== 'all') params.supplierType = supplierType;
                }

                params.sortBy = sortBy;
                params.sortOrder = sortOrder;
            } else if (category === 'tax') {
                entityPath = `expense/tax-report/${companyId}`;
                params.reportCategory = reportCategory;
                params.sortBy = sortBy;
                params.sortOrder = sortOrder;
            } else if (category === 'pettycash') {
                entityPath = 'pettycashtransaction/report';
                params.reportCategory = reportCategory;
            } else if (category === 'inventory') {
                entityPath = 'material/downloadReport';
                params.reportCategory = reportCategory;

                if (selectedVilla && selectedVilla !== 'all') {
                    params.villa = selectedVilla;
                }

                params.sortBy = sortBy;
                params.sortOrder = sortOrder;
            } else if (category === 'customer') {
                if (selectedClient === 'all' || !selectedClient) {
                    entityPath = 'client/report';
                } else {
                    entityPath = `customer/${selectedClient}/pdf-details`;
                }
            } else if (category === 'labour-list') {
                entityPath = 'labour/pdf-list';
                params.company = companyId;
            } else if (category === 'supplier-details') {
                if (!selectedSupplier || selectedSupplier === 'all') {
                    message.warning('Please select a supplier');
                    setLoading(false);
                    return;
                }
                entityPath = `supplier/${selectedSupplier}/pdf-details`;
            } else if (category === 'booking-details') {
                if (!selectedBooking) {
                    message.warning('Please select a booking');
                    setLoading(false);
                    return;
                }
                entityPath = `booking/${selectedBooking}/pdf-details`;
            } else if (category === 'villa-details') {
                if (!selectedVilla || selectedVilla === 'all') {
                    message.warning('Please select a villa');
                    setLoading(false);
                    return;
                }
                entityPath = `villa/report/${selectedVilla}`;
            }

            const response = await request.pdf({
                entity: entityPath,
                options: params
            });

            if (response && response.data) {
                const blob = new Blob([response.data], { type: 'application/pdf' });
                const url = URL.createObjectURL(blob);
                setPdfUrl(url);
                message.success('Report generated successfully');
            } else {
                message.error('No data returned from server');
            }

        } catch (error) {
            console.error('Failed to preview PDF:', error);
            message.error('Failed to generate report preview');
        } finally {
            setLoading(false);
        }
    };

    const handleDownloadPDF = () => {
        if (!pdfUrl) {
            message.warning('Please generate a preview first');
            return;
        }

        window.open(pdfUrl, '_blank');
    };

    const handlePrintPDF = () => {
        if (!pdfUrl || !iframeRef.current) {
            message.warning('Please generate a preview first');
            return;
        }

        try {
            iframeRef.current.contentWindow.focus();
            iframeRef.current.contentWindow.print();
        } catch (e) {
            console.warn('Direct iframe print failed, falling back to window.open:', e);
            const win = window.open(pdfUrl, '_blank');
            if (win) {
                win.focus();
                win.print();
            } else {
                message.error('Please allow popups to print report');
            }
        }
    };

    // Clean up Blob URLs on unmount
    useEffect(() => {
        return () => {
            if (pdfUrl) {
                URL.revokeObjectURL(pdfUrl);
            }
        };
    }, [pdfUrl]);

    // Options for "Category Filter" based on primary report selection
    const getReportCategoryOptions = () => {
        if (category === 'daily-summary') {
            return [
                { value: 'all', label: 'All Categories' },
                { value: 'income', label: 'Customer Collections' },
                { value: 'expense', label: 'All Expenses' },
                { value: 'labour', label: 'Labour Wages / Payments' },
                { value: 'supplier', label: 'Supplier Payments' }
            ];
        }
        if (category === 'expense') {
            return [
                { value: 'all', label: 'All Categories' },
                { value: 'Labour', label: 'Labour Payments' },
                { value: 'Supplier', label: 'Supplier Payments' },
                { value: 'Other', label: 'Other/General Expenses' }
            ];
        }
        if (category === 'tax') {
            return [
                { value: 'all', label: 'All Categories' },
                { value: 'income', label: 'Income Only' },
                { value: 'expense', label: 'Expense Only' },
                { value: 'labour', label: 'Labour Payments' },
                { value: 'supplier', label: 'Supplier Payments' }
            ];
        }
        if (category === 'pettycash') {
            return [
                { value: 'all', label: 'All Transactions' },
                { value: 'inward', label: 'Cash Received (Inward)' },
                { value: 'outward', label: 'Cash Spent (Outward)' }
            ];
        }
        if (category === 'inventory') {
            return [
                { value: 'all', label: 'All Activity' },
                { value: 'inward', label: 'Goods Received (Inward)' },
                { value: 'outward', label: 'Goods Issued (Outward)' }
            ];
        }
        return [];
    };

    // Sorting Dropdown Options based on Category
    const getSortFieldOptions = () => {
        if (category === 'expense') {
            return [
                { value: 'date', label: 'Date' },
                { value: 'amount', label: 'Amount' },
                { value: 'number', label: 'Expense ID' },
                { value: 'paymentMode', label: 'Payment Mode' }
            ];
        }
        if (category === 'tax') {
            return [
                { value: 'date', label: 'Date' },
                { value: 'amount', label: 'Amount' }
            ];
        }
        if (category === 'inventory') {
            return [
                { value: 'date', label: 'Date' },
                { value: 'quantity', label: 'Quantity' },
                { value: 'totalCost', label: 'Total Cost' },
                { value: 'ratePerUnit', label: 'Rate Per Unit' }
            ];
        }
        return [];
    };

    const isSortingSupported = ['expense', 'tax', 'inventory'].includes(category);
    const isDateSupported = !['customer', 'labour-list', 'supplier-details', 'booking-details', 'villa-details'].includes(category);
    const isSubcategorySupported = !['customer', 'labour-list', 'supplier-details', 'booking-details', 'villa-details'].includes(category);

    return (
        <div style={{ padding: '24px' }}>
            <div style={{ marginBottom: '20px' }}>
                <h1 style={{ margin: 0, fontSize: '24px', fontWeight: 600 }}>Reports Center</h1>
                <p style={{ color: '#8c8c8c', margin: '4px 0 0 0' }}>
                    Generate, preview, print, and export corporate data with dynamic sub-category filtering and sorting.
                </p>
            </div>

            <Row gutter={24}>
                {/* Left controls side panel */}
                <Col xs={24} lg={8}>
                    <Card bordered={false} style={{ borderRadius: '12px', boxShadow: '0 4px 20px rgba(0,0,0,0.05)', height: '100%' }}>
                        <Space direction="vertical" size="middle" style={{ width: '100%' }}>
                            
                            {/* Report Type Selection */}
                            <div>
                                <label style={{ fontWeight: 500, display: 'block', marginBottom: '8px' }}>Select Report</label>
                                <Select
                                    style={{ width: '100%' }}
                                    value={category}
                                    onChange={setCategory}
                                    options={[
                                        { value: 'daily-summary', label: 'Daily Expenses & Summary' },
                                        { value: 'expense', label: 'General Expense Report' },
                                        { value: 'tax', label: 'Tax & Ledger Report' },
                                        { value: 'pettycash', label: 'Petty Cash Ledger' },
                                        { value: 'inventory', label: 'Inventory / Material Activity' },
                                        { value: 'customer', label: 'Customer Report' },
                                        { value: 'labour-list', label: 'Labour List' },
                                        { value: 'supplier-details', label: 'Supplier Details Report' },
                                        { value: 'booking-details', label: 'Booking Details Report' },
                                        { value: 'villa-details', label: 'Villa Details Report' }
                                    ]}
                                />
                            </div>

                            {/* Dynamic Sub-Category Selection */}
                            {isSubcategorySupported && (
                                <div>
                                    <label style={{ fontWeight: 500, display: 'block', marginBottom: '8px' }}>Data Category</label>
                                    <Select
                                        style={{ width: '100%' }}
                                        value={reportCategory}
                                        onChange={setReportCategory}
                                        options={getReportCategoryOptions()}
                                    />
                                </div>
                            )}

                            {/* Date Selector Mode */}
                            {isDateSupported && (category === 'daily-summary' || category === 'pettycash') && (
                                <div>
                                    <label style={{ fontWeight: 500, display: 'block', marginBottom: '8px' }}>Date Mode</label>
                                    <Radio.Group 
                                        value={dateMode} 
                                        onChange={(e) => setDateMode(e.target.value)}
                                        buttonStyle="solid"
                                        style={{ width: '100%' }}
                                    >
                                        <Radio.Button value="single" style={{ width: '50%', textAlign: 'center' }}>Single Date</Radio.Button>
                                        <Radio.Button value="range" style={{ width: '50%', textAlign: 'center' }}>Date Range</Radio.Button>
                                    </Radio.Group>
                                </div>
                            )}

                            {/* Date Picker Input */}
                            {isDateSupported && (
                                <div>
                                    <label style={{ fontWeight: 500, display: 'block', marginBottom: '8px' }}>Date Selection</label>
                                    {dateMode === 'single' ? (
                                        <DatePicker 
                                            value={singleDate} 
                                            onChange={setSingleDate} 
                                            allowClear={false} 
                                            style={{ width: '100%' }} 
                                        />
                                    ) : (
                                        <RangePicker 
                                            value={rangeDate} 
                                            onChange={setRangeDate} 
                                            format="DD/MM/YYYY" 
                                            allowClear={false} 
                                            style={{ width: '100%' }} 
                                        />
                                    )}
                                </div>
                            )}

                            {/* Dynamic filters based on category and sub-category */}
                            {category === 'expense' && reportCategory === 'Labour' && (
                                <>
                                    <Divider style={{ margin: '4px 0' }} />
                                    <div>
                                        <label style={{ fontWeight: 500, display: 'block', marginBottom: '8px' }}>Villa (Labour Contract)</label>
                                        <Select
                                            style={{ width: '100%' }}
                                            value={selectedVilla}
                                            onChange={setSelectedVilla}
                                            options={[{ label: 'All Villas', value: 'all' }, ...villas.map(v => ({ label: v.villaNumber, value: v._id }))]}
                                            showSearch
                                            optionFilterProp="label"
                                        />
                                    </div>
                                    <div>
                                        <label style={{ fontWeight: 500, display: 'block', marginBottom: '8px' }}>Labour Skill</label>
                                        <Select
                                            style={{ width: '100%' }}
                                            value={labourSkill}
                                            onChange={setLabourSkill}
                                            options={[
                                                { value: 'all', label: 'All Skills' },
                                                { value: 'mason', label: 'Mason' },
                                                { value: 'electrician', label: 'Electrician' },
                                                { value: 'plumber', label: 'Plumber' },
                                                { value: 'helper', label: 'Helper' },
                                                { value: 'staff', label: 'Staff' }
                                            ]}
                                        />
                                    </div>
                                </>
                            )}

                            {category === 'expense' && reportCategory === 'Supplier' && (
                                <>
                                    <Divider style={{ margin: '4px 0' }} />
                                    <div>
                                        <label style={{ fontWeight: 500, display: 'block', marginBottom: '8px' }}>Supplier Type</label>
                                        <Select
                                            style={{ width: '100%' }}
                                            value={supplierType}
                                            onChange={setSupplierType}
                                            options={[
                                                { value: 'all', label: 'All Types' },
                                                { value: 'cement', label: 'Cement' },
                                                { value: 'aggregate', label: 'Aggregate' },
                                                { value: 'stones_bolders', label: 'Size Stones / Bolders' },
                                                { value: 'waterproofing_chemicals', label: 'Waterproofing Chemicals' },
                                                { value: 'steel', label: 'Steel' },
                                                { value: 'bricks', label: 'Bricks' },
                                                { value: 'tiles', label: 'Tiles' },
                                                { value: 'paint', label: 'Paint' },
                                                { value: 'wood', label: 'Wood' },
                                                { value: 'other', label: 'Other' }
                                            ]}
                                        />
                                    </div>
                                    <div>
                                        <label style={{ fontWeight: 500, display: 'block', marginBottom: '8px' }}>Specific Supplier</label>
                                        <Select
                                            style={{ width: '100%' }}
                                            value={selectedSupplier}
                                            onChange={setSelectedSupplier}
                                            options={[{ label: 'All Suppliers', value: 'all' }, ...suppliers.map(s => ({ label: s.name, value: s._id }))]}
                                            showSearch
                                            optionFilterProp="label"
                                        />
                                    </div>
                                </>
                            )}

                            {category === 'inventory' && (
                                <>
                                    <Divider style={{ margin: '4px 0' }} />
                                    <div>
                                        <label style={{ fontWeight: 500, display: 'block', marginBottom: '8px' }}>Villa Filter</label>
                                        <Select
                                            style={{ width: '100%' }}
                                            value={selectedVilla}
                                            onChange={setSelectedVilla}
                                            options={[{ label: 'All Villas', value: 'all' }, ...villas.map(v => ({ label: v.villaNumber, value: v._id }))]}
                                            showSearch
                                            optionFilterProp="label"
                                        />
                                    </div>
                                </>
                            )}

                            {category === 'supplier-details' && (
                                <>
                                    <Divider style={{ margin: '4px 0' }} />
                                    <div>
                                        <label style={{ fontWeight: 500, display: 'block', marginBottom: '8px' }}>Select Supplier</label>
                                        <Select
                                            style={{ width: '100%' }}
                                            value={selectedSupplier}
                                            onChange={setSelectedSupplier}
                                            options={suppliers.map(s => ({ label: s.name, value: s._id }))}
                                            showSearch
                                            placeholder="Select Supplier"
                                            optionFilterProp="label"
                                        />
                                    </div>
                                </>
                            )}

                            {category === 'customer' && (
                                <>
                                    <Divider style={{ margin: '4px 0' }} />
                                    <div>
                                        <label style={{ fontWeight: 500, display: 'block', marginBottom: '8px' }}>Select Customer</label>
                                        <Select
                                            style={{ width: '100%' }}
                                            value={selectedClient}
                                            onChange={setSelectedClient}
                                            options={[{ label: 'All Customers (Summary)', value: 'all' }, ...clients.map(c => ({ label: c.name, value: c._id }))]}
                                            showSearch
                                            placeholder="Select Customer"
                                            optionFilterProp="label"
                                        />
                                    </div>
                                </>
                            )}

                            {category === 'booking-details' && (
                                <>
                                    <Divider style={{ margin: '4px 0' }} />
                                    <div>
                                        <label style={{ fontWeight: 500, display: 'block', marginBottom: '8px' }}>Select Booking (Villa Number)</label>
                                        <Select
                                            style={{ width: '100%' }}
                                            value={selectedBooking}
                                            onChange={setSelectedBooking}
                                            options={bookings.map(b => ({ label: `${b.villaNumber || ''} - ${b.client?.name || ''}`, value: b._id }))}
                                            showSearch
                                            placeholder="Select Booking"
                                            optionFilterProp="label"
                                        />
                                    </div>
                                </>
                            )}

                            {category === 'villa-details' && (
                                <>
                                    <Divider style={{ margin: '4px 0' }} />
                                    <div>
                                        <label style={{ fontWeight: 500, display: 'block', marginBottom: '8px' }}>Select Villa</label>
                                        <Select
                                            style={{ width: '100%' }}
                                            value={selectedVilla}
                                            onChange={setSelectedVilla}
                                            options={villas.map(v => ({ label: v.villaNumber, value: v._id }))}
                                            showSearch
                                            placeholder="Select Villa"
                                            optionFilterProp="label"
                                        />
                                    </div>
                                </>
                            )}

                            {/* Sorting controls */}
                            {isSortingSupported && (
                                <>
                                    <Divider style={{ margin: '4px 0' }} />
                                    <Row gutter={16}>
                                        <Col span={12}>
                                            <label style={{ fontWeight: 500, display: 'block', marginBottom: '8px' }}>Sort By</label>
                                            <Select
                                                style={{ width: '100%' }}
                                                value={sortBy}
                                                onChange={setSortBy}
                                                options={getSortFieldOptions()}
                                            />
                                        </Col>
                                        <Col span={12}>
                                            <label style={{ fontWeight: 500, display: 'block', marginBottom: '8px' }}>Order</label>
                                            <Select
                                                style={{ width: '100%' }}
                                                value={sortOrder}
                                                onChange={setSortOrder}
                                                options={[
                                                    { value: 'desc', label: 'Descending' },
                                                    { value: 'asc', label: 'Ascending' }
                                                ]}
                                            />
                                        </Col>
                                    </Row>
                                </>
                            )}

                            {category === 'pettycash' && (
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px', backgroundColor: '#f5f5f5', borderRadius: '6px' }}>
                                    <InfoCircleOutlined style={{ color: '#096dd9' }} />
                                    <span style={{ fontSize: '12px', color: '#595959' }}>
                                        Petty cash uses chronological sorting to preserve accurate running balance.
                                    </span>
                                </div>
                            )}

                            <Divider style={{ margin: '8px 0' }} />

                            {/* Main Action buttons */}
                            <Button 
                                type="primary" 
                                size="large" 
                                icon={<EyeOutlined />} 
                                onClick={handlePreviewPDF} 
                                loading={loading}
                                style={{ width: '100%', height: '48px', borderRadius: '8px', fontWeight: 500 }}
                            >
                                Preview Report
                            </Button>

                            <Row gutter={12}>
                                <Col span={12}>
                                    <Button 
                                        type="default" 
                                        icon={<DownloadOutlined />} 
                                        onClick={handleDownloadPDF} 
                                        disabled={!pdfUrl}
                                        style={{ width: '100%', borderRadius: '6px' }}
                                    >
                                        Download
                                    </Button>
                                </Col>
                                <Col span={12}>
                                    <Button 
                                        type="default" 
                                        icon={<PrinterOutlined />} 
                                        onClick={handlePrintPDF} 
                                        disabled={!pdfUrl}
                                        style={{ width: '100%', borderRadius: '6px' }}
                                    >
                                        Print
                                    </Button>
                                </Col>
                            </Row>
                        </Space>
                    </Card>
                </Col>

                {/* Right preview display panel */}
                <Col xs={24} lg={16}>
                    <Card bordered={false} style={{ borderRadius: '12px', boxShadow: '0 4px 20px rgba(0,0,0,0.05)', minHeight: '600px', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                        {loading ? (
                            <div style={{ textAlign: 'center', padding: '100px 0' }}>
                                <Spin size="large" />
                                <div style={{ marginTop: '16px', color: '#1890ff', fontWeight: 500 }}>Generating your report...</div>
                            </div>
                        ) : pdfUrl ? (
                            <div style={{ width: '100%', height: '100%' }}>
                                <iframe 
                                    ref={iframeRef}
                                    title="Report Preview"
                                    src={pdfUrl}
                                    style={{ width: '100%', height: '700px', border: 'none', borderRadius: '8px', boxShadow: 'inset 0 0 10px rgba(0,0,0,0.05)' }}
                                />
                            </div>
                        ) : (
                            <Empty 
                                image={Empty.PRESENTED_IMAGE_DEFAULT} 
                                description={
                                    <span style={{ color: '#8c8c8c' }}>
                                        No preview generated. Select category/filters on the left and click <b>Preview Report</b>.
                                    </span>
                                }
                            />
                        )}
                    </Card>
                </Col>
            </Row>
        </div>
    );
}
