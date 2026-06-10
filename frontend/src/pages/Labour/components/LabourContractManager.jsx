import React, { useState, useEffect } from 'react';
import { Modal, Form, Input, InputNumber, Button, Divider, Row, Col, Table, Tag, Space, App, Typography, Checkbox, theme, Select } from 'antd';
import axios from 'axios';
import useMoney from '@/settings/useMoney';
import { PlusOutlined, DeleteOutlined, SaveOutlined, FilePdfOutlined } from '@ant-design/icons';
import { BASE_URL } from '@/config/serverApiConfig';
import { request } from '@/request';
import useLanguage from '@/locale/useLanguage';
import SelectAsync from '@/components/SelectAsync';
import storePersist from '@/redux/storePersist';
import numberToWords from '@/utils/numberToWords';

const { Text, Title } = Typography;

const LabourContractManager = ({ visible, onCancel, labour }) => {
    const { token } = theme.useToken();
    const { message } = App.useApp();
    const translate = useLanguage();
    const { moneyFormatter, currency_symbol, inputFormatter, inputParser } = useMoney();
    const [form] = Form.useForm();
    const [contracts, setContracts] = useState([]);
    const [loading, setLoading] = useState(false);
    const [addingContract, setAddingContract] = useState(false);

    const [completionModalOpen, setCompletionModalOpen] = useState(false);
    const [completingData, setCompletingData] = useState(null);
    const [completionForm] = Form.useForm();
    const [lastCreatedExpense, setLastCreatedExpense] = useState(null);

    const fetchContracts = async () => {
        if (!labour?._id) return;
        setLoading(true);
        try {
            const res = await request.list({
                entity: 'labourcontract',
                options: {
                    filter: 'labour',
                    equal: labour._id
                }
            });
            if (res.success) {
                setContracts(res.result);
            }
        } catch (e) {
            message.error('Failed to load contracts');
        }
        setLoading(false);
    };

    useEffect(() => {
        if (visible && labour?._id) {
            // Clear previous labour's contracts first
            setContracts([]);
            fetchContracts();
        }
        // Clear contracts when modal closes
        if (!visible) {
            setContracts([]);
        }
    }, [visible, labour?._id]);

    useEffect(() => {
        if (completionModalOpen && completingData) {
            completionForm.setFieldsValue({
                amount: completingData.milestone.amount,
                advanceDeduction: 0,
                penalty: 0,
                netAmount: completingData.milestone.amount,
                paymentMode: 'Cash',
                reference: ''
            });
        }
    }, [completionModalOpen, completingData, completionForm]);

    const handleVillaChange = async (villaId) => {
        if (!villaId) return;
        try {
            const res = await request.read({ entity: 'villa', id: villaId });
            if (res.success && res.result) {
                const villa = res.result;
                form.setFieldsValue({
                    groundFloorArea: villa.groundFloorArea || 0,
                    firstFloorArea: villa.firstFloorArea || 0,
                    secondFloorArea: villa.secondFloorArea || 0,
                    totalSqft: (villa.groundFloorArea || 0) + (villa.firstFloorArea || 0) + (villa.secondFloorArea || 0),
                });
                calculateTotal();
            }
        } catch (e) {
            message.error('Failed to fetch villa details');
        }
    };

    const calculateTotal = () => {
        const rate = form.getFieldValue('ratePerSqft') || 0;
        const totalSqft = form.getFieldValue('totalSqft') || 0;
        form.setFieldsValue({ totalAmount: rate * totalSqft });
        updateMilestoneAmounts(rate * totalSqft);
    };

    const updateMilestoneAmounts = (total) => {
        const milestones = form.getFieldValue('milestones') || [];
        const updated = milestones.map(m => ({
            ...m,
            amount: Math.round((total * (m.percentage || 0)) / 100)
        }));
        form.setFieldsValue({ milestones: updated });
    };

    const onSaveContract = async () => {
        try {
            const values = await form.validateFields();
            const payload = {
                ...values,
                labour: labour._id,
                companyId: labour.companyId,
            };

            const res = await request.create({ entity: 'labourcontract', jsonData: payload });
            if (res.success) {
                message.success('Contract added');
                setAddingContract(false);
                form.resetFields();
                fetchContracts();
            }
        } catch (e) {
            message.error('Please check form fields');
        }
    };

    const openCompletionModal = (contract, index) => {
        const milestone = contract.milestones[index];
        if (milestone.isCompleted) {
            // If already completed, just uncheck it
            toggleMilestone(contract, index, { isCompleted: false });
        } else {
            setCompletingData({ contract, index, milestone });
            setCompletionModalOpen(true);
        }
    };

    const handleCompletionOk = async () => {
        try {
            const values = await completionForm.validateFields();
            const { contract, index, milestone } = completingData;

            // 1. Create Expense First
            const expensePayload = {
                companyId: contract.companyId,
                number: Math.floor(Date.now() / 1000),
                date: new Date(),
                recipientType: 'Labour',
                labour: contract.labour._id || contract.labour,
                villa: contract.villa._id || contract.villa,
                amount: values.netAmount,
                description: `Labour Contract Payment | Villa: ${contract.villa?.villaNumber || 'N/A'} | Stage: ${milestone.name}`,
                paymentMode: values.paymentMode,
                reference: values.reference,
                penalty: values.penalty || 0,
                advance: values.advanceDeduction || 0
            };

            console.log('Creating labour expense with payload:', expensePayload);
            const expenseRes = await request.create({ entity: 'expense', jsonData: expensePayload });

            if (expenseRes.success) {
                console.log('Expense created successfully:', expenseRes.result);
                message.success('Expense record created automatically');
                const createdExpense = expenseRes.result;
                setLastCreatedExpense(createdExpense);

                // 2. Update Milestone with completion details and expenseId
                const milestoneUpdate = {
                    isCompleted: true,
                    advanceDeduction: values.advanceDeduction || 0,
                    penalty: values.penalty || 0,
                    netAmount: values.netAmount || 0,
                    completionDate: new Date(),
                    paymentMode: values.paymentMode,
                    reference: values.reference,
                    expenseId: createdExpense._id
                };

                await toggleMilestone(contract, index, milestoneUpdate);
                message.success('Expense logged and milestone completed');
                setCompletionModalOpen(false);
            } else {
                console.error('Failed to create expense:', expenseRes);
                message.error('Failed to create expense record. Please check console.');
                // Do not complete the milestone if expense creation failed
            }
        } catch (e) {
            console.error(e);
            message.error('Please check all fields');
        }
    };


    const handleDownloadVoucher = async (expenseId) => {
        if (!expenseId) return;
        try {
            message.loading({ content: 'Generating Voucher...', key: 'voucher_download' });
            
            // Get auth token
            const auth = storePersist.get('auth');
            const token = auth?.current?.token;
            
            // Dynamic URL based on environment (localhost vs prod)
            // Points to /download/expense/...
            const downloadUrl = `${BASE_URL}download/expense/expense-${expenseId}.pdf`;
            
            const response = await fetch(downloadUrl, {
                headers: {
                    'Authorization': token ? `Bearer ${token}` : '',
                    'ngrok-skip-browser-warning': 'true',
                },
            });
            
            if (!response.ok) {
                throw new Error('Failed to download voucher');
            }
            
            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', `Labour_Cost_Voucher_${expenseId}.pdf`);
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            window.URL.revokeObjectURL(url);
            
            message.success({ content: 'Voucher Downloaded', key: 'voucher_download' });
        } catch (error) {
            console.error('Voucher download error:', error);
            message.error({ content: 'Failed to download voucher.', key: 'voucher_download' });
        }
    };

    const toggleMilestone = async (contract, milestoneIndex, updateData) => {
        const updatedMilestones = [...contract.milestones];
        updatedMilestones[milestoneIndex] = {
            ...updatedMilestones[milestoneIndex],
            ...updateData
        };

        try {
            const res = await request.patch({
                entity: `labourcontract/update/${contract._id}`,
                jsonData: { milestones: updatedMilestones }
            });
            if (res.success) {
                message.success('Milestone updated');
                fetchContracts();
                return res;
            }
        } catch (e) {
            message.error('Failed to update milestone');
        }
        return null;
    };

    const columns = [
        {
            title: 'Villa',
            dataIndex: ['villa', 'villaNumber'],
            key: 'villa',
            render: (text, record) => <Text strong>{text || record.villa?.villaNumber}</Text>
        },
        {
            title: 'Total Sqft',
            dataIndex: 'totalSqft',
            key: 'totalSqft',
            render: (val) => `${val} sqft`
        },
        {
            title: 'Rate',
            dataIndex: 'ratePerSqft',
            key: 'rate',
            render: (val) => `${currency_symbol}${val}/sqft`
        },
        {
            title: 'Total Amount',
            dataIndex: 'totalAmount',
            key: 'totalAmount',
            render: (val) => <Text type="success" strong>{moneyFormatter({ amount: val })}</Text>
        },
        {
            title: 'Progress',
            key: 'progress',
            render: (_, record) => {
                const completed = record.milestones.filter(m => m.isCompleted).length;
                const total = record.milestones.length;
                return <Tag color={completed === total ? 'green' : 'blue'}>{completed}/{total} Milestones</Tag>;
            }
        }
    ];

    return (
        <Modal
            title={`Contract Management: ${labour?.name}`}
            open={visible}
            onCancel={onCancel}
            footer={null}
            width={1000}
            destroyOnClose
        >
            <div style={{ marginBottom: 24 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                    <Title level={5}>Active Villa Contracts</Title>
                    {!addingContract && (
                        <Button type="primary" icon={<PlusOutlined />} onClick={() => {
                            setAddingContract(true);
                            const plan = labour?.milestonePlan || [
                                'Basement Level',
                                'Slab Completion',
                                'Brick Work',
                                'Plastering',
                                'Finishing'
                            ];
                            const defaultPercentages = [20, 30, 20, 20, 10];
                            form.setFieldsValue({
                                milestones: plan.map((name, i) => ({
                                    name: name,
                                    percentage: defaultPercentages[i] || 0,
                                    amount: 0
                                }))
                            });
                        }}>
                            Add New Villa Contract
                        </Button>
                    )}
                </div>

                {addingContract && (
                    <div style={{ background: token.colorFillAlter, padding: 24, borderRadius: 8, marginBottom: 24, border: `1px solid ${token.colorBorderSecondary}` }}>
                        <Title level={5}>New Contract Details</Title>
                        <Form form={form} layout="vertical" onValuesChange={(changed) => {
                            if (changed.ratePerSqft !== undefined || changed.totalSqft !== undefined) {
                                calculateTotal();
                            }
                            if (changed.milestones) {
                                const total = form.getFieldValue('totalAmount') || 0;
                                updateMilestoneAmounts(total);
                            }
                        }}>
                            <Row gutter={16}>
                                <Col span={8}>
                                    <Form.Item name="villa" label="Select Villa" rules={[{ required: true }]}>
                                        <SelectAsync entity="villa" displayLabels={['villaNumber']} onChange={handleVillaChange} />
                                    </Form.Item>
                                </Col>
                                <Col span={4}>
                                    <Form.Item name="groundFloorArea" label="GF Sqft">
                                        <InputNumber disabled style={{ width: '100%' }} />
                                    </Form.Item>
                                </Col>
                                <Col span={4}>
                                    <Form.Item name="firstFloorArea" label="1F Sqft">
                                        <InputNumber disabled style={{ width: '100%' }} />
                                    </Form.Item>
                                </Col>
                                <Col span={4}>
                                    <Form.Item name="secondFloorArea" label="2F Sqft">
                                        <InputNumber disabled style={{ width: '100%' }} />
                                    </Form.Item>
                                </Col>
                                <Col span={4}>
                                    <Form.Item name="totalSqft" label="Total Sqft">
                                        <InputNumber disabled style={{ width: '100%' }} />
                                    </Form.Item>
                                </Col>
                                <Col span={4}>
                                    <Form.Item name="ratePerSqft" label="Rate / Sqft" rules={[{ required: true }]}>
                                        <InputNumber
                                            style={{ width: '100%' }}
                                            prefix={currency_symbol}
                                            formatter={inputFormatter}
                                            parser={inputParser}
                                        />
                                    </Form.Item>
                                </Col>
                            </Row>

                            <Row gutter={16}>
                                <Col span={8}>
                                    <Form.Item
                                        noStyle
                                        shouldUpdate={(prev, curr) => prev.totalAmount !== curr.totalAmount}
                                    >
                                        {({ getFieldValue }) => {
                                            const totalAmount = getFieldValue('totalAmount') || 0;
                                            return (
                                                <Form.Item
                                                    name="totalAmount"
                                                    label="Total Contract Value"
                                                    extra={totalAmount > 0 ? <div style={{ fontSize: '12px', fontStyle: 'italic', color: '#888', marginTop: '5px' }}>{numberToWords(totalAmount)}</div> : null}
                                                >
                                                    <InputNumber
                                                        disabled
                                                        style={{ width: '100%', fontWeight: 'bold' }}
                                                        prefix={currency_symbol}
                                                        formatter={inputFormatter}
                                                        parser={inputParser}
                                                    />
                                                </Form.Item>
                                            );
                                        }}
                                    </Form.Item>
                                </Col>
                            </Row>

                            <Divider orientation="left">Payment Milestones</Divider>
                            <Form.List
                                name="milestones"
                            >
                                {(fields, { add, remove }) => (
                                    <>
                                        {fields.map(({ key, name, ...restField }) => (
                                            <Row gutter={16} key={key} align="middle">
                                                <Col span={10}>
                                                    <Form.Item
                                                        {...restField}
                                                        name={[name, 'name']}
                                                        rules={[{ required: true, message: 'Missing stage name' }]}
                                                    >
                                                        <Input placeholder="Stage Name" />
                                                    </Form.Item>
                                                </Col>
                                                <Col span={4}>
                                                    <Form.Item
                                                        {...restField}
                                                        name={[name, 'percentage']}
                                                        rules={[{ required: true, message: 'Missing %' }]}
                                                    >
                                                        <InputNumber placeholder="%" min={0} max={100} style={{ width: '100%' }} formatter={v => `${v}%`} parser={v => v.replace('%', '')} />
                                                    </Form.Item>
                                                </Col>
                                                <Col span={6}>
                                                    <Form.Item
                                                        shouldUpdate={(prev, curr) => prev.milestones !== curr.milestones}
                                                        style={{ marginBottom: 0 }}
                                                    >
                                                        {({ getFieldValue }) => {
                                                            const milestones = getFieldValue('milestones');
                                                            const milestoneAmount = milestones && milestones[name] ? milestones[name].amount : 0;
                                                            return (
                                                                <Form.Item
                                                                    {...restField}
                                                                    name={[name, 'amount']}
                                                                    help={milestoneAmount ? <span style={{ fontSize: '10px', color: '#888', fontStyle: 'italic' }}>{numberToWords(milestoneAmount)}</span> : null}
                                                                >
                                                                    <InputNumber
                                                                        disabled
                                                                        prefix={currency_symbol}
                                                                        style={{ width: '100%' }}
                                                                        formatter={inputFormatter}
                                                                        parser={inputParser}
                                                                    />
                                                                </Form.Item>
                                                            );
                                                        }}
                                                    </Form.Item>
                                                </Col>
                                                <Col span={2}>
                                                    <Button type="text" danger icon={<DeleteOutlined />} onClick={() => remove(name)} />
                                                </Col>
                                            </Row>
                                        ))}
                                        <Button type="dashed" onClick={() => add()} block icon={<PlusOutlined />}>
                                            Add Milestone
                                        </Button>
                                    </>
                                )}
                            </Form.List>

                            {/* Percentage Validation */}
                            <Form.Item noStyle shouldUpdate>
                                {() => {
                                    const milestones = form.getFieldValue('milestones') || [];
                                    const totalPercentage = milestones.reduce((sum, m) => sum + (parseFloat(m?.percentage) || 0), 0);
                                    const remaining = 100 - totalPercentage;

                                    const isValid = Math.abs(totalPercentage - 100) < 0.01; // Allow tiny floating point errors

                                    return (
                                        <div style={{
                                            marginTop: 16,
                                            padding: 12,
                                            background: isValid ? token.colorSuccessBg : token.colorWarningBg,
                                            border: `1px solid ${isValid ? token.colorSuccessBorder : token.colorWarningBorder}`,
                                            borderRadius: 4
                                        }}>
                                            <Space direction="vertical" size={4}>
                                                <Text strong style={{ color: isValid ? token.colorSuccess : token.colorWarning }}>
                                                    Total Percentage: {totalPercentage.toFixed(2)}%
                                                </Text>
                                                {!isValid && (
                                                    <Text type="warning">
                                                        {remaining > 0
                                                            ? `⚠️ ${remaining.toFixed(2)}% remaining to reach 100%`
                                                            : `⚠️ Exceeded by ${Math.abs(remaining).toFixed(2)}%`}
                                                    </Text>
                                                )}
                                                {isValid && (
                                                    <Text type="success">✓ Milestones add up to 100%</Text>
                                                )}
                                            </Space>
                                        </div>
                                    );
                                }}
                            </Form.Item>

                            <div style={{ marginTop: 24, display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
                                <Button onClick={() => setAddingContract(false)}>Cancel</Button>
                                <Button type="primary" icon={<SaveOutlined />} onClick={onSaveContract}>Save Contract</Button>
                            </div>
                        </Form>
                    </div>
                )}

                <Table
                    rowKey="_id"
                    columns={columns}
                    dataSource={contracts}
                    loading={loading}
                    expandable={{
                        expandedRowRender: (record) => (
                            <div style={{ padding: '8px 48px' }}>
                                <Title level={5}>Milestone Tracking</Title>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                                    {record.milestones.map((m, index) => (
                                        <div key={index} style={{
                                            padding: 12,
                                            border: `1px solid ${token.colorBorderSecondary}`,
                                            borderRadius: 4,
                                            display: 'flex',
                                            justifyContent: 'space-between',
                                            alignItems: 'center',
                                            background: m.isCompleted ? token.colorSuccessBg : token.colorBgContainer
                                        }}>
                                            <div>
                                                <Text strong>{m.name}</Text>
                                                <br />
                                                <Text type="secondary">{m.percentage}% - Base: {moneyFormatter({ amount: m.amount })}</Text>
                                                {m.isCompleted && (m.advanceDeduction > 0 || m.penalty > 0) && (
                                                    <div style={{ fontSize: '12px', marginTop: '4px' }}>
                                                        <Text type="danger">Deductions: {moneyFormatter({ amount: ((m.advanceDeduction || 0) + (m.penalty || 0)) })}</Text>
                                                        <br />
                                                        <Text type="success" strong>Net Release: {moneyFormatter({ amount: (m.netAmount || 0) })}</Text>
                                                    </div>
                                                )}
                                                {m.isCompleted && (
                                                    <Button
                                                        type="link"
                                                        size="small"
                                                        icon={<FilePdfOutlined />}
                                                        style={{ padding: 0, marginTop: 4 }}
                                                        onClick={() => {
                                                            const expenseId = m.expenseId?._id || m.expenseId;
                                                            if (expenseId) {
                                                                handleDownloadVoucher(expenseId);
                                                            } else if (lastCreatedExpense && index === completingData?.index) {
                                                                handleDownloadVoucher(lastCreatedExpense._id);
                                                            } else {
                                                                message.info('Voucher reference not found for this past milestone');
                                                            }
                                                        }}
                                                    >
                                                        Download Voucher
                                                    </Button>
                                                )}
                                            </div>
                                            <Checkbox
                                                checked={m.isCompleted}
                                                onChange={() => openCompletionModal(record, index)}
                                            >
                                                {m.isCompleted ? 'Completed' : 'Mark Complete'}
                                            </Checkbox>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ),
                    }}
                />
                <Modal
                    title="Milestone Completion Details"
                    open={completionModalOpen}
                    onOk={handleCompletionOk}
                    onCancel={() => setCompletionModalOpen(false)}
                    destroyOnClose
                >
                    <Form
                        form={completionForm}
                        layout="vertical"
                        onValuesChange={(changed, all) => {
                            const amount = all.amount || 0;
                            const advance = all.advanceDeduction || 0;
                            const penalty = all.penalty || 0;
                            completionForm.setFieldsValue({ netAmount: amount - advance - penalty });
                        }}
                    >
                        <Form.Item
                            noStyle
                            shouldUpdate={(prev, curr) => prev.amount !== curr.amount}
                        >
                            {({ getFieldValue }) => {
                                const releaseAmount = getFieldValue('amount') || 0;
                                return (
                                    <Form.Item
                                        name="amount"
                                        label="Milestone Base Amount"
                                        extra={releaseAmount > 0 ? <div style={{ fontSize: '11px', color: '#888', fontStyle: 'italic', marginTop: '4px' }}>{numberToWords(releaseAmount)}</div> : null}
                                    >
                                        <InputNumber
                                            disabled
                                            style={{ width: '100%' }}
                                            prefix={currency_symbol}
                                            formatter={inputFormatter}
                                            parser={inputParser}
                                        />
                                    </Form.Item>
                                );
                            }}
                        </Form.Item>
                        <Row gutter={16}>
                            <Col span={12}>
                                <Form.Item
                                    noStyle
                                    shouldUpdate={(prev, curr) => prev.advanceDeduction !== curr.advanceDeduction}
                                >
                                    {({ getFieldValue }) => {
                                        const releaseAdvance = getFieldValue('advanceDeduction') || 0;
                                        return (
                                            <Form.Item
                                                name="advanceDeduction"
                                                label="Advance Deduction"
                                                extra={releaseAdvance > 0 ? <div style={{ fontSize: '11px', color: '#888', fontStyle: 'italic', marginTop: '4px' }}>{numberToWords(releaseAdvance)}</div> : null}
                                            >
                                                <InputNumber
                                                    style={{ width: '100%' }}
                                                    min={0}
                                                    prefix={currency_symbol}
                                                    formatter={inputFormatter}
                                                    parser={inputParser}
                                                />
                                            </Form.Item>
                                        );
                                    }}
                                </Form.Item>
                            </Col>
                            <Col span={12}>
                                <Form.Item
                                    noStyle
                                    shouldUpdate={(prev, curr) => prev.penalty !== curr.penalty}
                                >
                                    {({ getFieldValue }) => {
                                        const releasePenalty = getFieldValue('penalty') || 0;
                                        return (
                                            <Form.Item
                                                name="penalty"
                                                label="Penalty"
                                                extra={releasePenalty > 0 ? <div style={{ fontSize: '11px', color: '#888', fontStyle: 'italic', marginTop: '4px' }}>{numberToWords(releasePenalty)}</div> : null}
                                            >
                                                <InputNumber
                                                    style={{ width: '100%' }}
                                                    min={0}
                                                    prefix={currency_symbol}
                                                    formatter={inputFormatter}
                                                    parser={inputParser}
                                                />
                                            </Form.Item>
                                        );
                                    }}
                                </Form.Item>
                            </Col>
                        </Row>
                        <Form.Item
                            noStyle
                            shouldUpdate={(prev, curr) => prev.netAmount !== curr.netAmount}
                        >
                            {({ getFieldValue }) => {
                                const releaseNetAmount = getFieldValue('netAmount') || 0;
                                return (
                                    <Form.Item
                                        name="netAmount"
                                        label="Net Released Amount"
                                        extra={releaseNetAmount > 0 ? <div style={{ fontSize: '11px', color: '#888', fontStyle: 'italic', marginTop: '4px' }}>{numberToWords(releaseNetAmount)}</div> : null}
                                    >
                                        <InputNumber
                                            disabled
                                            style={{ width: '100%', fontWeight: 'bold' }}
                                            prefix={currency_symbol}
                                            formatter={inputFormatter}
                                            parser={inputParser}
                                        />
                                    </Form.Item>
                                );
                            }}
                        </Form.Item>
                        <Divider>Payment Details</Divider>
                        <Row gutter={16}>
                            <Col span={12}>
                                <Form.Item name="paymentMode" label="Payment Mode" rules={[{ required: true }]}>
                                    <Select
                                        options={[
                                            { value: 'Cash', label: 'Cash' },
                                            { value: 'Cheque', label: 'Cheque' },
                                            { value: 'Bank Transfer', label: 'Bank Transfer' },
                                            { value: 'UPI', label: 'UPI' },
                                            { value: 'Card', label: 'Card' },
                                        ]}
                                    />
                                </Form.Item>
                            </Col>
                            <Col span={12}>
                                <Form.Item name="reference" label="Ref / Cheque No.">
                                    <Input placeholder="Optional" />
                                </Form.Item>
                            </Col>
                        </Row>
                    </Form>
                </Modal>
            </div>
        </Modal>
    );
};

export default LabourContractManager;
