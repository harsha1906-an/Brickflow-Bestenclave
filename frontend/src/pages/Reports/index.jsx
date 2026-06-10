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

    // Custom Filters
    const [selectedVilla, setSelectedVilla] = useState('all');
    const [labourSkill, setLabourSkill] = useState('all');
    const [selectedSupplier, setSelectedSupplier] = useState('all');
    const [supplierType, setSupplierType] = useState('all');

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
        }
    }, [category]);

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
            if (category !== 'customer') {
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
                entityPath = 'client/report';
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

        const link = document.createElement('a');
        link.href = pdfUrl;

        let filename = `${category}_report.pdf`;
        if (category === 'daily-summary') {
            filename = `DailyReport_${dateMode === 'single' ? singleDate.format('YYYY-MM-DD') : rangeDate[0].format('YYYY-MM-DD') + '_to_' + rangeDate[1].format('YYYY-MM-DD')}.pdf`;
        } else if (category === 'expense') {
            filename = `ExpenseReport_${rangeDate[0].format('YYYY-MM-DD')}_to_${rangeDate[1].format('YYYY-MM-DD')}.pdf`;
        } else if (category === 'tax') {
            filename = `TaxReport_${rangeDate[0].format('YYYY-MM-DD')}_to_${rangeDate[1].format('YYYY-MM-DD')}.pdf`;
        } else if (category === 'pettycash') {
            filename = `PettyCashReport_${dateMode === 'single' ? singleDate.format('YYYY-MM-DD') : rangeDate[0].format('YYYY-MM-DD') + '_to_' + rangeDate[1].format('YYYY-MM-DD')}.pdf`;
        } else if (category === 'inventory') {
            filename = `InventoryReport_${rangeDate[0].format('YYYY-MM-DD')}_to_${rangeDate[1].format('YYYY-MM-DD')}.pdf`;
        } else if (category === 'customer') {
            filename = `CustomerSummary_${dayjs().format('YYYY-MM-DD')}.pdf`;
        }

        link.setAttribute('download', filename);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        message.success('Download started');
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
    const isDateSupported = category !== 'customer';
    const isSubcategorySupported = category !== 'customer';

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
                                        { value: 'customer', label: 'Customer / Client List' }
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
                                                { value: 'helper', label: 'Helper' }
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
