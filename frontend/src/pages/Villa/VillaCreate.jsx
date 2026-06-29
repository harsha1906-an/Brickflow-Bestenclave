import React, { useState, useEffect } from 'react';
import { Form, Input, InputNumber, Button, Select, Divider, Row, Col, App, Card } from 'antd';
import useMoney from '@/settings/useMoney';
import { useNavigate } from 'react-router-dom';
import useLanguage from '@/locale/useLanguage';
import { request } from '@/request';
import numberToWords from '@/utils/numberToWords';

export default function VillaCreate() {
    const { message } = App.useApp();
    const [form] = Form.useForm();
    const translate = useLanguage();
    const { currency_symbol, inputFormatter, inputParser } = useMoney();
    const navigate = useNavigate();
    const [loading, setLoading] = useState(false);
    const [existingVillas, setExistingVillas] = useState([]);

    const accountableAmount = Form.useWatch('accountableAmount', form);
    const nonAccountableAmount = Form.useWatch('nonAccountableAmount', form);
    const totalAmount = Form.useWatch('totalAmount', form);

    useEffect(() => {
        const fetchVillas = async () => {
            const result = await request.list({ entity: 'villa', options: { items: 1000 } });
            if (result.success) {
                setExistingVillas(result.result);
            }
        };
        fetchVillas();
    }, []);

    const onFinish = async (values) => {
        setLoading(true);
        try {
            const response = await request.create({ entity: 'villa', jsonData: values });
            if (response.success) {
                message.success('Villa created successfully');
                navigate('/villa');
            } else {
                message.error(response.message || 'Failed to create villa');
            }
        } catch (error) {
            message.error('An error occurred');
            console.error(error);
        }
        setLoading(false);
    };

    const handleValuesChange = (changedValues, allValues) => {
        const { accountableAmount, nonAccountableAmount, groundFloorArea, firstFloorArea, secondFloorArea } = allValues;

        // Calculate Total Amount
        if (changedValues.accountableAmount !== undefined || changedValues.nonAccountableAmount !== undefined) {
            const total = (Number(accountableAmount) || 0) + (Number(nonAccountableAmount) || 0);
            form.setFieldsValue({ totalAmount: total });
        }

        // Calculate Total Built Up Area
        if (changedValues.groundFloorArea !== undefined || changedValues.firstFloorArea !== undefined || changedValues.secondFloorArea !== undefined) {
            const totalArea = (Number(groundFloorArea) || 0) + (Number(firstFloorArea) || 0) + (Number(secondFloorArea) || 0);
            form.setFieldsValue({ builtUpArea: totalArea });
        }
    };

    return (
        <div style={{ padding: '20px' }}>
            <Card title={translate('Add New Villa')}>
                <Form
                    form={form}
                    layout="vertical"
                    onFinish={onFinish}
                    onValuesChange={handleValuesChange}
                    initialValues={{
                        status: 'available',
                        houseType: '3BHK',
                        accountableAmount: 0,
                        nonAccountableAmount: 0,
                        totalAmount: 0,
                        groundFloorArea: 0,
                        firstFloorArea: 0,
                        secondFloorArea: 0,
                        builtUpArea: 0,
                        facing: 'North'
                    }}
                >
                    <Row gutter={24}>
                        <Col span={12}>
                            <Form.Item
                                name="villaNumber"
                                label={translate('Villa Number')}
                                rules={[
                                    { required: true, message: 'Please enter villa number' },
                                    {
                                        validator: (_, value) => {
                                            if (!value) return Promise.resolve();
                                            const duplicate = existingVillas.find(v => v.villaNumber && v.villaNumber.toLowerCase() === value.trim().toLowerCase());
                                            if (duplicate) {
                                                if (duplicate.status === 'booked') {
                                                    return Promise.reject(new Error(`Warning: Villa ${value} is already BOOKED!`));
                                                }
                                                return Promise.reject(new Error(`Warning: Villa ${value} is already added!`));
                                            }
                                            return Promise.resolve();
                                        }
                                    }
                                ]}
                            >
                                <Input placeholder="e.g. V-101" />
                            </Form.Item>
                        </Col>
                        <Col span={12}>
                            <Form.Item
                                name="houseType"
                                label={translate('House Type')}
                                rules={[{ required: true }]}
                            >
                                <Select>
                                    <Select.Option value="3BHK">3BHK</Select.Option>
                                    <Select.Option value="4BHK">4BHK</Select.Option>
                                    <Select.Option value="5BHK">5BHK</Select.Option>
                                    <Select.Option value="6BHK">6BHK</Select.Option>
                                    <Select.Option value="Other">Other</Select.Option>
                                </Select>
                            </Form.Item>
                        </Col>
                    </Row>
                    <Row gutter={24}>
                        <Col span={6}>
                            <Form.Item
                                name="landArea"
                                label={translate('Land Area (sqft)')}
                            >
                                <InputNumber style={{ width: '100%' }} min={0} />
                            </Form.Item>
                        </Col>
                        <Col span={6}>
                            <Form.Item
                                name="groundFloorArea"
                                label={translate('Ground Floor (sqft)')}
                            >
                                <InputNumber style={{ width: '100%' }} min={0} />
                            </Form.Item>
                        </Col>
                        <Col span={6}>
                            <Form.Item
                                name="firstFloorArea"
                                label={translate('1st Floor (sqft)')}
                            >
                                <InputNumber style={{ width: '100%' }} min={0} />
                            </Form.Item>
                        </Col>
                        <Col span={6}>
                            <Form.Item
                                name="secondFloorArea"
                                label={translate('2nd Floor (sqft)')}
                            >
                                <InputNumber style={{ width: '100%' }} min={0} />
                            </Form.Item>
                        </Col>
                        <Col span={6}>
                            <Form.Item
                                name="builtUpArea"
                                label={translate('Total Built Up (sqft)')}
                            >
                                <InputNumber style={{ width: '100%' }} min={0} readOnly />
                            </Form.Item>
                        </Col>
                    </Row>
                    <Row gutter={24}>
                        <Col span={12}>
                            <Form.Item
                                name="facing"
                                label={translate('Facing')}
                            >
                                <Select>
                                    <Select.Option value="North">North</Select.Option>
                                    <Select.Option value="South">South</Select.Option>
                                    <Select.Option value="East">East</Select.Option>
                                    <Select.Option value="West">West</Select.Option>
                                    <Select.Option value="North-East">North-East</Select.Option>
                                    <Select.Option value="North-West">North-West</Select.Option>
                                    <Select.Option value="South-East">South-East</Select.Option>
                                    <Select.Option value="South-West">South-West</Select.Option>
                                </Select>
                            </Form.Item>
                        </Col>
                        <Col span={12}>
                            <Form.Item
                                name="status"
                                label={translate('Status')}
                                rules={[{ required: true }]}
                            >
                                <Select>
                                    <Select.Option value="available">Available</Select.Option>
                                    <Select.Option value="booked">Booked</Select.Option>
                                    <Select.Option value="sold">Sold</Select.Option>
                                </Select>
                            </Form.Item>
                        </Col>
                    </Row>
                    <Row gutter={24}>
                        <Col span={8}>
                            <Form.Item
                                label={translate('Accountable (White)')}
                                name="accountableAmount"
                                extra={accountableAmount > 0 ? <div style={{ fontSize: '12px', fontStyle: 'italic', color: '#aaa', marginTop: '5px' }}>{numberToWords(accountableAmount)}</div> : null}
                            >
                                <InputNumber
                                    style={{ width: '100%' }}
                                    min={0}
                                    prefix={currency_symbol}
                                    formatter={inputFormatter}
                                    parser={inputParser}
                                />
                            </Form.Item>
                        </Col>
                        <Col span={8}>
                            <Form.Item
                                label={translate('Non Accountable (Black)')}
                                name="nonAccountableAmount"
                                extra={nonAccountableAmount > 0 ? <div style={{ fontSize: '12px', fontStyle: 'italic', color: '#aaa', marginTop: '5px' }}>{numberToWords(nonAccountableAmount)}</div> : null}
                            >
                                <InputNumber
                                    style={{ width: '100%' }}
                                    min={0}
                                    prefix={currency_symbol}
                                    formatter={inputFormatter}
                                    parser={inputParser}
                                />
                            </Form.Item>
                        </Col>
                        <Col span={8}>
                            <Form.Item
                                label={translate('Total Amount')}
                                name="totalAmount"
                                extra={totalAmount > 0 ? <div style={{ fontSize: '12px', fontStyle: 'italic', color: '#aaa', marginTop: '5px' }}>{numberToWords(totalAmount)}</div> : null}
                            >
                                <InputNumber
                                    style={{ width: '100%' }}
                                    readOnly
                                    prefix={currency_symbol}
                                    formatter={inputFormatter}
                                    parser={inputParser}
                                />
                            </Form.Item>
                        </Col>
                    </Row>

                    <Form.Item>
                        <Button type="primary" htmlType="submit" loading={loading}>
                            {translate('Save')}
                        </Button>
                    </Form.Item>
                </Form>
            </Card>
        </div>
    );
}
