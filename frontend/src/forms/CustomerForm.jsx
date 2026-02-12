import { Form, Input, DatePicker, Checkbox } from 'antd';
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
      <Form.Item
        label={translate('company')}
        name="company"
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
      <Form.Item
        label={translate('Manager first Name')}
        name="managerName"
        rules={[
          {
            required: true,
          },
          {
            validator: validateEmptyString,
          },
        ]}
        style={{
          display: 'inline-block',
          width: 'calc(50%)',
          paddingRight: '5px',
        }}
      >
        <Input />
      </Form.Item>
      <Form.Item
        label={translate('Manager Last Name')}
        name="managerSurname"
        rules={[
          {
            required: true,
          },
          {
            validator: validateEmptyString,
          },
        ]}
        style={{
          display: 'inline-block',
          width: 'calc(50%)',
          paddingLeft: '5px',
        }}
      >
        <Input />
      </Form.Item>

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
      <Form.Item name="email" label={translate('email')} rules={[
          {
            type: 'email',
          },
          {
            required: true,
          },
          {
            validator: validateEmptyString,
          },
        ]}>
        <Input />
      </Form.Item>

      <div style={{ marginTop: '30px', marginBottom: '20px' }}>
        <Form.Item name="address" label={translate('Address')}>
          <Input.TextArea rows={2} />
        </Form.Item>
      </div>

      <div style={{ marginTop: '20px', marginBottom: '10px', fontWeight: 'bold' }}>Nominee Details</div>

      <Form.Item name="nomineeName" label={translate('Nominee Name')}>
        <Input />
      </Form.Item>

      <Form.Item name="nomineeFatherHusbandName" label={translate("Father's / Husband's Name")}>
        <Input />
      </Form.Item>

      <Form.Item name="nomineeRelationship" label={translate('Relationship')}>
        <Input />
      </Form.Item>

      <Form.Item name="nomineeDob" label={translate('Date of Birth')}>
        <DatePicker style={{ width: '100%' }} format="DD/MM/YYYY" />
      </Form.Item>

      <Form.Item name="nomineeMobile" label={translate('Mobile Number')}>
        <Input />
      </Form.Item>

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

      <Form.Item name="nomineeAddress" label={translate('Address')}>
        <Input.TextArea rows={2} />
      </Form.Item>
    </>
  );
}
