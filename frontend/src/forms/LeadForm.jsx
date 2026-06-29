import React, { useState } from 'react';
import { Form, Input, Select, Divider } from 'antd';

import { validatePhoneNumber } from '@/utils/helpers';

export default function LeadForm({ isUpdateForm = false }) {
  const [status, setStatus] = useState('New');

  const handleStatusChange = (val) => {
    setStatus(val);
  };

  return (
    <>
      <Form.Item
        name="name"
        label="Name"
        rules={[
          {
            required: true,
            message: 'Please enter lead name',
          },
        ]}
      >
        <Input placeholder="John Doe" />
      </Form.Item>
      <Form.Item
        name="phone"
        label="Phone"
        rules={[
          {
            required: true,
            message: 'Please enter phone number',
          },
          {
            pattern: validatePhoneNumber,
            message: 'Must be a valid 10-digit number',
          },
        ]}
      >
        <Input placeholder="9876543210" />
      </Form.Item>
      <Form.Item
        name="email"
        label="Email"
        rules={[
          {
            type: 'email',
            message: 'The input is not valid E-mail!',
          },
        ]}
      >
        <Input placeholder="john@example.com" />
      </Form.Item>

      <Form.Item
        name="source"
        label="Source"
      >
        <Select placeholder="Select source">
          <Select.Option value="Walk-in">Walk-in</Select.Option>
          <Select.Option value="Referral">Referral</Select.Option>
          <Select.Option value="Website">Website</Select.Option>
          <Select.Option value="Ads">Ads</Select.Option>
          <Select.Option value="Broker">Broker</Select.Option>
          <Select.Option value="Other">Other</Select.Option>
        </Select>
      </Form.Item>

      <Form.Item
        name="interestedVillaType"
        label="Interested In"
      >
        <Select placeholder="Select property type">
          <Select.Option value="3BHK Villa">3BHK Villa</Select.Option>
          <Select.Option value="4BHK Villa">4BHK Villa</Select.Option>
          <Select.Option value="5BHK Villa">5BHK Villa</Select.Option>
          <Select.Option value="6BHK Villa">6BHK Villa</Select.Option>
          <Select.Option value="Plot">Plot</Select.Option>
          <Select.Option value="Apartment">Apartment</Select.Option>
          <Select.Option value="Commercial">Commercial</Select.Option>
        </Select>
      </Form.Item>

      <Form.Item
        name="status"
        label="Status"
        initialValue="New"
      >
        <Select onChange={handleStatusChange}>
          <Select.Option value="New">New</Select.Option>
          <Select.Option value="Contacted">Contacted</Select.Option>
          <Select.Option value="Site Visit">Site Visit</Select.Option>
          <Select.Option value="Negotiation">Negotiation</Select.Option>
          <Select.Option value="Converted" disabled>Converted</Select.Option>
          <Select.Option value="Lost">Lost</Select.Option>
        </Select>
      </Form.Item>

      <Form.Item shouldUpdate={(prev, curr) => prev.status !== curr.status}>
        {({ getFieldValue }) => {
          const currentStatus = getFieldValue('status') || status;
          return currentStatus === 'Lost' ? (
            <div style={{ background: '#fff1f0', padding: 10, borderRadius: 6, marginBottom: 16, border: '1px solid #ffccc7' }}>
              <Form.Item
                name="lostReason"
                label="Reason for Loss"
                rules={[{ required: true, message: 'Please select a reason' }]}
              >
                <Select placeholder="Why was the lead lost?">
                  <Select.Option value="Budget">Budget Constraints</Select.Option>
                  <Select.Option value="Location">Location Mismatch</Select.Option>
                  <Select.Option value="Competitor">Bought from Competitor</Select.Option>
                  <Select.Option value="Timeline">Timeline Mismatch</Select.Option>
                  <Select.Option value="Not Interested">Not Interested</Select.Option>
                  <Select.Option value="Other">Other</Select.Option>
                </Select>
              </Form.Item>
            </div>
          ) : null;
        }}
      </Form.Item>

      <Form.Item
        name="notes"
        label="Notes"
      >
        <Input.TextArea rows={3} placeholder="Additional notes..." />
      </Form.Item>
    </>
  );
}
