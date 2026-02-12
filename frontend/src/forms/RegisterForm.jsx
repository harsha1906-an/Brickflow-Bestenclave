import React from 'react';
import { Form, Input, Select } from 'antd';
import { UserOutlined, LockOutlined, MailOutlined, IdcardOutlined } from '@ant-design/icons';

import useLanguage from '@/locale/useLanguage';

export default function RegisterForm() {
  const translate = useLanguage();

  return (
    <>
      <Form.Item
        name="name"
        label={translate('name')}
        rules={[
          {
            required: true,
          },
        ]}
      >
        <Input prefix={<IdcardOutlined className="site-form-item-icon" />} placeholder={translate('name')} size="large" />
      </Form.Item>
      <Form.Item
        name="email"
        label={translate('email')}
        rules={[
          {
            required: true,
          },
          {
            type: 'email',
          },
        ]}
      >
        <Input
          prefix={<MailOutlined className="site-form-item-icon" />}
          type="email"
          placeholder={translate('email')}
          size="large"
        />
      </Form.Item>
      <Form.Item
        name="password"
        label={translate('password')}
        rules={[
          {
            required: true,
          },
        ]}
      >
        <Input.Password prefix={<LockOutlined className="site-form-item-icon" />} placeholder={translate('password')} size="large" />
      </Form.Item>
      <Form.Item
        label={translate('role')}
        name="role"
        rules={[
          {
            required: true,
          },
        ]}
      >
        <Select
            placeholder={translate('Select Role')}
            size="large"
        >
            <Select.Option value="owner">{translate('Owner')}</Select.Option>
            <Select.Option value="manager">{translate('Manager')}</Select.Option>
        </Select>
      </Form.Item>

      <div style={{ textAlign: 'center', marginBottom: '15px' }}>
          {translate('Already have an account?')}{' '}
          <a href="/login">
            {translate('Log in')}
          </a>
      </div>
    </>
  );
}
