import React from 'react';
import { Form, Input, InputNumber, Select, Switch, Row, Col } from 'antd';

import { validatePhoneNumber } from '@/utils/helpers';

export default function SupplierForm({ isUpdateForm = false }) {
    const supplierTypeOptions = [
        { value: 'cement', label: 'Cement' },
        { value: 'aggregate', label: 'Aggregate (Sand, Gravel)' },
        { value: 'steel', label: 'Steel' },
        { value: 'rods', label: 'Steel Rods/Bars (TMT)' },
        { value: 'bricks', label: 'Bricks & Blocks' },
        { value: 'tiles', label: 'Tiles & Flooring' },
        { value: 'electrical', label: 'Electrical Items' },
        { value: 'plumbing', label: 'Plumbing Items' },
        { value: 'hardware', label: 'Hardware & Tools' },
        { value: 'paint', label: 'Paint & Coating' },
        { value: 'wood', label: 'Wood & Timber' },
        { value: 'glass', label: 'Glass & Glazing' },
        { value: 'sanitary', label: 'Sanitary Ware' },
        { value: 'other', label: 'Other' },
    ];

    return (
        <>
            <Row gutter={[24, 24]}>
                <Col span={24}>
                    <Form.Item
                        label="Supplier Name"
                        name="name"
                        rules={[
                            {
                                required: true,
                                message: 'Please input supplier name!',
                            },
                        ]}
                    >
                        <Input />
                    </Form.Item>
                </Col>
                <Col span={12}>
                    <Form.Item
                        label="Supplier Type"
                        name="supplierType"
                        rules={[{ required: true, message: 'Please select supplier type!' }]}
                    >
                        <Select options={supplierTypeOptions} placeholder="Select material type" />
                    </Form.Item>
                </Col>
                <Col span={12}>
                    <Form.Item label="Email" name="email">
                        <Input />
                    </Form.Item>
                </Col>
                <Col span={12}>
                    <Form.Item
                        label="Phone"
                        name="phone"
                        rules={[
                            {
                                pattern: validatePhoneNumber,
                                message: 'Must be a valid 10-digit number',
                            },
                        ]}
                    >
                        <Input />
                    </Form.Item>
                </Col>
                <Col span={24}>
                    <Form.Item label="Address" name="address">
                        <Input />
                    </Form.Item>
                </Col>
                <Col span={12}>
                    <Form.Item label="City" name="city">
                        <Input />
                    </Form.Item>
                </Col>
                <Col span={12}>
                    <Form.Item label="State" name="state">
                        <Select placeholder="Select state">
                            <Select.Option value="Karnataka">Karnataka</Select.Option>
                            <Select.Option value="Kerala">Kerala</Select.Option>
                            <Select.Option value="Andhra Pradesh">Andhra Pradesh</Select.Option>
                        </Select>
                    </Form.Item>
                </Col>
                <Col span={12}>
                    <Form.Item label="GSTIN" name="gstin">
                        <Input />
                    </Form.Item>
                </Col>
                <Col span={12}>
                    <Form.Item label="Tax Number (GST/VAT)" name="taxNumber">
                        <Input />
                    </Form.Item>
                </Col>
                <Col span={12}>
                    <Form.Item label="Credit Period (Days)" name="creditPeriod">
                        <InputNumber style={{ width: '100%' }} />
                    </Form.Item>
                </Col>
                <Col span={12}>
                    <Form.Item label="Website" name="website">
                        <Input />
                    </Form.Item>
                </Col>
                <Col span={12}>
                    <Form.Item
                        label="Status"
                        name="enabled"
                        valuePropName="checked"
                        initialValue={true}
                    >
                        <Switch checkedChildren="Active" unCheckedChildren="Disabled" />
                    </Form.Item>
                </Col>
            </Row >
        </>
    );
}
