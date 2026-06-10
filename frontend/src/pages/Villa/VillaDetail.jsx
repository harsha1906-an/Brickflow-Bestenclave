import React, { useEffect, useState } from 'react';
import { Card, Descriptions, Button, Modal, Form, Select, InputNumber, Input, Tag, App, Row, Col } from 'antd';
import { useParams } from 'react-router-dom';
import { useUserRole } from '@/hooks/useUserRole';
import { request } from '@/request';
import { useAppContext } from '@/context/appContext';

const PROGRESS_STAGES = [
  { value: 'foundation', label: 'Foundation' },
  { value: 'structure', label: 'Structure' },
  { value: 'masonry', label: 'Masonry' },
  { value: 'plastering', label: 'Plastering' },
  { value: 'flooring', label: 'Flooring' },
  { value: 'electrical_plumbing', label: 'Electrical & Plumbing' },
  { value: 'finishing', label: 'Finishing' },
  { value: 'completed', label: 'Completed' },
  { value: 'other', label: 'Other' },
];

const VillaProgressSection = ({ companyId, villaId }) => {
  const { message } = App.useApp();
  const [progress, setProgress] = useState(null);
  const [loading, setLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [form] = Form.useForm();
  const { role } = useUserRole();

  const fetchProgress = async () => {
    if (!companyId || !villaId) return;
    setLoading(true);
    try {
      const res = await request.get({ entity: `companies/${companyId}/villas/${villaId}/progress` });
      if (res) setProgress(res);
    } catch (e) {
      console.log("Progress fetch error", e);
      setProgress(null);
    }
    setLoading(false);
  };

  useEffect(() => {
    if (companyId && villaId) {
      fetchProgress();
    }
    // eslint-disable-next-line
  }, [villaId, companyId]);

  const openModal = () => {
    setModalOpen(true);
  };

  useEffect(() => {
    if (modalOpen) {
      if (progress) {
        form.setFieldsValue(progress);
      } else {
        form.resetFields();
      }
    }
  }, [modalOpen, progress, form]);

  const handleOk = async () => {
    try {
      const values = await form.validateFields();
      await request.post({ entity: `companies/${companyId}/villas/${villaId}/progress`, jsonData: values });
      message.success('Progress updated');
      setModalOpen(false);
      fetchProgress();
    } catch (e) {
      if (e?.response?.data?.message) message.error(e.response.data.message);
      else message.error('Failed to update progress');
    }
  };

  return (
    <Card title="Progress" loading={loading} extra={((role === 'OWNER' || role === 'ENGINEER') && <Button onClick={openModal}>Update Progress</Button>)}>
      {progress ? (
        <Descriptions column={1}>
          <Descriptions.Item label="Stage">
            {PROGRESS_STAGES.find(s => s.value === progress.stage)?.label || progress.stage}
            {progress.stage === 'other' && progress.notes ? <span> <Tag color="blue">{progress.notes}</Tag></span> : null}
          </Descriptions.Item>
          <Descriptions.Item label="Percentage">{progress.percentage}%</Descriptions.Item>
          <Descriptions.Item label="Last Updated">{progress.updatedAt ? new Date(progress.updatedAt).toLocaleString() : ''}</Descriptions.Item>
        </Descriptions>
      ) : (
        <span>No progress recorded yet.</span>
      )}
      <Modal
        title="Update Progress"
        open={modalOpen}
        onOk={role === 'ACCOUNTANT' ? undefined : handleOk}
        onCancel={() => setModalOpen(false)}
        okButtonProps={role === 'ACCOUNTANT' ? { disabled: true } : {}}
        forceRender
      >
        <Form form={form} layout="vertical">
          <Form.Item name="stage" label="Stage" rules={[{ required: true }]}>
            <Select options={PROGRESS_STAGES} disabled={role === 'ACCOUNTANT'} />
          </Form.Item>
          <Form.Item name="percentage" label="Percentage" rules={[{ required: true, type: 'number', min: 0, max: 100 }]}>
            <InputNumber min={0} max={100} disabled={role === 'ACCOUNTANT'} style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item
            noStyle
            shouldUpdate={(prevValues, currentValues) => prevValues.stage !== currentValues.stage}
          >
            {({ getFieldValue }) => (
              <Form.Item name="notes" label="Notes" rules={[]}>
                <Input disabled={role === 'ACCOUNTANT' || getFieldValue('stage') !== 'other'} placeholder="Add details if 'Other'" />
              </Form.Item>
            )}
          </Form.Item>
        </Form>
      </Modal>
    </Card>
  );
};

const VillaDetail = () => {
  const { villaId } = useParams();
  const { state } = useAppContext();
  const companyId = state.currentCompany;
  const [villa, setVilla] = useState(null);
  const [loading, setLoading] = useState(false);

  const fetchVilla = async () => {
    setLoading(true);
    try {
      const response = await request.read({ entity: 'villa', id: villaId });
      if (response.success) {
        setVilla(response.result);
      }
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  };

  useEffect(() => {
    if (villaId) {
      fetchVilla();
    }
  }, [villaId]);

  return (
    <div style={{ padding: '20px' }}>
      <Row gutter={[24, 24]}>
        <Col span={24}>
          <Card title="Villa Details" loading={loading}>
            {villa ? (
              <Descriptions bordered column={{ xxl: 3, xl: 3, lg: 3, md: 2, sm: 1, xs: 1 }}>
                <Descriptions.Item label="Villa Number">{villa.villaNumber}</Descriptions.Item>
                <Descriptions.Item label="House Type">{villa.houseType}</Descriptions.Item>
                <Descriptions.Item label="Status">
                  <Tag color={villa.status === 'available' ? 'green' : villa.status === 'booked' ? 'orange' : 'blue'}>
                    {villa.status.toUpperCase()}
                  </Tag>
                </Descriptions.Item>
                <Descriptions.Item label="Land Area">{villa.landArea || 0} sqft</Descriptions.Item>
                <Descriptions.Item label="Ground Floor">{villa.groundFloorArea || 0} sqft</Descriptions.Item>
                <Descriptions.Item label="1st Floor">{villa.firstFloorArea || 0} sqft</Descriptions.Item>
                <Descriptions.Item label="Total Built Up Area">{villa.builtUpArea || 0} sqft</Descriptions.Item>
                <Descriptions.Item label="Facing">{villa.facing}</Descriptions.Item>
                <Descriptions.Item label="Accountable (White)">
                  {villa.accountableAmount?.toLocaleString()}
                </Descriptions.Item>
                <Descriptions.Item label="Non Accountable (Black)">
                  {villa.nonAccountableAmount?.toLocaleString()}
                </Descriptions.Item>
                <Descriptions.Item label="Total Amount">
                  <strong>{villa.totalAmount?.toLocaleString()}</strong>
                </Descriptions.Item>
                {villa.status === 'booked' && villa.booking && (
                  <>
                    <Descriptions.Item label="Customer Name" span={2}>
                      <b style={{ color: '#1890ff' }}>{villa.booking.client?.name}</b>
                    </Descriptions.Item>
                    <Descriptions.Item label="Customer Phone">
                      {villa.booking.client?.phone}
                    </Descriptions.Item>
                  </>
                )}
              </Descriptions>
            ) : (
              <span>No villa data found.</span>
            )}
          </Card>
        </Col>
        <Col span={24}>
          <VillaProgressSection
            companyId={villa?.companyId?._id || villa?.companyId || companyId}
            villaId={villaId}
          />
        </Col>
      </Row>
    </div>
  );
};

export default VillaDetail;
