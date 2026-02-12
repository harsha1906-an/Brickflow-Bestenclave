import { useState, useEffect } from 'react';
import { Form, Button, Modal, Input } from 'antd';
import dayjs from 'dayjs';
import { useSelector, useDispatch } from 'react-redux';
import { erp } from '@/redux/erp/actions';
import { selectUpdatedItem } from '@/redux/erp/selectors';

import useLanguage from '@/locale/useLanguage';

import Loading from '@/components/Loading';

import calculate from '@/utils/calculate';
import PaymentForm from '@/forms/PaymentForm';
import { useNavigate } from 'react-router-dom';
import { useUserRole } from '@/hooks/useUserRole';

export default function UpdatePayment({ config, currentInvoice }) {
  const translate = useLanguage();
  const navigate = useNavigate();
  let { entity } = config;
  const dispatch = useDispatch();

  const { isLoading, isSuccess } = useSelector(selectUpdatedItem);

  const [form] = Form.useForm();
  
  const [maxAmount, setMaxAmount] = useState(0);
  const [isSecurityModalOpen, setIsSecurityModalOpen] = useState(false);
  const [securityCode, setSecurityCode] = useState('');
  const [pendingValues, setPendingValues] = useState(null);

  const { role } = useUserRole();
  const isOwner = role === 'OWNER';

  useEffect(() => {
    if (currentInvoice) {
      const { credit, total, discount, amount } = currentInvoice;

      setMaxAmount(
        calculate.sub(calculate.sub(total, discount), calculate.sub(calculate.sub(credit, amount)))
      );
      const newInvoiceValues = { ...currentInvoice };
      if (newInvoiceValues.date) {
        newInvoiceValues.date = dayjs(newInvoiceValues.date);
      }
      form.setFieldsValue(newInvoiceValues);
    }
  }, [currentInvoice]);

  useEffect(() => {
    if (isSuccess) {
      form.resetFields();
      dispatch(erp.resetAction({ actionType: 'recordPayment' }));
      dispatch(erp.list({ entity }));
      navigate(`/${entity.toLowerCase()}/read/${currentInvoice._id}`);
    }
  }, [isSuccess]);

  const onSubmit = (fieldsValue) => {
    if (currentInvoice) {
      const { _id: invoice } = currentInvoice;
      const client = currentInvoice.client && currentInvoice.client._id;
      fieldsValue = {
        ...fieldsValue,
        invoice,
        client,
      };
    }

    if (isOwner) {
        setPendingValues(fieldsValue);
        setIsSecurityModalOpen(true);
    } else {
        dispatch(
          erp.update({
            entity,
            id: currentInvoice._id,
            jsonData: fieldsValue,
          })
        );
    }
  };

  const handleSecurityCheck = () => {
      const finalValues = {
          ...pendingValues,
          securityCode: securityCode
      };
      
      dispatch(
          erp.update({
            entity,
            id: currentInvoice._id,
            jsonData: finalValues,
          })
        );
      setIsSecurityModalOpen(false);
      setSecurityCode('');
  };

  return (
    <>
      <Loading isLoading={isLoading}>
        <Form form={form} layout="vertical" onFinish={onSubmit}>
          <PaymentForm maxAmount={maxAmount} />
          <Form.Item>
            <Button type="primary" htmlType="submit">
              {translate('Update')}
            </Button>
          </Form.Item>
        </Form>
      </Loading>
      <Modal
        title="Security Verification"
        open={isSecurityModalOpen}
        onOk={handleSecurityCheck}
        onCancel={() => setIsSecurityModalOpen(false)}
        okText="Verify & Update"
      >
        <p style={{ color: 'red', fontWeight: 'bold' }}>WARNING: changing payment info is a critical action.</p>
        <p>Please enter the security code to proceed:</p>
        <Input.Password 
            value={securityCode}
            onChange={(e) => setSecurityCode(e.target.value)}
            placeholder="Security Code"
        />
      </Modal>
    </>
  );
}
