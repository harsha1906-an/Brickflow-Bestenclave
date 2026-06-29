import React, { useState, useEffect } from 'react';
import dayjs from 'dayjs';
import { request } from '@/request';
import { Form, Input, InputNumber, Select, Radio, Checkbox, Divider, Descriptions, Row, Col } from 'antd';
import { DatePicker } from 'antd';
import SelectAsync from '@/components/SelectAsync';
import { useMoney, useDate } from '@/settings';
import useLanguage from '@/locale/useLanguage';
import { useAppContext } from '@/context/appContext';
import numberToWords from '@/utils/numberToWords';
import BillScanner from '@/components/BillScanner';

export default function ExpenseForm({ maxAmount = null, isUpdateForm = false }) {
    const translate = useLanguage();
    const { TextArea } = Input;
    const money = useMoney();
    const { dateFormat } = useDate();

    const form = Form.useFormInstance();
    const { state } = useAppContext();
    const companyId = state.currentCompany;

    const [useCalculator, setUseCalculator] = useState(false);
    const [calcRate, setCalcRate] = useState(0);
    const [calcHours, setCalcHours] = useState(0);
    const [calcBetta, setCalcBetta] = useState(0);
    const [calcExtra, setCalcExtra] = useState(0);
    const [calcAdvance, setCalcAdvance] = useState(0);
    const [calcBalance, setCalcBalance] = useState(0);

    useEffect(() => {
        if (useCalculator) {
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
    }, [calcRate, calcHours, calcBetta, calcExtra, calcAdvance, calcBalance, useCalculator, form]);

    const recipientType = Form.useWatch('recipientType', form);
    const amount = Form.useWatch('amount', form);
    const supplierId = Form.useWatch('supplier', form);
    const projectId = Form.useWatch('project', form);
    const paymentType = Form.useWatch('paymentType', form);
    const taxRate = Form.useWatch('taxRate', form);

    const totalAmount = Form.useWatch('totalAmount', form);
    const advance = Form.useWatch('advance', form);
    const balance = Form.useWatch('balance', form);

    useEffect(() => {
        if (!useCalculator) {
            const currentTotal = parseFloat(totalAmount) || 0;
            const currentAdvance = parseFloat(advance) || 0;
            const currentBalance = parseFloat(balance) || 0;
            form.setFieldsValue({ amount: Math.max(0, currentTotal - currentAdvance - currentBalance) });
        }
    }, [totalAmount, advance, balance, useCalculator, form]);

    const [supplierState, setSupplierState] = useState(null);
    const [projectState, setProjectState] = useState(null);
    const [taxDetails, setTaxDetails] = useState({ type: 'None', tax: 0, total: 0 });

    // Fetch Supplier Details
    useEffect(() => {
        if (supplierId) {
            const fetchSupplier = async () => {
                const data = await request.read({ entity: 'supplier', id: supplierId });
                if (data.success) {
                    setSupplierState(data.result.state);
                }
            };
            fetchSupplier();
        } else {
            setSupplierState(null);
        }
    }, [supplierId]);

    // Fetch Project Details
    useEffect(() => {
        if (projectId) {
            const fetchProject = async () => {
                const data = await request.read({ entity: 'project', id: projectId });
                if (data.success) {
                    setProjectState(data.result.state);
                }
            };
            fetchProject();
        } else {
            setProjectState(null);
        }
    }, [projectId]);

    // Calculate Tax
    useEffect(() => {
        const currentAmount = parseFloat(amount) || 0;
        const currentRate = parseFloat(taxRate) || 0;

        if (paymentType === 'Construction' && currentRate > 0 && supplierState && projectState) {
            let type = 'IGST';
            if (supplierState.toLowerCase() === projectState.toLowerCase()) {
                type = 'CGST_SGST';
            }

            const taxAmount = (currentAmount * currentRate) / 100;
            const total = currentAmount + taxAmount;

            setTaxDetails({
                type,
                tax: taxAmount,
                total,
            });

            // Update hidden fields if any (or just rely on form submission logic to calculate backend side? 
            // Better to send calculated values to be safe, but backend should validate)
            form.setFieldsValue({
                taxAmount: taxAmount,
                totalAmount: total,
                taxType: type
            });
        } else {
            setTaxDetails({ type: 'None', tax: 0, total: currentAmount });
            form.setFieldsValue({
                taxAmount: 0,
                totalAmount: currentAmount,
                taxType: 'None'
            });
        }
    }, [amount, taxRate, paymentType, supplierState, projectState, form]);

    useEffect(() => {
        if (companyId) {
            form.setFieldsValue({ companyId });
        }
    }, [companyId, form]);

    return (
        <>
            <Form.Item name="companyId" hidden>
                <Input />
            </Form.Item>
            <Form.Item style={{ marginBottom: 20, textAlign: 'right' }}>
                <BillScanner onScanSuccess={async (data) => {
                    if (!data) return;

                    const updates = {};
                    if (data.invoiceNumber) {
                        updates.reference = data.invoiceNumber;
                    }
                    if (data.totalAmount) {
                        const baseAmount = data.totalAmount - (data.taxAmount || 0);
                        updates.amount = baseAmount;
                        updates.totalAmount = data.totalAmount;
                        if (data.taxAmount) {
                            updates.taxAmount = data.taxAmount;
                            if (baseAmount > 0) {
                                updates.taxRate = Math.round((data.taxAmount / baseAmount) * 100);
                            }
                        }
                    }
                    if (data.date) {
                        updates.date = dayjs(data.date);
                    }
                    if (data.supplierName) {
                        try {
                            const searchRes = await request.search({
                                entity: 'supplier',
                                options: { q: data.supplierName, fields: 'name' }
                            });
                            if (searchRes.success && searchRes.result.length > 0) {
                                const matchedSupplier = searchRes.result[0];
                                updates.recipientType = 'Supplier';
                                updates.supplier = matchedSupplier._id;
                            } else {
                                updates.recipientType = 'Other';
                                updates.otherRecipient = data.supplierName;
                            }
                        } catch (e) {
                            console.error('Failed to match supplier:', e);
                            updates.recipientType = 'Other';
                            updates.otherRecipient = data.supplierName;
                        }
                    }

                    let desc = `Auto-scanned bill.`;
                    if (data.items && data.items.length > 0) {
                        desc += ` Items: ` + data.items.map(item => `${item.name} (${item.quantity} @ ${item.rate})`).join(', ');
                    }
                    updates.description = desc;

                    form.setFieldsValue(updates);
                }} />
            </Form.Item>
            <Form.Item
                label={translate('number')}
                name="number"
                initialValue={1}
                rules={[
                    {
                        required: true,
                    },
                ]}
                style={{ width: '50%', float: 'left', paddingRight: '20px' }}
            >
                <InputNumber min={1} style={{ width: '100%' }} />
            </Form.Item>

            <Form.Item
                label={translate('Recipient Type')}
                name="recipientType"
                rules={[{ required: true }]}
                style={{ width: '50%', float: 'right', paddingLeft: '20px' }}
            >
                <Select>
                    <Select.Option value="Supplier">Supplier (Inventory)</Select.Option>
                    <Select.Option value="Labour">Labour (Employee)</Select.Option>
                    <Select.Option value="Other">Other</Select.Option>
                </Select>
            </Form.Item>

            {/* Dynamic Recipient Selection */}
            <div style={{ clear: 'both' }}>
                {recipientType === 'Supplier' && (
                    <Form.Item
                        label={translate('Supplier')}
                        name="supplier"
                        rules={[{ required: true, message: 'Please select a supplier' }]}
                    >
                        <SelectAsync
                            entity={'supplier'}
                            displayLabels={['name']}
                            outputValue={'_id'}
                        />
                    </Form.Item>
                )}

                {recipientType === 'Labour' && (
                    <Form.Item
                        label={translate('Labour')}
                        name="labour"
                        rules={[{ required: true, message: 'Please select a labourer' }]}
                    >
                        <SelectAsync
                            entity={'labour'}
                            displayLabels={['name']}
                            outputValue={'_id'}
                            options={{ filter: 'companyId', equal: companyId }}
                        />
                    </Form.Item>
                )}

                {recipientType === 'Labour' && (
                    <div style={{ display: 'flex', gap: '20px' }}>
                        <Form.Item label={translate('Penalty Deduction')} name="penalty" style={{ flex: 1 }}>
                            <InputNumber
                                min={0}
                                controls={false}
                                addonBefore={money.currency_position === 'before' ? money.currency_symbol : undefined}
                                style={{ width: '100%' }}
                            />
                        </Form.Item>
                        <Form.Item label={translate('Advance Deduction')} name="advance" style={{ flex: 1 }}>
                            <InputNumber
                                min={0}
                                controls={false}
                                addonBefore={money.currency_position === 'before' ? money.currency_symbol : undefined}
                                style={{ width: '100%' }}
                            />
                        </Form.Item>
                    </div>
                )}

                {recipientType === 'Other' && (
                    <>
                        <Form.Item
                            label={translate('Payee Name')}
                            name="otherRecipient"
                            rules={[{ required: true, message: 'Please enter payee name' }]}
                        >
                            <Input placeholder="e.g. Service Provider Name" />
                        </Form.Item>
                        <div style={{ display: 'flex', gap: '20px' }}>
                            <Form.Item label={translate('Total Amount')} name="totalAmount" style={{ flex: 1 }} initialValue={0}>
                                <InputNumber
                                    min={0}
                                    controls={false}
                                    addonBefore={money.currency_position === 'before' ? money.currency_symbol : undefined}
                                    style={{ width: '100%' }}
                                />
                            </Form.Item>
                        </div>
                        <div style={{ display: 'flex', gap: '20px' }}>
                            <Form.Item label={translate('Advance Paid')} name="advance" style={{ flex: 1 }} initialValue={0}>
                                <InputNumber
                                    min={0}
                                    controls={false}
                                    addonBefore={money.currency_position === 'before' ? money.currency_symbol : undefined}
                                    style={{ width: '100%' }}
                                />
                            </Form.Item>
                            <Form.Item label={translate('Balance Remaining')} name="balance" style={{ flex: 1 }} initialValue={0}>
                                <InputNumber
                                    min={0}
                                    controls={false}
                                    addonBefore={money.currency_position === 'before' ? money.currency_symbol : undefined}
                                    style={{ width: '100%' }}
                                />
                            </Form.Item>
                        </div>
                        <div style={{ display: 'flex', gap: '20px' }}>
                            <Form.Item label={translate('Betta')} name="betta" style={{ flex: 1 }} initialValue={0}>
                                <InputNumber
                                    min={0}
                                    controls={false}
                                    addonBefore={money.currency_position === 'before' ? money.currency_symbol : undefined}
                                    style={{ width: '100%' }}
                                />
                            </Form.Item>
                            <Form.Item label={translate('Extra')} name="extra" style={{ flex: 1 }} initialValue={0}>
                                <InputNumber
                                    min={0}
                                    controls={false}
                                    addonBefore={money.currency_position === 'before' ? money.currency_symbol : undefined}
                                    style={{ width: '100%' }}
                                />
                            </Form.Item>
                        </div>
                    </>
                )}
            </div>

            {/* Project Selection for Construction expenses */}
            <Form.Item
                label={'Project'}
                name="project"
            >
                <SelectAsync
                    entity={'project'}
                    displayLabels={['name']}
                    outputValue={'_id'}
                />
            </Form.Item>

            {/* Tax & Payment Type Logic */}
            <div style={{ border: '1px dashed #ccc', padding: '15px', borderRadius: '5px', marginBottom: '15px', background: '#fafafa' }}>
                <Form.Item label="Expense Category" name="paymentType" initialValue="Construction">
                    <Radio.Group buttonStyle="solid">
                        <Radio.Button value="Construction">Construction (GST)</Radio.Button>
                        <Radio.Button value="Land">Land (Non-GST)</Radio.Button>
                        <Radio.Button value="Other">Other</Radio.Button>
                    </Radio.Group>
                </Form.Item>

                {paymentType === 'Construction' && (
                    <>
                        <Form.Item label="GST Rate" name="taxRate" initialValue={0}>
                            <Select>
                                <Select.Option value={0}>0% (Nil)</Select.Option>
                                <Select.Option value={5}>5%</Select.Option>
                                <Select.Option value={12}>12%</Select.Option>
                                <Select.Option value={18}>18%</Select.Option>
                                <Select.Option value={28}>28%</Select.Option>
                            </Select>
                        </Form.Item>

                        {/* Hidden fields to store calculated values */}
                        <Form.Item name="taxAmount" hidden><InputNumber /></Form.Item>
                        {recipientType !== 'Other' && <Form.Item name="totalAmount" hidden><InputNumber /></Form.Item>}
                        <Form.Item name="taxType" hidden><Input /></Form.Item>

                        {/* Tax Breakdown Display */}
                        {amount > 0 && taxDetails.type !== 'None' && (
                            <div style={{ background: '#fff', padding: '10px', borderRadius: '4px', border: '1px solid #eee' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px' }}>
                                    <span>Base Amount:</span>
                                    <strong>{money.amountFormatter({ amount: amount })}</strong>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px', color: '#1890ff' }}>
                                    <span>
                                        {taxDetails.type === 'IGST'
                                            ? `IGST (${taxRate}%)`
                                            : `CGST (${taxRate / 2}%) + SGST (${taxRate / 2}%)`}
                                    </span>
                                    <strong>{money.amountFormatter({ amount: taxDetails.tax })}</strong>
                                </div>
                                <Divider style={{ margin: '5px 0' }} />
                                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '16px' }}>
                                    <span>Total Payable:</span>
                                    <strong style={{ color: '#52c41a' }}>{money.amountFormatter({ amount: taxDetails.total })}</strong>
                                </div>
                                <div style={{ fontSize: '10px', color: '#999', marginTop: '5px' }}>
                                    POS: {projectState || 'Select Project'} | Supplier State: {supplierState || 'Select Supplier'}
                                </div>
                            </div>
                        )}
                    </>
                )}
            </div>

            <Form.Item
                name="date"
                label={translate('date')}
                rules={[
                    {
                        required: true,
                        type: 'object',
                    },
                ]}
                initialValue={dayjs()}
                style={{ width: '100%' }}
            >
                <DatePicker format={dateFormat} style={{ width: '100%' }} />
            </Form.Item>

            <div style={{ marginBottom: '15px' }}>
                <Checkbox 
                    checked={useCalculator} 
                    onChange={(e) => setUseCalculator(e.target.checked)}
                >
                    Use Hourly / Qty Calculator
                </Checkbox>
            </div>

            {useCalculator && (
                <div style={{ background: 'rgba(24, 144, 255, 0.05)', border: '1px solid rgba(24, 144, 255, 0.3)', borderRadius: '8px', padding: '15px', marginBottom: '20px' }}>
                    <h4 style={{ margin: '0 0 10px 0', color: '#1890ff' }}>Hourly / Qty Calculator</h4>
                    <Row gutter={16} style={{ marginBottom: '10px' }}>
                        <Col span={12}>
                            <Form.Item label="Rate per Hour/Unit" required style={{ marginBottom: 0 }}>
                                <InputNumber
                                    min={0}
                                    style={{ width: '100%' }}
                                    value={calcRate}
                                    onChange={(val) => setCalcRate(val || 0)}
                                    placeholder="Rate"
                                />
                            </Form.Item>
                        </Col>
                        <Col span={12}>
                            <Form.Item label="Hours / Quantity" required style={{ marginBottom: 0 }}>
                                <InputNumber
                                    min={0}
                                    style={{ width: '100%' }}
                                    value={calcHours}
                                    onChange={(val) => setCalcHours(val || 0)}
                                    placeholder="Hours / Qty"
                                />
                            </Form.Item>
                        </Col>
                    </Row>
                    <Row gutter={16} style={{ marginBottom: '10px' }}>
                        <Col span={12}>
                            <Form.Item label="Betta" style={{ marginBottom: 0 }}>
                                <InputNumber
                                    min={0}
                                    style={{ width: '100%' }}
                                    value={calcBetta}
                                    onChange={(val) => setCalcBetta(val || 0)}
                                    placeholder="Betta"
                                />
                            </Form.Item>
                        </Col>
                        <Col span={12}>
                            <Form.Item label="Extra Charge" style={{ marginBottom: 0 }}>
                                <InputNumber
                                    min={0}
                                    style={{ width: '100%' }}
                                    value={calcExtra}
                                    onChange={(val) => setCalcExtra(val || 0)}
                                    placeholder="Extra"
                                />
                            </Form.Item>
                        </Col>
                    </Row>
                    <Row gutter={16}>
                        <Col span={12}>
                            <Form.Item label="Advance" style={{ marginBottom: 0 }}>
                                <InputNumber
                                    min={0}
                                    style={{ width: '100%' }}
                                    value={calcAdvance}
                                    onChange={(val) => setCalcAdvance(val || 0)}
                                    placeholder="Advance"
                                />
                            </Form.Item>
                        </Col>
                        <Col span={12}>
                            <Form.Item label="Balance" style={{ marginBottom: 0 }}>
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
            )}

            <Form.Item label={translate('amount')} name="amount" rules={[{ required: true }]}>
                <InputNumber
                    className="moneyInput"
                    min={0}
                    controls={false}
                    max={maxAmount}
                    addonAfter={money.currency_position === 'after' ? money.currency_symbol : undefined}
                    addonBefore={money.currency_position === 'before' ? money.currency_symbol : undefined}
                    style={{ width: '100%' }}
                />
                {amount > 0 && (
                    <div style={{ color: '#aaa', fontSize: '12px', marginTop: '5px', fontStyle: 'italic' }}>
                        {numberToWords(amount)}
                    </div>
                )}
            </Form.Item>

            <Form.Item
                label={translate('Payment Mode')}
                name="paymentMode"
                rules={[{ required: true }]}
            >
                <Select>
                    <Select.Option value="Cash">Cash</Select.Option>
                    <Select.Option value="Bank Transfer">Bank Transfer</Select.Option>
                    <Select.Option value="Card">Card</Select.Option>
                    <Select.Option value="UPI">UPI</Select.Option>
                    <Select.Option value="Cheque">Cheque</Select.Option>
                </Select>
            </Form.Item>

            <Form.Item
                noStyle
                shouldUpdate={(prevValues, currentValues) => prevValues.paymentMode !== currentValues.paymentMode}
            >
                {({ getFieldValue }) => {
                    const paymentMode = getFieldValue('paymentMode');
                    return paymentMode && paymentMode !== 'Cash' ? (
                        <Form.Item
                            label={translate('Transaction ID / Reference')}
                            name="reference"
                            rules={[{ required: true, message: 'Reference is required' }]}
                        >
                            <Input />
                        </Form.Item>
                    ) : null;
                }}
            </Form.Item>

            <Form.Item label={translate('Description')} name="description">
                <TextArea rows={4} />
            </Form.Item>
        </>
    );
}
