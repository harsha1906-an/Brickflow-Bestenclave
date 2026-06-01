import { Form, Input, DatePicker, Checkbox, Select, Row, Col } from 'antd';
import { validatePhoneNumber } from '@/utils/helpers';
import { useState } from 'react';

import useLanguage from '@/locale/useLanguage';

export default function CustomerForm({ isUpdateForm = false }) {
  const translate = useLanguage();
  const [useSameAddress, setUseSameAddress] = useState(false);
  const form = Form.useFormInstance();
  const validateEmptyString = (_, value) => {
    if (value && value.trim() === '') {
      return Promise.reject(new Error('Field cannot be empty'));
    }

    return Promise.resolve();
  };

  return (
    <>
      <div style={{ marginBottom: '10px', fontWeight: 'bold', fontSize: '16px' }}>Personal Details</div>
      
      <Form.Item
        label={translate('Customer Name')}
        name="name"
        rules={[
          {
            required: true,
          },
          {
            validator: validateEmptyString,
          },
        ]}
      >
        <Input />
      </Form.Item>

      <Row gutter={16}>
        <Col span={12}>
          <Form.Item
            label={translate("Father's Name")}
            name="fatherName"
          >
            <Input />
          </Form.Item>
        </Col>
        <Col span={12}>
          <Form.Item
            label={translate('Customer ID')}
            name="customerId"
          >
            <Input />
          </Form.Item>
        </Col>
      </Row>

      <Row gutter={16}>
        <Col span={12}>
          <Form.Item
            label={translate('Gender')}
            name="gender"
          >
            <Select>
              <Select.Option value="male">{translate('Male')}</Select.Option>
              <Select.Option value="female">{translate('Female')}</Select.Option>
              <Select.Option value="other">{translate('Other')}</Select.Option>
            </Select>
          </Form.Item>
        </Col>
        <Col span={12}>
          <Form.Item
            label={translate('Date of Birth')}
            name="dob"
          >
            <DatePicker style={{ width: '100%' }} format="DD/MM/YYYY" />
          </Form.Item>
        </Col>
      </Row>

      <div style={{ marginTop: '20px', marginBottom: '10px', fontWeight: 'bold', fontSize: '16px' }}>Contact Details</div>

      <Row gutter={16}>
        <Col span={12}>
          <Form.Item
            name="phone"
            label={translate('Phone')}
            rules={[
              {
                required: true,
              },
              {
                validator: validateEmptyString,
              },
              {
                pattern: validatePhoneNumber,
                message: 'Please enter a valid phone number',
              },
            ]}
          >
            <Input />
          </Form.Item>
        </Col>
        <Col span={12}>
          <Form.Item name="email" label={translate('Email')} rules={[
              {
                type: 'email',
              },
            ]}>
            <Input />
          </Form.Item>
        </Col>
      </Row>

      <Row gutter={16}>
        <Col span={12}>
          <Form.Item name="country" label={translate('Country')}>
            <Input />
          </Form.Item>
        </Col>
        <Col span={12}>
          <Form.Item name="state" label={translate('State')}>
            <Input />
          </Form.Item>
        </Col>
      </Row>

      <Form.Item name="address" label={translate('Address')}>
        <Input.TextArea rows={2} />
      </Form.Item>

      <div style={{ marginTop: '20px', marginBottom: '10px', fontWeight: 'bold', fontSize: '16px' }}>GST Details</div>
      <Form.Item name="gstin" label={translate('GSTIN')}>
        <Input />
      </Form.Item>

      <div style={{ marginTop: '20px', marginBottom: '10px', fontWeight: 'bold', fontSize: '16px' }}>Identity Documents</div>

      <Row gutter={16}>
        <Col span={8}>
          <Form.Item
            label={translate('Aadhar Card Number')}
            name="aadharCardNumber"
          >
            <Input />
          </Form.Item>
        </Col>
        <Col span={8}>
          <Form.Item
            label={translate('PAN Card Number')}
            name="panCardNumber"
          >
            <Input />
          </Form.Item>
        </Col>
        <Col span={8}>
          <Form.Item
            label={translate('Driving Licence')}
            name="drivingLicence"
          >
            <Input />
          </Form.Item>
        </Col>
      </Row>

      <div style={{ marginTop: '20px', marginBottom: '10px', fontWeight: 'bold', fontSize: '16px' }}>Nominee Details</div>

      <Form.Item name="nomineeName" label={translate('Nominee Name')}>
        <Input />
      </Form.Item>

      <Form.Item name="nomineeFatherHusbandName" label={translate("Father's / Husband's Name")}>
        <Input />
      </Form.Item>

      <Row gutter={16}>
        <Col span={8}>
          <Form.Item name="nomineeRelationship" label={translate('Relationship')}>
            <Input />
          </Form.Item>
        </Col>
        <Col span={8}>
          <Form.Item name="nomineeDob" label={translate('Date of Birth')}>
            <DatePicker style={{ width: '100%' }} format="DD/MM/YYYY" />
          </Form.Item>
        </Col>
        <Col span={8}>
          <Form.Item name="nomineeMobile" label={translate('Mobile Number')}>
            <Input />
          </Form.Item>
        </Col>
      </Row>

      <Form.Item>
        <Checkbox 
          onChange={(e) => {
            setUseSameAddress(e.target.checked);
            if (e.target.checked && form) {
              const customerAddress = form.getFieldValue('address');
              form.setFieldValue('nomineeAddress', customerAddress);
            }
          }}
        >
          {translate('Use same address as customer')}
        </Checkbox>
      </Form.Item>

      <Form.Item name="nomineeAddress" label={translate('Nominee Address')}>
        <Input.TextArea rows={2} />
      </Form.Item>
    </>
  );
}
