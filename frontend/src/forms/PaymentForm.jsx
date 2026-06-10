import React, { useState, useEffect } from 'react';
import dayjs from 'dayjs';
import { Form, Input, InputNumber, Select, Descriptions, Radio, Divider } from 'antd';
import { DatePicker } from 'antd';
import SelectAsync from '@/components/SelectAsync';
import { useMoney, useDate } from '@/settings';
import { request } from '@/request';
import useLanguage from '@/locale/useLanguage';
import numberToWords from '@/utils/numberToWords';

function PropertyBalance() {
  const form = Form.useFormInstance();
  const villaId = Form.useWatch('villa', form);
  const [stats, setStats] = useState(null);

  useEffect(() => {
    if (villaId) {
      const fetchStats = async () => {
        const response = await request.list({ entity: 'booking', options: { villa: villaId } });
        if (response.success && response.result.length > 0) {
          const booking = response.result[0];
          // Calculate paid amount
          let paid = 0;
          if (booking.paymentPlan) {
            paid = booking.paymentPlan.reduce((sum, p) => sum + (p.paidAmount || 0), 0);
          }
          setStats({
            total: booking.totalAmount,
            paid: paid,
            balance: booking.totalAmount - paid
          });
        } else {
          setStats(null);
        }
      };
      fetchStats();
    } else {
      setStats(null);
    }
  }, [villaId]);

  if (!stats) return null;

  return (
    <div style={{ background: '#f6ffed', border: '1px solid #b7eb8f', padding: '10px', marginBottom: '20px', borderRadius: '4px' }}>
      <Descriptions title="Property Financial Status" size="small" column={3} layout="vertical">
        <Descriptions.Item label="Total Agreement">{stats.total?.toLocaleString()}</Descriptions.Item>
        <Descriptions.Item label="Total Paid">{stats.paid?.toLocaleString()}</Descriptions.Item>
        <Descriptions.Item label="Balance Due">
          <span style={{ color: 'red', fontWeight: 'bold' }}>{stats.balance?.toLocaleString()}</span>
        </Descriptions.Item>
      </Descriptions>
    </div>
  );
}

