import React from 'react';
import { Form, Input, Select, InputNumber } from 'antd';

export default function MaterialForm({ isUpdateForm = false }) {
    return (
        <>
            <Form.Item
                name="name"
                label="Material Name"
                rules={[{ required: true }]}
            >
                <Input placeholder="e.g. UltraTech Cement" />
            </Form.Item>

            <Form.Item
                name="category"
                label="Category"
                initialValue="Other"
            >
                <Select>
                    <Select.Option value="Cement">Cement</Select.Option>
                    <Select.Option value="Steel">Steel</Select.Option>
                    <Select.Option value="Aggregates">Aggregates (Sand/Jelly)</Select.Option>
                    <Select.Option value="Bricks/Blocks">Bricks/Blocks</Select.Option>
                    <Select.Option value="Size Stones / Bolders">Size Stones / Bolders</Select.Option>
                    <Select.Option value="Waterproofing Chemicals">Waterproofing Chemicals</Select.Option>
                    <Select.Option value="Electrical">Electrical</Select.Option>
                    <Select.Option value="Plumbing">Plumbing</Select.Option>
                    <Select.Option value="Paint">Paint</Select.Option>
                    <Select.Option value="Wood">Wood</Select.Option>
                    <Select.Option value="Other">Other</Select.Option>
                </Select>
            </Form.Item>

            <Form.Item
                name="unit"
                label="Unit of Measure"
                rules={[{ required: true }]}
            >
                <Select placeholder="Select Unit">
                    <Select.Option value="Bags">Bags</Select.Option>
                    <Select.Option value="Kg">Kg</Select.Option>
                    <Select.Option value="Tons">Tons</Select.Option>
                    <Select.Option value="Nos">Nos (Numbers)</Select.Option>
                    <Select.Option value="Ltr">Ltr (Litres)</Select.Option>
                    <Select.Option value="SqFt">SqFt (Square Feet)</Select.Option>
                    <Select.Option value="CuFt">CuFt (Cubic Feet)</Select.Option>
                </Select>
            </Form.Item>

            <Form.Item
                name="reorderLevel"
                label="Low Stock Alert Level"
                help="Alert when stock falls below this quantity"
            >
                <InputNumber style={{ width: '100%' }} min={0} />
            </Form.Item>

            <Form.Item name="description" label="Description">
                <Input.TextArea rows={2} />
            </Form.Item>
        </>
    );
}
