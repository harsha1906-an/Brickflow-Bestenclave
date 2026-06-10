import React, { useEffect, useState } from 'react';
import { Table, Button, Modal, Tag, Switch, Select, Form, Input, App, Space, Tabs, Divider, Descriptions } from 'antd';
import useMoney from '@/settings/useMoney';
import { PlusOutlined, EditOutlined, EyeOutlined, DownloadOutlined, DeleteOutlined } from '@ant-design/icons';
import useLanguage from '@/locale/useLanguage';
import { useUserRole } from '@/hooks/useUserRole';
import { request } from '@/request';
import { useAppContext } from '@/context/appContext';
import LabourContractManager from './components/LabourContractManager';
import numberToWords from '@/utils/numberToWords';

const skillOptions = [
  { value: 'mason', label: 'Mason' },
  { value: 'electrician', label: 'Electrician' },
  { value: 'plumber', label: 'Plumber' },
  { value: 'helper', label: 'Helper' },
  { value: 'other', label: 'Other' },
];

const LabourList = () => {
  const { message } = App.useApp();
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [contractManagerOpen, setContractManagerOpen] = useState(false);
  const [selectedLabour, setSelectedLabour] = useState(null);
  const [viewDetailsOpen, setViewDetailsOpen] = useState(false);
  const [viewingLabour, setViewingLabour] = useState(null);
  const [form] = Form.useForm();
  const translate = useLanguage();
  const { moneyFormatter, currency_symbol } = useMoney();
  const { role } = useUserRole();
  const { state } = useAppContext();
  const companyId = state.currentCompany;
  const fetchLabour = async () => {
    if (!companyId) return;
    setLoading(true);
    try {
      const res = await request.get({ entity: `companies/${companyId}/labour` });
      if (Array.isArray(res)) {
        setData(res);
      } else {
        console.error('Labour fetch returned non-array:', res);
        setData([]);
      }
    } catch (e) {
      message.error('Failed to load labour list');
    }
    setLoading(false);
  };

  const handleDownloadAll = async () => {
    try {
      message.loading({ content: 'Generating List...', key: 'pdf_download' });
      const response = await request.pdf({ entity: `labour/pdf-list?company=${companyId}` });
      const blob = new Blob([response.data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `Labour_List.pdf`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      message.success({ content: 'List Downloaded', key: 'pdf_download' });
    } catch (error) {
      console.error(error);
      message.error({ content: 'Failed to download list', key: 'pdf_download' });
    }
  };

  useEffect(() => {
    if (companyId) {
      fetchLabour();
    }
    // eslint-disable-next-line
  }, [companyId]);

  const openModal = (record = null) => {
    setEditing(record);
    setModalOpen(true);
  };

  const openContractManager = (record) => {
    setSelectedLabour(record);
    setContractManagerOpen(true);
  };

  useEffect(() => {
    if (modalOpen) {
      if (editing) {
        form.setFieldsValue(editing);
      } else {
        form.resetFields();
      }
    }
  }, [modalOpen, editing, form]);

  const handleOk = async () => {
    try {
      const values = await form.validateFields();
      if (editing) {
        await request.patch({ entity: `companies/${companyId}/labour/${editing._id}`, jsonData: values });
        message.success('Labour updated');
      } else {
        await request.post({ entity: `companies/${companyId}/labour`, jsonData: values });
        message.success('Labour created');
      }
      setModalOpen(false);
      fetchLabour();
    } catch (e) {
      message.error('Failed to save labour');
    }
  };

  const columns = [
    {
      title: 'Name', dataIndex: 'name', key: 'name', render: (text, record) => (
        <Space>
          {text}
          {record.isSubstitute && <Tag color="blue">Substitute</Tag>}
        </Space>
      )
    },
    {
      title: 'Skill', dataIndex: 'skill', key: 'skill', render: (v, record) => {
        const skillLabel = skillOptions.find(o => o.value === v)?.label || v;
        return (
          <Space direction="vertical" size={0}>
            <span>{skillLabel}</span>
            {v === 'other' && record.customSkill && <Tag color="purple">{record.customSkill}</Tag>}
          </Space>
        );
      }
    },
    { title: 'Phone', dataIndex: 'phone', key: 'phone' },
    { title: 'Type', dataIndex: 'employmentType', key: 'employmentType', render: v => v ? v.charAt(0).toUpperCase() + v.slice(1) : 'Daily' },
    {
      title: 'Rate/Salary', key: 'rate', render: (_, record) => {
        if (record.employmentType === 'monthly') return `${moneyFormatter({ amount: record.monthlySalary })}/mo`;
        return `${moneyFormatter({ amount: record.dailyWage })}/day`;
      }
    },
    { title: 'Status', dataIndex: 'isActive', key: 'isActive', render: v => v ? <Tag color="green">Active</Tag> : <Tag color="red">Inactive</Tag> },
  ];
  if (role === 'OWNER' || role === 'ENGINEER') {
    columns.push({
      title: 'Action',
      key: 'action',
      render: (_, record) => (
        <Space>
          <Button icon={<EyeOutlined />} onClick={() => { setViewingLabour(record); setViewDetailsOpen(true); }} />
          <Button icon={<EditOutlined />} onClick={() => openModal(record)} />
          {record.employmentType === 'contract' && (
            <Button type="primary" onClick={() => openContractManager(record)}>
              Manage Contracts
            </Button>
          )}
        </Space>
      ),
    });
  }

  const filteredData = (type) => (Array.isArray(data) ? data : []).filter(item => {
    if (type === 'all') return true;
    return item.employmentType === type;
  });

  const tabItems = [
    { key: 'all', label: 'All Labour', children: <Table rowKey="_id" columns={columns} dataSource={data} loading={loading} /> },
    { key: 'daily', label: 'Daily Wage', children: <Table rowKey="_id" columns={columns} dataSource={filteredData('daily')} loading={loading} /> },
    { key: 'monthly', label: 'Monthly Salary', children: <Table rowKey="_id" columns={columns} dataSource={filteredData('monthly')} loading={loading} /> },
    { key: 'contract', label: 'Contract Based', children: <Table rowKey="_id" columns={columns} dataSource={filteredData('contract')} loading={loading} /> },
  ];

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <h2 style={{ margin: 0 }}>Labour Management</h2>
        <Space>
          <Button onClick={handleDownloadAll} icon={<DownloadOutlined />}>
            Download List
          </Button>
          {(role === 'OWNER' || role === 'ENGINEER') && (
            <Button type="primary" icon={<PlusOutlined />} onClick={() => openModal()}>
              Add Labour
            </Button>
          )}
        </Space>
      </div>

      <Tabs defaultActiveKey="all" items={tabItems} />
      <Modal
        title={editing ? 'Edit Labour' : 'Add Labour'}
        open={modalOpen}
        onOk={role === 'ACCOUNTANT' ? undefined : handleOk}
        onCancel={() => setModalOpen(false)}
        destroyOnClose
        okButtonProps={role === 'ACCOUNTANT' ? { disabled: true } : {}}
        width={600}
      >
        <Form form={form} layout="vertical" initialValues={{
          employmentType: 'daily',
          isActive: true,
          milestonePlan: [
            'Basement Level',
            'Slab Completion',
            'Brick Work',
            'Plastering',
            'Finishing'
          ]
        }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <Form.Item name="name" label="Name" rules={[{ required: true }]}>
              <Input disabled={role === 'ACCOUNTANT'} />
            </Form.Item>
            <Form.Item
              name="phone"
              label="Phone"
              rules={[
                {
                  pattern: /^[0-9]{10}$/,
                  message: 'Must be a valid 10-digit number',
                },
              ]}
            >
              <Input disabled={role === 'ACCOUNTANT'} />
            </Form.Item>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <Form.Item name="skill" label="Skill / Worker Type" rules={[{ required: true }]}>
              <Select options={skillOptions} disabled={role === 'ACCOUNTANT'} />
            </Form.Item>
            <Form.Item name="employmentType" label="Employment Type" rules={[{ required: true }]}>
              <Select
                options={[
                  { value: 'daily', label: 'Daily Wage' },
                  { value: 'monthly', label: 'Monthly Salary' },
                  { value: 'contract', label: 'Contract Based' },
                ]}
                disabled={role === 'ACCOUNTANT'}
              />
            </Form.Item>
          </div>

          <Form.Item noStyle shouldUpdate={(prev, curr) => prev.skill !== curr.skill}>
            {({ getFieldValue }) => {
              const skill = getFieldValue('skill');
              if (skill === 'other') {
                return (
                  <Form.Item
                    name="customSkill"
                    label="Specify Skill Type"
                    rules={[{ required: true, message: 'Please specify the skill type' }]}
                  >
                    <Input placeholder="Enter custom skill type" disabled={role === 'ACCOUNTANT'} />
                  </Form.Item>
                );
              }
              return null;
            }}
          </Form.Item>

          <Form.Item
            noStyle
            shouldUpdate={(prev, curr) => 
              prev.employmentType !== curr.employmentType ||
              prev.dailyWage !== curr.dailyWage ||
              prev.monthlySalary !== curr.monthlySalary
            }
          >
            {({ getFieldValue }) => {
              const type = getFieldValue('employmentType');
              if (type === 'daily') {
                const dailyWage = getFieldValue('dailyWage') || 0;
                return (
                  <Form.Item
                    name="dailyWage"
                    label="Daily Wage Rate"
                    rules={[{ required: true }]}
                    extra={dailyWage > 0 ? <div style={{ fontSize: '11px', color: '#888', fontStyle: 'italic', marginTop: '4px' }}>{numberToWords(dailyWage)}</div> : null}
                  >
                    <Input type="number" prefix={currency_symbol} disabled={role === 'ACCOUNTANT'} />
                  </Form.Item>
                );
              }
              if (type === 'monthly') {
                const monthlySalary = getFieldValue('monthlySalary') || 0;
                return (
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                    <Form.Item
                      name="monthlySalary"
                      label="Monthly Salary"
                      rules={[{ required: true }]}
                      extra={monthlySalary > 0 ? <div style={{ fontSize: '11px', color: '#888', fontStyle: 'italic', marginTop: '4px' }}>{numberToWords(monthlySalary)}</div> : null}
                    >
                      <Input type="number" prefix={currency_symbol} disabled={role === 'ACCOUNTANT'} />
                    </Form.Item>
                    <Form.Item name="paymentDay" label="Payment Day (of month)" rules={[{ required: true }]}>
                      <Input type="number" min={1} max={31} disabled={role === 'ACCOUNTANT'} />
                    </Form.Item>
                  </div>
                );
              }
              if (type === 'contract') {
                return (
                  <>
                    <Divider orientation="left">Milestone Plan</Divider>
                    <Form.List name="milestonePlan">
                      {(fields, { add, remove }) => (
                        <>
                          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                            {fields.map(({ key, name, ...restField }, index) => (
                              <div key={key} style={{ display: 'flex', gap: '8px', alignItems: 'flex-end', marginBottom: '12px' }}>
                                <Form.Item
                                  {...restField}
                                  name={name}
                                  label={`Stage ${index + 1}`}
                                  rules={[{ required: true, message: 'Required' }]}
                                  style={{ marginBottom: 0, flex: 1 }}
                                >
                                  <Input disabled={role === 'ACCOUNTANT'} placeholder={`Milestone ${index + 1}`} />
                                </Form.Item>
                                {fields.length > 1 && (
                                  <Button
                                    type="text"
                                    danger
                                    disabled={role === 'ACCOUNTANT'}
                                    icon={<DeleteOutlined />}
                                    onClick={() => remove(name)}
                                    style={{ marginBottom: '4px' }}
                                  />
                                )}
                              </div>
                            ))}
                          </div>
                          <Form.Item style={{ marginTop: '12px' }}>
                            <Button
                              type="dashed"
                              onClick={() => add()}
                              disabled={role === 'ACCOUNTANT'}
                              block
                              icon={<PlusOutlined />}
                            >
                              Add Stage
                            </Button>
                          </Form.Item>
                        </>
                      )}
                    </Form.List>
                  </>
                );
              }
              return null;
            }}
          </Form.Item>

          <Form.Item name="notes" label="Notes">
            <Input.TextArea rows={3} placeholder="Additional notes..." disabled={role === 'ACCOUNTANT'} />
          </Form.Item>

          <div style={{ display: 'flex', gap: '24px', marginTop: '8px' }}>
            <Form.Item name="isActive" label="Account Status" valuePropName="checked">
              <Switch checkedChildren="Active" unCheckedChildren="Inactive" disabled={role === 'ACCOUNTANT'} />
            </Form.Item>
            <Form.Item name="isSubstitute" label="Substitute Worker" valuePropName="checked">
              <Switch checkedChildren="Yes" unCheckedChildren="No" disabled={role === 'ACCOUNTANT'} />
            </Form.Item>
          </div>
        </Form>
      </Modal>

      <Modal
        title="Labour Details"
        open={viewDetailsOpen}
        onCancel={() => setViewDetailsOpen(false)}
        footer={[
          <Button key="close" onClick={() => setViewDetailsOpen(false)}>Close</Button>
        ]}
        width={700}
      >
        {viewingLabour && (
          <Descriptions bordered column={2}>
            <Descriptions.Item label="Name" span={2}>{viewingLabour.name}</Descriptions.Item>
            <Descriptions.Item label="Skill">
              {skillOptions.find(o => o.value === viewingLabour.skill)?.label || viewingLabour.skill}
            </Descriptions.Item>
            {viewingLabour.skill === 'other' && viewingLabour.customSkill && (
              <Descriptions.Item label="Custom Skill">{viewingLabour.customSkill}</Descriptions.Item>
            )}
            <Descriptions.Item label="Phone">{viewingLabour.phone || '-'}</Descriptions.Item>
            <Descriptions.Item label="Employment Type">
              {viewingLabour.employmentType ? viewingLabour.employmentType.charAt(0).toUpperCase() + viewingLabour.employmentType.slice(1) : 'Daily'}
            </Descriptions.Item>
            {viewingLabour.employmentType === 'daily' && (
              <Descriptions.Item label="Daily Wage">
                <div>{moneyFormatter({ amount: viewingLabour.dailyWage })}</div>
                {viewingLabour.dailyWage > 0 && (
                  <div style={{ fontSize: '11px', color: '#888', fontStyle: 'italic', marginTop: '4px' }}>
                    {numberToWords(viewingLabour.dailyWage)}
                  </div>
                )}
              </Descriptions.Item>
            )}
            {viewingLabour.employmentType === 'monthly' && (
              <>
                <Descriptions.Item label="Monthly Salary">
                  <div>{moneyFormatter({ amount: viewingLabour.monthlySalary })}</div>
                  {viewingLabour.monthlySalary > 0 && (
                    <div style={{ fontSize: '11px', color: '#888', fontStyle: 'italic', marginTop: '4px' }}>
                      {numberToWords(viewingLabour.monthlySalary)}
                    </div>
                  )}
                </Descriptions.Item>
                <Descriptions.Item label="Payment Day">
                  Day {viewingLabour.paymentDay}
                </Descriptions.Item>
              </>
            )}
            {viewingLabour.employmentType === 'contract' && viewingLabour.milestonePlan && (
              <Descriptions.Item label="Milestone Plan" span={2}>
                <ol>
                  {viewingLabour.milestonePlan.map((milestone, idx) => (
                    <li key={idx}>{milestone}</li>
                  ))}
                </ol>
              </Descriptions.Item>
            )}
            <Descriptions.Item label="Status">
              {viewingLabour.isActive ? <Tag color="green">Active</Tag> : <Tag color="red">Inactive</Tag>}
            </Descriptions.Item>
            <Descriptions.Item label="Substitute Worker">
              {viewingLabour.isSubstitute ? 'Yes' : 'No'}
            </Descriptions.Item>
            {viewingLabour.notes && (
              <Descriptions.Item label="Notes" span={2}>{viewingLabour.notes}</Descriptions.Item>
            )}
          </Descriptions>
        )}
      </Modal>

      <LabourContractManager
        visible={contractManagerOpen}
        onCancel={() => setContractManagerOpen(false)}
        labour={selectedLabour}
      />
    </div>
  );
};

export default LabourList;