export default function PaymentForm({ maxAmount = null, isUpdateForm = false }) {
  const translate = useLanguage();
  const { TextArea } = Input;
  const money = useMoney();
  const { dateFormat } = useDate();

  const form = Form.useFormInstance();
  const villaId = Form.useWatch('villa', form);
  const paymentType = Form.useWatch('paymentType', form);
  const taxRate = Form.useWatch('taxRate', form);
  const amount = Form.useWatch('amount', form);

  const [villaState, setVillaState] = useState(null);
  const [taxDetails, setTaxDetails] = useState({ type: 'None', tax: 0, total: 0 });
  const companyState = 'Tamil Nadu'; // Default Company State

  // Fetch Villa/Project State
  useEffect(() => {
    if (villaId) {
      const fetchVillaState = async () => {
        const data = await request.read({ entity: 'villa', id: villaId });
        if (data.success && data.result.project) {
          const projectId = data.result.project._id || data.result.project;
          const projectData = await request.read({ entity: 'project', id: projectId });
          if (projectData.success) {
            setVillaState(projectData.result.state);
          }
        }
      };
      fetchVillaState();
    } else {
      setVillaState(null);
    }
  }, [villaId]);

  // Calculate Tax
  useEffect(() => {
    const currentAmount = parseFloat(amount) || 0;
    const currentRate = parseFloat(taxRate) || 0;

    if (paymentType === 'Construction' && currentRate > 0) {
      let type = 'CGST_SGST'; // Default to Intra-state
      // If Villa Location (Place of Supply) != Company State -> IGST
      if (villaState && villaState.toLowerCase() !== companyState.toLowerCase()) {
        type = 'IGST';
      }

      const taxAmount = (currentAmount * currentRate) / 100;
      const total = currentAmount + taxAmount;

      setTaxDetails({ type, tax: taxAmount, total });

      // Update hidden form fields
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
  }, [amount, taxRate, paymentType, villaState, form]);
  return (
    <>
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
        name="client"
        label={translate('Client')}
        rules={[
          {
            required: true,
          },
        ]}
        style={{ width: '100%', clear: 'both' }}
      >
        <SelectAsync
          entity={'client'}
          displayLabels={['name']}
          outputValue={'_id'}
          onChange={(value) => {
            // Reset villa when client changes
            // We could also store client ID to filter villas
          }}
        />
      </Form.Item>

      <PropertyBalance />
      {isUpdateForm && (
        <Form.Item
          label={translate('Transaction Code')}
          name="transactionCode"
          style={{ width: '50%', float: 'right', paddingLeft: '20px' }}
        >
          <Input readOnly bordered={false} style={{ color: 'black', fontWeight: 'bold' }} />
        </Form.Item>
      )}
      <Form.Item
        name="date"
        label={translate('date')}
        rules={[
          {
            required: true,
            type: 'object',
          },
        ]}
        initialValue={dayjs().add(30, 'days')}
        style={{ width: '100%' }}
      >
        <DatePicker format={dateFormat} style={{ width: '100%' }} />
      </Form.Item>

      {/* Payment Category & Tax Logic */}
      <div style={{ border: '1px dashed #ccc', padding: '15px', borderRadius: '5px', marginBottom: '15px', background: '#fafafa', clear: 'both' }}>
        <Form.Item label="Payment Category" name="paymentType" initialValue="Construction">
          <Radio.Group buttonStyle="solid">
            <Radio.Button value="Construction">Construction (GST)</Radio.Button>
            <Radio.Button value="Land">Land (Non-GST)</Radio.Button>
            <Radio.Button value="Other">Other</Radio.Button>
          </Radio.Group>
        </Form.Item>

        {
          paymentType === 'Construction' && (
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

              {/* Hidden Fields */}
              <Form.Item name="taxAmount" hidden><InputNumber /></Form.Item>
              <Form.Item name="totalAmount" hidden><InputNumber /></Form.Item>
              <Form.Item name="taxType" hidden><Input /></Form.Item>

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
                    <span>Total Received:</span>
                    <strong style={{ color: '#52c41a' }}>{money.amountFormatter({ amount: taxDetails.total })}</strong>
                  </div>
                  <div style={{ fontSize: '10px', color: '#999', marginTop: '5px' }}>
                    Place of Supply: {villaState || 'Tamil Nadu (Default)'}
                  </div>
                </div>
              )}
            </>
          )
        }
      </div >

      <Form.Item
        label={translate('amount')}
        name="amount"
        rules={[{ required: true }]}
        extra={amount > 0 ? <div style={{ fontSize: '12px', fontStyle: 'italic', color: '#888', marginTop: '5px' }}>{numberToWords(amount)}</div> : null}
      >
        <InputNumber
          className="moneyInput"
          min={0}
          controls={false}
          max={maxAmount}
          addonAfter={money.currency_position === 'after' ? money.currency_symbol : undefined}
          addonBefore={money.currency_position === 'before' ? money.currency_symbol : undefined}
        />
      </Form.Item>
      <Form.Item
        label={translate('payment Mode')}
        name="paymentMode"
        rules={[
          {
            required: true,
          },
        ]}
      >
        <Select
          onChange={(value) => {
            if (value === 'Cash') {
              form.setFieldValue('ledger', 'internal');
            } else {
              form.setFieldValue('ledger', 'official');
            }
          }}
        >
          <Select.Option value="Cash">Cash (Usually Internal)</Select.Option>
          <Select.Option value="Bank Transfer">Bank Transfer (Usually Official)</Select.Option>
          <Select.Option value="Card">Card</Select.Option>
          <Select.Option value="Loan">Loan</Select.Option>
          <Select.Option value="Cheque">Cheque</Select.Option>
        </Select>
      </Form.Item>
      <Form.Item
        label={translate('Villa')}
        name="villa"
        rules={[
          {
            required: true,
            message: 'Please select a villa',
          },
        ]}
      >
        <SelectAsync
          entity={'villa'}
          displayLabels={['villaNumber']}
          outputValue={'_id'}
        />
      </Form.Item>
      <Form.Item
        label="Building Stage"
        name="buildingStage"
      >
        <Select placeholder="Select Stage">
          <Select.Option value="foundation">Foundation</Select.Option>
          <Select.Option value="structure">Structure</Select.Option>
          <Select.Option value="plastering">Plastering</Select.Option>
          <Select.Option value="finishing">Finishing</Select.Option>
          <Select.Option value="other">Other</Select.Option>
        </Select>
      </Form.Item>
      <Form.Item
        label="Count this payment towards"
        name="ledger"
        initialValue="official"
        rules={[{ required: true }]}
        extra="Usually 'Official' for Bank/Cheque, 'Internal' for Cash."
      >
        <Select>
          <Select.Option value="official">Official Balance (White)</Select.Option>
          <Select.Option value="internal">Internal Balance (Black)</Select.Option>
        </Select>
      </Form.Item>
      <Form.Item
        noStyle
        shouldUpdate={(prevValues, currentValues) => prevValues.paymentMode !== currentValues.paymentMode}
      >
        {({ getFieldValue }) => {
          const paymentMode = getFieldValue('paymentMode');
          return (
            <Form.Item
              label={translate('Transaction ID')}
              name="ref"
              rules={[
                {
                  required: paymentMode && paymentMode !== 'Cash',
                  message: 'Transaction ID is required'
                }
              ]}
            >
              <Input placeholder="Transaction ID / Reference Number" />
            </Form.Item>
          );
        }}
      </Form.Item>
      <Form.Item label={translate('Description')} name="description">
        <TextArea />
      </Form.Item>
    </>
  );
}
