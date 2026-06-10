import { useState, useEffect } from 'react';
import { Modal, Form, Input, Button, Typography, Space, notification } from 'antd';
import { WhatsAppOutlined } from '@ant-design/icons';
import { request } from '@/request';
import storePersist from '@/redux/storePersist';
import { DOWNLOAD_BASE_URL } from '@/config/serverApiConfig';
import { useMoney } from '@/settings';
import useLanguage from '@/locale/useLanguage';

const { TextArea } = Input;
const { Text } = Typography;

export default function WhatsAppModal({ isOpen, onClose, currentErp, entity }) {
  const translate = useLanguage();
  const { moneyFormatter } = useMoney();
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen && currentErp) {
      const client = currentErp.client || {};
      const phone = client.phone || '';
      
      const auth = storePersist.get('auth');
      const token = auth?.current?.token || '';
      const pdfUrl = `${DOWNLOAD_BASE_URL}${entity}/${entity}-${currentErp._id}.pdf?token=${token}`;
      
      const number = currentErp.number || '';
      const year = currentErp.year || '';
      const clientName = client.name || 'Valued Customer';
      
      let amountStr = '';
      let statusStr = '';
      let defaultMsg = '';

      if (entity.toLowerCase() === 'payment') {
        const amount = currentErp.amount || currentErp.total || 0;
        amountStr = moneyFormatter({ amount, currency_code: currentErp.currency });
        statusStr = currentErp.paymentStatus || currentErp.status || '';
        
        defaultMsg = `Hello ${clientName},\n\nWe have received your payment of *${amountStr}* for transaction *#${number}/${year}*.\n*Status:* ${statusStr}\n\nYou can view and download the PDF receipt here: ${pdfUrl}\n\nThank you!`;
      } else {
        const total = currentErp.total || 0;
        amountStr = moneyFormatter({ amount: total, currency_code: currentErp.currency });
        statusStr = currentErp.status || '';
        
        defaultMsg = `Hello ${clientName},\n\nHere is your ${entity} *#${number}/${year}*.\n*Total Amount:* ${amountStr}\n*Status:* ${statusStr}\n\nYou can view and download the PDF here: ${pdfUrl}\n\nThank you for choosing us!`;
      }

      form.setFieldsValue({
        phone: phone,
        message: defaultMsg,
      });
    }
  }, [isOpen, currentErp, entity, form, moneyFormatter]);

  const handleSend = async (values) => {
    setLoading(true);
    try {
      const response = await request.post({
        entity: 'whatsapp/send',
        jsonData: {
          phone: values.phone,
          message: values.message,
        },
      });

      if (response && response.success) {
        notification.success({
          message: 'Success',
          description: 'WhatsApp message sent successfully!',
        });
        onClose();
      } else {
        notification.error({
          message: 'Error',
          description: response?.message || 'Failed to send WhatsApp message. Please make sure the WhatsApp client is connected under settings.',
        });
      }
    } catch (error) {
      console.error(error);
      notification.error({
        message: 'Error',
        description: 'An error occurred while sending the message.',
      });
    }
    setLoading(false);
  };

  return (
    <Modal
      title={
        <Space>
          <WhatsAppOutlined style={{ color: '#25D366', fontSize: '24px' }} />
          <span>Send via WhatsApp</span>
        </Space>
      }
      open={isOpen}
      onCancel={onClose}
      footer={null}
      destroyOnClose
    >
      <Form form={form} layout="vertical" onFinish={handleSend}>
        <div style={{ marginBottom: 16 }}>
          <Text type="secondary">
            Make sure the recipient's phone number includes the country code (e.g. 91 for India, 971 for UAE) and has no spaces or special characters.
          </Text>
        </div>
        
        <Form.Item
          name="phone"
          label="Recipient Phone Number"
          rules={[
            { required: true, message: 'Please input the phone number!' },
            {
              pattern: /^[0-9+]+$/,
              message: 'Phone number should only contain digits and optional "+" prefix.',
            },
          ]}
        >
          <Input placeholder="e.g. +919876543210" size="large" />
        </Form.Item>

        <Form.Item
          name="message"
          label="Message Body"
          rules={[{ required: true, message: 'Please input the message body!' }]}
        >
          <TextArea rows={6} placeholder="Type your message here..." size="large" />
        </Form.Item>

        <Form.Item style={{ marginBottom: 0, textAlign: 'right' }}>
          <Space>
            <Button onClick={onClose} size="large">
              Cancel
            </Button>
            <Button
              type="primary"
              htmlType="submit"
              icon={<WhatsAppOutlined />}
              loading={loading}
              style={{ backgroundColor: '#25D366', borderColor: '#25D366' }}
              size="large"
            >
              Send Message
            </Button>
          </Space>
        </Form.Item>
      </Form>
    </Modal>
  );
}
