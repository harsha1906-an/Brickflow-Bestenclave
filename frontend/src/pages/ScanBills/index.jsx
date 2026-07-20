import React, { useState, useEffect, useCallback } from 'react';
import { Card, Row, Col, Button, Form, Input, InputNumber, DatePicker, Select, Radio, App, Space, Divider, Alert, Checkbox, Table, Tag, Tooltip, Popconfirm } from 'antd';
import { SaveOutlined, FileTextOutlined, ScanOutlined, HistoryOutlined, DeleteOutlined, DownloadOutlined } from '@ant-design/icons';
import { ErpLayout } from '@/layout';
import dayjs from 'dayjs';
import { request } from '@/request';
import { useMoney } from '@/settings';
import { API_BASE_URL } from '@/config/serverApiConfig';
import SelectAsync from '@/components/SelectAsync';
import BillScanner from '@/components/BillScanner';

const { TextArea } = Input;

export default function ScanBills() {
    const { message } = App.useApp();
    const { moneyFormatter } = useMoney();
    const [form] = Form.useForm();
    
    const [scannedData, setScannedData] = useState(null);
    const [destinationType, setDestinationType] = useState('expense'); // 'expense' or 'material'
    
    // Calculator States (matching Daily Expenses form)
    const [useCalculator, setUseCalculator] = useState(false);
    const [calcRate, setCalcRate] = useState(0);
    const [calcHours, setCalcHours] = useState(0);
    const [calcBetta, setCalcBetta] = useState(0);
    const [calcExtra, setCalcExtra] = useState(0);
    const [calcAdvance, setCalcAdvance] = useState(0);
    const [calcBalance, setCalcBalance] = useState(0);

    // Watch Form Fields for dynamic layout & tax calculation
    const recipientTypeWatch = Form.useWatch('recipientType', form) || 'Supplier';
    const supplierIdWatch = Form.useWatch('supplier', form);
    const paymentTypeWatch = Form.useWatch('paymentType', form) || 'Construction';
    const taxRateWatch = Form.useWatch('taxRate', form) || 0;
    const taxTypeWatch = Form.useWatch('taxType', form) || 'CGST_SGST';
    
    const amountWatch = Form.useWatch('amount', form) || 0;
    const totalAmountWatch = Form.useWatch('totalAmount', form);
    const advanceWatch = Form.useWatch('advance', form);
    const balanceWatch = Form.useWatch('balance', form);

    const [supplierState, setSupplierState] = useState(null);
    const [taxDetails, setTaxDetails] = useState({ type: 'None', tax: 0, total: 0 });

    // History state
    const [history, setHistory] = useState([]);
    const [historyLoading, setHistoryLoading] = useState(false);

    // Available materials to select when saving as material stock
    const [materials, setMaterials] = useState([]);
    const [loadingMaterials, setLoadingMaterials] = useState(false);

    // Load materials when destination is set to material stock
    useEffect(() => {
        if (destinationType === 'material') {
            const fetchMaterials = async () => {
                setLoadingMaterials(true);
                try {
                    const res = await request.list({ entity: 'material', options: { items: 200 } });
                    if (res.success) {
                        setMaterials(res.result);
                    }
                } catch (e) {
                    console.error('Failed to load materials:', e);
                } finally {
                    setLoadingMaterials(false);
                }
            };
            fetchMaterials();
        }
    }, [destinationType]);

    // Fetch scan history (only auto-scanned bills)
    const fetchHistory = useCallback(async () => {
        setHistoryLoading(true);
        try {
            const res = await request.list({
                entity: 'expense',
                options: { page: 1, items: 50 }
            });
            if (res.success) {
                // Only keep expenses created via the bill scanner
                const scanned = (res.result || []).filter(
                    exp => exp.description && exp.description.startsWith('Auto-scanned bill')
                );
                setHistory(scanned);
            }
        } catch (e) {
            console.error('Failed to load history:', e);
        } finally {
            setHistoryLoading(false);
        }
    }, []);

    // Load history on mount
    useEffect(() => {
        fetchHistory();
    }, [fetchHistory]);

    // Delete an expense from history
    const handleDeleteExpense = async (id) => {
        try {
            const res = await request.delete({ entity: 'expense', id });
            if (res && res.success) {
                message.success('Expense deleted');
                fetchHistory();
            }
        } catch (e) {
            message.error('Failed to delete expense');
        }
    };

    // Download voucher PDF
    const handleDownloadVoucher = (id) => {
        window.open(`${API_BASE_URL}api/download/expense/expense/${id}`, '_blank');
    };

    // Fetch Supplier State (for GST location matching suggestion)
    useEffect(() => {
        if (supplierIdWatch && recipientTypeWatch === 'Supplier') {
            const fetchSupplier = async () => {
                try {
                    const data = await request.read({ entity: 'supplier', id: supplierIdWatch });
                    if (data.success && data.result) {
                        setSupplierState(data.result.state || null);
                        // Suggest IGST vs CGST_SGST if supplier state is found
                        if (data.result.state) {
                            const stateLower = data.result.state.toLowerCase();
                            const defaultLocalState = 'haryana'; // adjust if user's main workspace is elsewhere
                            if (stateLower !== defaultLocalState) {
                                form.setFieldsValue({ taxType: 'IGST' });
                            } else {
                                form.setFieldsValue({ taxType: 'CGST_SGST' });
                            }
                        }
                    }
                } catch (err) {
                    console.error('Failed to fetch supplier details:', err);
                }
            };
            fetchSupplier();
        } else {
            setSupplierState(null);
        }
    }, [supplierIdWatch, recipientTypeWatch, form]);

    // GST Calculation Logic
    useEffect(() => {
        const currentAmount = parseFloat(amountWatch) || 0;
        const currentRate = parseFloat(taxRateWatch) || 0;

        if (paymentTypeWatch === 'Construction' && currentRate > 0) {
            const taxAmount = (currentAmount * currentRate) / 100;
            const total = currentAmount + taxAmount;

            setTaxDetails({
                type: taxTypeWatch,
                tax: taxAmount,
                total,
            });

            form.setFieldsValue({
                taxAmount: taxAmount,
                totalAmount: total,
            });
        } else {
            setTaxDetails({ type: 'None', tax: 0, total: currentAmount });
            form.setFieldsValue({
                taxAmount: 0,
                taxType: 'None'
            });
            // Only overwrite totalAmount if not in 'Other' custom calculator mode
            if (recipientTypeWatch !== 'Other') {
                form.setFieldsValue({ totalAmount: currentAmount });
            }
        }
    }, [amountWatch, taxRateWatch, taxTypeWatch, paymentTypeWatch, recipientTypeWatch, form]);

    // Sync values when calculator is active
    useEffect(() => {
        if (useCalculator && recipientTypeWatch === 'Other') {
            const calculatedTotal = (calcRate || 0) * (calcHours || 0) + (calcBetta || 0) + (calcExtra || 0);
            const calculatedAmount = Math.max(0, calculatedTotal - (calcAdvance || 0) - (calcBalance || 0));
            form.setFieldsValue({ 
                amount: calculatedAmount,
                totalAmount: calculatedTotal,
                advance: calcAdvance,
                balance: calcBalance,
                betta: calcBetta,
                extra: calcExtra
            });
        }
    }, [calcRate, calcHours, calcBetta, calcExtra, calcAdvance, calcBalance, useCalculator, recipientTypeWatch, form]);

    // Sync values when calculator is NOT active (based on total - advance - balance)
    useEffect(() => {
        if (!useCalculator && recipientTypeWatch === 'Other') {
            const currentTotal = parseFloat(totalAmountWatch) || 0;
            const currentAdvance = parseFloat(advanceWatch) || 0;
            const currentBalance = parseFloat(balanceWatch) || 0;
            form.setFieldsValue({ 
                amount: Math.max(0, currentTotal - currentAdvance - currentBalance) 
            });
        }
    }, [totalAmountWatch, advanceWatch, balanceWatch, useCalculator, recipientTypeWatch, form]);

    // Handle when BillScanner returns parsed results
    const handleScanComplete = (data) => {
        if (!data) return;
        setScannedData(data);
        message.success('AI parsed the bill successfully! Review the fields below.');
    };

    // Populate form and calculator states after a scan completes
    useEffect(() => {
        if (!scannedData) return;

        const mapScannedData = async () => {
            const updates = {};
            
            // Set Date — always default to TODAY so the expense appears in current reports.
            // The bill's original date (if parsed) is preserved in the description for reference.
            updates.date = dayjs();
            const originalBillDate = scannedData.date ? dayjs(scannedData.date).format('DD/MM/YYYY') : null;

            // Reference / Bill number
            if (scannedData.invoiceNumber) {
                updates.reference = scannedData.invoiceNumber;
            }

            // Description / Notes
            let desc = `Auto-scanned bill.`;
            if (originalBillDate) {
                desc += ` Bill Date: ${originalBillDate}.`;
            }
            if (scannedData.items && scannedData.items.length > 0) {
                desc += ` Items: ` + scannedData.items.map(item => `${item.name} (${item.quantity} @ ${item.rate})`).join(', ');
            }
            updates.notes = desc;
            updates.description = desc;

            // Try to match supplier in DB
            let matchedSupplierId = null;
            if (scannedData.supplierName) {
                try {
                    const searchRes = await request.search({
                        entity: 'supplier',
                        options: { q: scannedData.supplierName, fields: 'name' }
                    });
                    if (searchRes.success && searchRes.result.length > 0) {
                        matchedSupplierId = searchRes.result[0]._id;
                    }
                } catch (err) {
                    console.error('Error finding matching supplier:', err);
                }
            }

            if (destinationType === 'expense') {
                if (matchedSupplierId) {
                    updates.recipientType = 'Supplier';
                    updates.supplier = matchedSupplierId;
                } else {
                    updates.recipientType = 'Other';
                    updates.otherRecipient = scannedData.supplierName || 'Unknown Payee';
                }

                // If items exist and recipient is Other, default to calculator mode
                if (scannedData.items && scannedData.items.length > 0) {
                    const firstItem = scannedData.items[0];
                    if (updates.recipientType === 'Other') {
                        setUseCalculator(true);
                        setCalcRate(firstItem.rate || 0);
                        setCalcHours(firstItem.quantity || 1);
                        setCalcBetta(0);
                        setCalcExtra(0);
                        setCalcAdvance(0);
                        setCalcBalance(0);
                    } else {
                        setUseCalculator(false);
                        updates.amount = scannedData.totalAmount || 0;
                        updates.totalAmount = scannedData.totalAmount || 0;
                    }
                } else {
                    setUseCalculator(false);
                    const totalVal = scannedData.totalAmount || 0;
                    updates.totalAmount = totalVal;
                    updates.amount = totalVal;
                    updates.advance = 0;
                    updates.balance = 0;
                    updates.betta = 0;
                    updates.extra = 0;
                }
            } else {
                // Material Stock View
                if (matchedSupplierId) {
                    updates.supplier = matchedSupplierId;
                }
                if (scannedData.items && scannedData.items.length > 0) {
                    const item = scannedData.items[0];
                    updates.quantity = item.quantity;
                    updates.ratePerUnit = item.rate;
                } else if (scannedData.totalAmount) {
                    updates.ratePerUnit = scannedData.totalAmount;
                    updates.quantity = 1;
                }
            }

            form.setFieldsValue(updates);
        };

        mapScannedData();
    }, [scannedData, destinationType]);

    const handleFormSubmit = async (values) => {
        try {
            let success = false;

            if (destinationType === 'expense') {
                // Submit standard General Expense
                const currentCompany = window.localStorage.getItem('currentCompany') || '';
                const payload = {
                    ...values,
                    date: values.date.format('YYYY-MM-DD'),
                    companyId: currentCompany,
                };

                const res = await request.create({
                    entity: 'expense',
                    jsonData: payload
                });

                if (res && res.success) {
                    success = true;
                    message.success('Expense voucher created successfully!');
                }
            } else {
                // Submit Material Inward / Stock adjustment
                const materialId = values.material;
                if (!materialId) {
                    message.error('Please select a material to update stock!');
                    return;
                }

                const totalCost = (values.ratePerUnit || 0) * (values.quantity || 0);

                const payload = {
                    ...values,
                    type: 'inward',
                    isDirect: false,
                    totalCost,
                    date: values.date.format('YYYY-MM-DD'),
                };

                const res = await request.post({
                    entity: `material/adjust/${materialId}`,
                    jsonData: payload
                });

                if (res && res.success) {
                    success = true;
                    message.success('Material stock inward transaction recorded successfully!');
                }
            }

            if (success) {
                // Reset form states ONLY on successful save
                form.resetFields();
                setScannedData(null);
                setUseCalculator(false);
                setCalcRate(0);
                setCalcHours(0);
                setCalcBetta(0);
                setCalcExtra(0);
                setCalcAdvance(0);
                setCalcBalance(0);
                // Refresh history table
                fetchHistory();
            }
        } catch (error) {
            console.error('Failed to submit form:', error);
            const errMsg = error.response?.data?.message || 'Error occurred while saving.';
            message.error(errMsg);
        }
    };

    return (
        <ErpLayout>
            <div style={{ padding: '10px 0' }}>
                <Row gutter={[24, 24]}>
                    <Col span={24}>
                        <Card 
                            title={
                                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                    <ScanOutlined style={{ color: '#13c2c2', fontSize: 20 }} />
                                    <span>AI Bill Scanner & Inbox</span>
                                </div>
                            }
                            extra={
                                <Button 
                                    type="primary" 
                                    htmlType="submit"
                                    icon={<SaveOutlined />} 
                                    onClick={() => form.submit()}
                                    style={{ backgroundColor: '#52c41a', borderColor: '#52c41a' }}
                                    disabled={!scannedData}
                                >
                                    Save Transaction
                                </Button>
                            }
                        >
                            {!scannedData ? (
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '24px', background: '#fafafa', borderRadius: 8 }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                                        <FileTextOutlined style={{ fontSize: 32, color: '#d9d9d9' }} />
                                        <div style={{ textAlign: 'left' }}>
                                            <h4 style={{ margin: 0 }}>No Scanned Bill Loaded</h4>
                                            <p style={{ color: '#888', margin: 0, fontSize: 13 }}>
                                                Upload or capture a photo of a bill using the AI Scanner button.
                                            </p>
                                        </div>
                                    </div>
                                    <BillScanner onScanSuccess={handleScanComplete} />
                                </div>
                            ) : (
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <Alert
                                        message="AI Scan Completed"
                                        description={
                                            <div>
                                                Parsed supplier **{scannedData.supplierName || 'Unknown'}** with total invoice value of **₹{scannedData.totalAmount || 0}**. Review and select where to save this bill.
                                            </div>
                                        }
                                        type="success"
                                        showIcon
                                        style={{ flex: 1, marginRight: 16 }}
                                    />
                                    <BillScanner onScanSuccess={handleScanComplete} label="Scan Another Bill" />
                                </div>
                            )}
                        </Card>
                    </Col>

                    {scannedData && (
                        <>
                            {/* Destination Select Card */}
                            <Col xs={24} md={8}>
                                <Card title="1. Choose Destination">
                                    <div style={{ marginBottom: 20 }}>
                                        <p style={{ fontWeight: 500 }}>Where should this bill go?</p>
                                        <Radio.Group 
                                            value={destinationType} 
                                            onChange={(e) => {
                                                setDestinationType(e.target.value);
                                                form.resetFields();
                                            }}
                                            optionType="button"
                                            buttonStyle="solid"
                                            style={{ width: '100%', display: 'flex' }}
                                        >
                                            <Radio.Button value="expense" style={{ flex: 1, textAlign: 'center' }}>General Expense</Radio.Button>
                                            <Radio.Button value="material" style={{ flex: 1, textAlign: 'center' }}>Material Stock</Radio.Button>
                                        </Radio.Group>
                                    </div>

                                    <Divider />

                                    <div style={{ background: '#fafafa', padding: 12, borderRadius: 6 }}>
                                        <div style={{ fontWeight: 'bold', marginBottom: 8 }}>Raw Extracted Data:</div>
                                        <div style={{ fontSize: 13, lineHeight: '20px' }}>
                                            <div><strong>Supplier:</strong> {scannedData.supplierName || 'N/A'}</div>
                                            <div><strong>Invoice #:</strong> {scannedData.invoiceNumber || 'N/A'}</div>
                                            <div><strong>Date:</strong> {scannedData.date || 'N/A'}</div>
                                            <div><strong>Total Value:</strong> ₹{scannedData.totalAmount || 'N/A'}</div>
                                            <div><strong>Taxes (GST):</strong> ₹{scannedData.taxAmount || 'N/A'}</div>
                                            {scannedData.items && scannedData.items.length > 0 && (
                                                <div style={{ marginTop: 6 }}>
                                                    <strong>Items Found:</strong>
                                                    <ul style={{ paddingLeft: 16, margin: 0 }}>
                                                        {scannedData.items.map((it, idx) => (
                                                            <li key={idx}>{it.name} (Qty: {it.quantity}, Rate: {it.rate})</li>
                                                        ))}
                                                    </ul>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </Card>
                            </Col>

                            {/* Form Details Card */}
                            <Col xs={24} md={16}>
                                <Card title={`2. Verify & Confirm (${destinationType === 'expense' ? 'Expense Voucher' : 'Material Inward'})`}>
                                    <Form form={form} layout="vertical" onFinish={handleFormSubmit}>
                                        {/* Hidden submit button to capture "Enter" keypress natively */}
                                        <button type="submit" style={{ display: 'none' }} />

                                        {destinationType === 'expense' ? (
                                            /* EXPENSE FORM FIELDS */
                                            <Row gutter={16}>
                                                <Col span={12}>
                                                    <Form.Item name="date" label="Expense Date" rules={[{ required: true }]}>
                                                        <DatePicker style={{ width: '100%' }} />
                                                    </Form.Item>
                                                </Col>
                                                <Col span={12}>
                                                    <Form.Item name="reference" label="Reference / Bill #">
                                                        <Input placeholder="Enter invoice/reference number" />
                                                    </Form.Item>
                                                </Col>

                                                <Col span={12}>
                                                    <Form.Item 
                                                        name="recipientType" 
                                                        label="Payee Type" 
                                                        initialValue="Supplier"
                                                        rules={[{ required: true }]}
                                                    >
                                                        <Radio.Group>
                                                            <Radio value="Supplier">Supplier</Radio>
                                                            <Radio value="Other">Other Payee</Radio>
                                                        </Radio.Group>
                                                    </Form.Item>
                                                </Col>
                                                <Col span={12}>
                                                    <div style={{ display: recipientTypeWatch === 'Supplier' ? 'block' : 'none' }}>
                                                        <Form.Item 
                                                            name="supplier" 
                                                            label="Supplier" 
                                                            rules={[{ required: recipientTypeWatch === 'Supplier', message: 'Please select a supplier' }]}
                                                        >
                                                            <SelectAsync entity="supplier" displayLabels={['name']} outputValue="_id" />
                                                        </Form.Item>
                                                    </div>
                                                    <div style={{ display: recipientTypeWatch === 'Other' ? 'block' : 'none' }}>
                                                        <Form.Item 
                                                            name="otherRecipient" 
                                                            label="Payee Name (e.g. JCB Service)" 
                                                            rules={[{ required: recipientTypeWatch === 'Other', message: 'Please enter payee name' }]}
                                                        >
                                                            <Input placeholder="Enter name of person/service" />
                                                        </Form.Item>
                                                    </div>
                                                </Col>

                                                <Col span={12}>
                                                    <Form.Item name="paymentMode" label="Payment Mode" initialValue="Cash" rules={[{ required: true }]}>
                                                        <Select options={[
                                                            { value: 'Cash', label: 'Cash' },
                                                            { value: 'Bank Transfer', label: 'Bank Transfer' },
                                                            { value: 'UPI', label: 'UPI' },
                                                            { value: 'Cheque', label: 'Cheque' },
                                                            { value: 'Card', label: 'Card' },
                                                        ]} />
                                                    </Form.Item>
                                                </Col>
                                                <Col span={12}>
                                                    <Form.Item name="transactionCode" label="Transaction / UPI No">
                                                        <Input placeholder="Enter transaction reference" />
                                                    </Form.Item>
                                                </Col>

                                                {/* GST Section for Suppliers & general categories */}
                                                <Col span={12}>
                                                    <Form.Item label="Expense Category" name="paymentType" initialValue="Construction">
                                                        <Radio.Group buttonStyle="solid">
                                                            <Radio.Button value="Construction">Construction (GST)</Radio.Button>
                                                            <Radio.Button value="Land">Land (Non-GST)</Radio.Button>
                                                            <Radio.Button value="Other">Other</Radio.Button>
                                                        </Radio.Group>
                                                    </Form.Item>
                                                </Col>

                                                {paymentTypeWatch === 'Construction' && (
                                                    <Col span={24}>
                                                        <Row gutter={16}>
                                                            <Col span={12}>
                                                                <Form.Item label="GST Rate" name="taxRate" initialValue={0}>
                                                                    <Select>
                                                                        <Select.Option value={0}>0% (Nil)</Select.Option>
                                                                        <Select.Option value={5}>5%</Select.Option>
                                                                        <Select.Option value={12}>12%</Select.Option>
                                                                        <Select.Option value={18}>18%</Select.Option>
                                                                        <Select.Option value={28}>28%</Select.Option>
                                                                    </Select>
                                                                </Form.Item>
                                                            </Col>
                                                            <Col span={12}>
                                                                <Form.Item label="GST Type" name="taxType" initialValue="CGST_SGST">
                                                                    <Radio.Group buttonStyle="solid" style={{ width: '100%' }}>
                                                                        <Radio.Button value="CGST_SGST" style={{ width: '50%', textAlign: 'center' }}>CGST + SGST</Radio.Button>
                                                                        <Radio.Button value="IGST" style={{ width: '50%', textAlign: 'center' }}>IGST</Radio.Button>
                                                                    </Radio.Group>
                                                                </Form.Item>
                                                            </Col>
                                                        </Row>
                                                        {/* Hidden fields for tax */}
                                                        <Form.Item name="taxAmount" hidden><InputNumber /></Form.Item>

                                                        {/* Tax Display */}
                                                        {amountWatch > 0 && taxDetails.type !== 'None' && (
                                                            <div style={{ background: '#fafafa', padding: '12px', borderRadius: '6px', border: '1px solid #e8e8e8', marginBottom: '15px' }}>
                                                                <div style={{ display: 'flex', justify: 'space-between', marginBottom: 5 }}>
                                                                    <span>Base Amount:</span>
                                                                    <strong>₹{amountWatch.toFixed(2)}</strong>
                                                                </div>
                                                                <div style={{ display: 'flex', justify: 'space-between', marginBottom: 5, color: '#1890ff' }}>
                                                                    <span>
                                                                        {taxDetails.type === 'IGST'
                                                                            ? `IGST (${taxRateWatch}%)`
                                                                            : `CGST (${taxRateWatch / 2}%) + SGST (${taxRateWatch / 2}%)`}
                                                                    </span>
                                                                    <strong>₹{taxDetails.tax.toFixed(2)}</strong>
                                                                </div>
                                                                <Divider style={{ margin: '5px 0' }} />
                                                                <div style={{ display: 'flex', justify: 'space-between', fontSize: '15px' }}>
                                                                    <span>Total Payable:</span>
                                                                    <strong style={{ color: '#52c41a' }}>₹{taxDetails.total.toFixed(2)}</strong>
                                                                </div>
                                                                {supplierState && (
                                                                    <div style={{ fontSize: '10px', color: '#999', marginTop: '5px' }}>
                                                                        Supplier State: {supplierState}
                                                                    </div>
                                                                )}
                                                            </div>
                                                        )}
                                                    </Col>
                                                )}

                                                {/* Hidden totalAmount field for Supplier type (populated by tax effect) */}
                                                {recipientTypeWatch !== 'Other' && (
                                                    <Form.Item name="totalAmount" hidden><InputNumber /></Form.Item>
                                                )}

                                                {/* Worker / Calculator section: Only shown for Other payee types */}
                                                <Col span={24}>
                                                    <div style={{ display: recipientTypeWatch === 'Other' ? 'block' : 'none', width: '100%' }}>
                                                        <Row gutter={16}>
                                                            <Col span={24}>
                                                                <Divider style={{ margin: '12px 0' }} />
                                                                <div style={{ marginBottom: '15px' }}>
                                                                    <Checkbox 
                                                                        checked={useCalculator} 
                                                                        onChange={(e) => setUseCalculator(e.target.checked)}
                                                                    >
                                                                        Use Hourly / Qty Calculator
                                                                    </Checkbox>
                                                                </div>
                                                            </Col>

                                                            {useCalculator && (
                                                                <Col span={24}>
                                                                    <div style={{ background: 'rgba(24, 144, 255, 0.05)', border: '1px solid rgba(24, 144, 255, 0.3)', borderRadius: '8px', padding: '15px', marginBottom: '20px' }}>
                                                                        <h4 style={{ margin: '0 0 10px 0', color: '#1890ff' }}>Hourly / Qty Calculator</h4>
                                                                        <Row gutter={16} className="mobile-horizontal">
                                                                            <Col xs={12} sm={8} className="mobile-col-inline">
                                                                                <Form.Item label="Rate per Hour/Unit" required>
                                                                                    <InputNumber
                                                                                        min={0}
                                                                                        style={{ width: '100%' }}
                                                                                        value={calcRate}
                                                                                        onChange={(val) => setCalcRate(val || 0)}
                                                                                        placeholder="Rate"
                                                                                    />
                                                                                </Form.Item>
                                                                            </Col>
                                                                            <Col xs={12} sm={8} className="mobile-col-inline">
                                                                                <Form.Item label="Hours / Quantity" required>
                                                                                    <InputNumber
                                                                                        min={0}
                                                                                        style={{ width: '100%' }}
                                                                                        value={calcHours}
                                                                                        onChange={(val) => setCalcHours(val || 0)}
                                                                                        placeholder="Hours/Qty"
                                                                                    />
                                                                                </Form.Item>
                                                                            </Col>
                                                                            <Col xs={12} sm={8} className="mobile-col-inline">
                                                                                <Form.Item label="Betta">
                                                                                    <InputNumber
                                                                                        min={0}
                                                                                        style={{ width: '100%' }}
                                                                                        value={calcBetta}
                                                                                        onChange={(val) => setCalcBetta(val || 0)}
                                                                                        placeholder="Betta"
                                                                                    />
                                                                                </Form.Item>
                                                                            </Col>
                                                                            <Col xs={12} sm={8} className="mobile-col-inline">
                                                                                <Form.Item label="Extra Charge">
                                                                                    <InputNumber
                                                                                        min={0}
                                                                                        style={{ width: '100%' }}
                                                                                        value={calcExtra}
                                                                                        onChange={(val) => setCalcExtra(val || 0)}
                                                                                        placeholder="Extra"
                                                                                    />
                                                                                </Form.Item>
                                                                            </Col>
                                                                            <Col xs={12} sm={8} className="mobile-col-inline">
                                                                                <Form.Item label="Advance">
                                                                                    <InputNumber
                                                                                        min={0}
                                                                                        style={{ width: '100%' }}
                                                                                        value={calcAdvance}
                                                                                        onChange={(val) => setCalcAdvance(val || 0)}
                                                                                        placeholder="Advance"
                                                                                    />
                                                                                </Form.Item>
                                                                            </Col>
                                                                            <Col xs={12} sm={8} className="mobile-col-inline">
                                                                                <Form.Item label="Balance">
                                                                                    <InputNumber
                                                                                        min={0}
                                                                                        style={{ width: '100%' }}
                                                                                        value={calcBalance}
                                                                                        onChange={(val) => setCalcBalance(val || 0)}
                                                                                        placeholder="Balance"
                                                                                    />
                                                                                </Form.Item>
                                                                            </Col>
                                                                        </Row>
                                                                    </div>
                                                                </Col>
                                                            )}

                                                            <Col span={8}>
                                                                <Form.Item name="totalAmount" label="Total Amount (₹)" initialValue={0} rules={[{ required: recipientTypeWatch === 'Other', message: 'Please enter Total Amount (₹)' }]}>
                                                                    <InputNumber style={{ width: '100%' }} min={0} />
                                                                </Form.Item>
                                                            </Col>
                                                            <Col span={8}>
                                                                <Form.Item name="advance" label="Advance Paid (₹)" initialValue={0}>
                                                                    <InputNumber style={{ width: '100%' }} min={0} />
                                                                </Form.Item>
                                                            </Col>
                                                            <Col span={8}>
                                                                <Form.Item name="balance" label="Balance Remaining (₹)" initialValue={0}>
                                                                    <InputNumber style={{ width: '100%' }} min={0} />
                                                                </Form.Item>
                                                            </Col>

                                                            <Col span={8}>
                                                                <Form.Item name="betta" label="Betta (₹)" initialValue={0}>
                                                                    <InputNumber style={{ width: '100%' }} min={0} />
                                                                </Form.Item>
                                                            </Col>
                                                            <Col span={8}>
                                                                <Form.Item name="extra" label="Extra (₹)" initialValue={0}>
                                                                    <InputNumber style={{ width: '100%' }} min={0} />
                                                                </Form.Item>
                                                            </Col>
                                                        </Row>
                                                    </div>
                                                </Col>

                                                <Col span={8}>
                                                    <Form.Item name="amount" label="Amount (Net Paid) (₹)" rules={[{ required: true, message: 'Please enter Net Amount (₹)' }]}>
                                                        <InputNumber style={{ width: '100%' }} min={0} disabled={useCalculator && recipientTypeWatch === 'Other'} />
                                                    </Form.Item>
                                                </Col>

                                                <Col span={24}>
                                                    <Form.Item name="description" label="Description / Notes">
                                                        <TextArea rows={2} placeholder="Details about this expense" />
                                                    </Form.Item>
                                                </Col>
                                            </Row>
                                        ) : (
                                            /* MATERIAL INWARD FORM FIELDS */
                                            <Row gutter={16}>
                                                <Col span={12}>
                                                    <Form.Item 
                                                        name="material" 
                                                        label="Material / Item" 
                                                        rules={[{ required: true, message: 'Select material to add stock to' }]}
                                                    >
                                                        <Select loading={loadingMaterials}>
                                                            {materials.map(m => (
                                                                <Select.Option key={m._id} value={m._id}>{m.name} ({m.unit})</Select.Option>
                                                            ))}
                                                        </Select>
                                                    </Form.Item>
                                                </Col>
                                                <Col span={12}>
                                                    <Form.Item 
                                                        name="supplier" 
                                                        label="Supplier"
                                                    >
                                                        <SelectAsync entity="supplier" displayLabels={['name']} outputValue="_id" />
                                                    </Form.Item>
                                                </Col>

                                                <Col span={12}>
                                                    <Form.Item name="date" label="Arrival Date" rules={[{ required: true }]}>
                                                        <DatePicker style={{ width: '100%' }} />
                                                    </Form.Item>
                                                </Col>
                                                <Col span={12}>
                                                    <Form.Item name="reference" label="Reference / Invoice No">
                                                        <Input placeholder="Enter invoice number" />
                                                    </Form.Item>
                                                </Col>

                                                <Col span={12}>
                                                    <Form.Item name="quantity" label="Quantity Received" rules={[{ required: true }]}>
                                                        <InputNumber style={{ width: '100%' }} min={0} />
                                                    </Form.Item>
                                                </Col>
                                                <Col span={12}>
                                                    <Form.Item name="ratePerUnit" label="Rate per Unit (₹)">
                                                        <InputNumber style={{ width: '100%' }} min={0} />
                                                    </Form.Item>
                                                </Col>

                                                <Col span={24}>
                                                    <Form.Item name="notes" label="Notes">
                                                        <TextArea rows={2} placeholder="Add any details about this delivery" />
                                                    </Form.Item>
                                                </Col>
                                            </Row>
                                        )}
                                    </Form>
                                </Card>
                            </Col>
                        </>
                    )}
                </Row>

                {/* Scan History Table */}
                <Card
                    title={
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                            <HistoryOutlined style={{ color: '#1890ff', fontSize: 18 }} />
                            <span>Recent Expenses</span>
                        </div>
                    }
                    style={{ marginTop: 24 }}
                    size="small"
                >
                    <Table
                        rowKey="_id"
                        loading={historyLoading}
                        dataSource={history}
                        pagination={false}
                        size="small"
                        scroll={{ x: 800 }}
                        className="mobile-card-table"
                        columns={[
                            {
                                title: '#',
                                dataIndex: 'number',
                                key: 'number',
                                width: 60,
                                render: (num) => <Tag color="blue">{num}</Tag>
                            },
                            {
                                title: 'Date',
                                dataIndex: 'date',
                                key: 'date',
                                width: 110,
                                render: (d) => d ? dayjs(d).format('DD/MM/YYYY') : '-'
                            },
                            {
                                title: 'Type',
                                dataIndex: 'recipientType',
                                key: 'recipientType',
                                width: 90,
                                render: (type) => {
                                    const colors = { Supplier: 'purple', Labour: 'orange', Other: 'cyan' };
                                    return <Tag color={colors[type] || 'default'}>{type}</Tag>;
                                }
                            },
                            {
                                title: 'Payee',
                                key: 'payee',
                                width: 160,
                                render: (_, record) => {
                                    if (record.recipientType === 'Supplier' && record.supplier) {
                                        return record.supplier.name || record.supplier.company || '-';
                                    }
                                    if (record.recipientType === 'Labour' && record.labour) {
                                        return record.labour.name || '-';
                                    }
                                    return record.otherRecipient || '-';
                                }
                            },
                            {
                                title: 'Amount (₹)',
                                dataIndex: 'amount',
                                key: 'amount',
                                width: 120,
                                render: (amt) => (
                                    <span style={{ fontWeight: 600, color: '#cf1322' }}>
                                        {moneyFormatter({ amount: amt || 0 })}
                                    </span>
                                )
                            },
                            {
                                title: 'Description',
                                dataIndex: 'description',
                                key: 'description',
                                ellipsis: true,
                                render: (desc) => (
                                    <Tooltip title={desc}>
                                        <span style={{ fontSize: 12, color: '#666' }}>{desc || '-'}</span>
                                    </Tooltip>
                                )
                            },
                            {
                                title: 'Actions',
                                key: 'actions',
                                width: 100,
                                render: (_, record) => (
                                    <Space size="small">
                                        <Tooltip title="Download Voucher">
                                            <Button
                                                type="text"
                                                size="small"
                                                icon={<DownloadOutlined />}
                                                onClick={() => handleDownloadVoucher(record._id)}
                                            />
                                        </Tooltip>
                                        <Popconfirm
                                            title="Delete this expense?"
                                            onConfirm={() => handleDeleteExpense(record._id)}
                                            okText="Yes"
                                            cancelText="No"
                                        >
                                            <Tooltip title="Delete">
                                                <Button
                                                    type="text"
                                                    size="small"
                                                    danger
                                                    icon={<DeleteOutlined />}
                                                />
                                            </Tooltip>
                                        </Popconfirm>
                                    </Space>
                                )
                            }
                        ]}
                    />
                </Card>
            </div>
        </ErpLayout>
    );
}
