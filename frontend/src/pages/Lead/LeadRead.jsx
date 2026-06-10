import React, { useState, useEffect } from 'react';
import { Card, Descriptions, Steps, Button, Tag, Divider, Input, Modal, Form, Space } from 'antd';
import { ArrowLeftOutlined, EditOutlined, CheckCircleOutlined, UserAddOutlined } from '@ant-design/icons';
import { useNavigate, useParams } from 'react-router-dom';
import { request } from '@/request';
import { message, modal as AntdModal } from '@/utils/antdGlobal';
import dayjs from 'dayjs';
import { useUserRole } from '@/hooks/useUserRole';
import LeadForm from '@/forms/LeadForm';
import CustomerForm from '@/forms/CustomerForm';

const { Step } = Steps;

export default function LeadRead() {
    const { id } = useParams();
    const navigate = useNavigate();
    const [lead, setLead] = useState(null);
    const [loading, setLoading] = useState(true);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [isConvertModalOpen, setIsConvertModalOpen] = useState(false);

    // For notes
    const [noteText, setNoteText] = useState('');
    const [savingNote, setSavingNote] = useState(false);

    const { role } = useUserRole();
    const canEdit = role === 'OWNER' || role === 'ENGINEER' || role === 'MANAGER';
    const canConvert = role === 'OWNER' || role === 'MANAGER';

    useEffect(() => {
        fetchLead();
        // eslint-disable-next-line
    }, [id]);

    const fetchLead = async () => {
        setLoading(true);
        try {
            const data = await request.read({ entity: 'lead', id });
            if (data.success) {
                setLead(data.result);
            } else {
                message.error('Lead not found');
                navigate('/lead');
            }
        } catch (e) {
            message.error('Error fetching lead');
        }
        setLoading(false);
    };

    const currentStep = () => {
        if (!lead) return 0;
        const map = {
            'New': 0,
            'Contacted': 1,
            'Site Visit': 2,
            'Negotiation': 3,
            'Converted': 4,
            'Lost': 4 // Lost is also a terminal state
        };
        return map[lead.status] || 0;
    };

    const getStatusStatus = (stepStatus) => {
        // Determine if step is wait, process, finish based on current status
        // Simple logic handled by "current" index of Steps
        if (lead?.status === 'Lost') return 'error';
        return 'process';
    };

    const handleNoteSave = async () => {
        if (!noteText.trim()) return;
        setSavingNote(true);
        try {
            // Append note to existing notes
            const newNotes = (lead.notes || '') + '\n' + `[${dayjs().format('DD-MMM HH:mm')}] ${noteText}`;
            await request.update({ entity: 'lead', id, jsonData: { notes: newNotes } });
            message.success('Note added');
            setNoteText('');
            fetchLead();
        } catch (e) {
            message.error('Failed to save note');
        }
        setSavingNote(false);
    };

    const handleConvert = () => {
        setIsConvertModalOpen(true);
    };

    if (loading) return <Card loading />;
    if (!lead) return null;

    return (
        <div>
            <Button
                icon={<ArrowLeftOutlined />}
                onClick={() => navigate('/lead')}
                style={{ marginBottom: 16 }}
            >
                Back to Leads
            </Button>

            <Card
                title={<span style={{ fontSize: 20 }}>{lead.name}</span>}
                extra={canEdit && (
                    <Space>
                        <Button icon={<EditOutlined />} onClick={() => setIsEditModalOpen(true)}>Edit</Button>
                        {canConvert && lead.status !== 'Converted' && (
                            <Button
                                type="primary"
                                icon={<UserAddOutlined />}
                                onClick={handleConvert}
                                disabled={lead.status === 'Lost'}
                            >
                                Convert to Customer
                            </Button>
                        )}
                    </Space>
                )}
            >
                <Steps
                    current={currentStep()}
                    status={getStatusStatus()}
                    size="small"
                    style={{ marginBottom: 40 }}
                >
                    <Step title="New" />
                    <Step title="Contacted" />
                    <Step title="Site Visit" />
                    <Step title="Negotiation" />
                    <Step title={lead.status === 'Lost' ? 'Lost' : 'Converted'} icon={lead.status === 'Converted' ? <CheckCircleOutlined /> : null} />
                </Steps>

                <Descriptions bordered column={{ xxl: 4, xl: 3, lg: 3, md: 3, sm: 2, xs: 1 }}>
                    <Descriptions.Item label="Status">
                        <Tag color={lead.status === 'Converted' ? 'green' : 'blue'}>{lead.status}</Tag>
                    </Descriptions.Item>
                    <Descriptions.Item label="Phone">{lead.phone}</Descriptions.Item>
                    <Descriptions.Item label="Email">{lead.email || '-'}</Descriptions.Item>
                    <Descriptions.Item label="Source">{lead.source}</Descriptions.Item>
                    <Descriptions.Item label="Interested In">{lead.interestedVillaType}</Descriptions.Item>
                    <Descriptions.Item label="Created At">{dayjs(lead.created).format('DD MMM YYYY')}</Descriptions.Item>
                </Descriptions>

                <Divider orientation="left">Activity & Notes</Divider>

                <div style={{ whiteSpace: 'pre-wrap', background: '#f5f5f5', padding: 16, borderRadius: 8, marginBottom: 16, maxHeight: 300, overflowY: 'auto' }}>
                    {lead.notes || 'No notes yet.'}
                </div>

                {canEdit && (
                    <div style={{ display: 'flex', gap: 8 }}>
                        <Input
                            placeholder="Add a new follow-up note..."
                            value={noteText}
                            onChange={e => setNoteText(e.target.value)}
                            onPressEnter={handleNoteSave}
                        />
                        <Button type="primary" onClick={handleNoteSave} loading={savingNote}>Add Note</Button>
                    </div>
                )}
            </Card>

            {/* Edit Modal */}
            {isEditModalOpen && (
                <LeadEditModal
                    open={isEditModalOpen}
                    onCancel={() => setIsEditModalOpen(false)}
                    lead={lead}
                    onSuccess={() => {
                        setIsEditModalOpen(false);
                        fetchLead();
                    }}
                />
            )}

            {/* Convert Modal */}
            {isConvertModalOpen && (
                <LeadConvertModal
                    open={isConvertModalOpen}
                    onCancel={() => setIsConvertModalOpen(false)}
                    lead={lead}
                    onSuccess={(newCustomer) => {
                        setIsConvertModalOpen(false);
                        fetchLead();
                        if (newCustomer?._id) {
                            navigate(`/customer/read/${newCustomer._id}`);
                        }
                    }}
                />
            )}
        </div>
    );
}

function LeadEditModal({ open, onCancel, lead, onSuccess }) {
    const [form] = Form.useForm();
    const [loading, setLoading] = useState(false);

    // Populate form when modal opens
    useEffect(() => {
        if (open && lead) {
            form.setFieldsValue(lead);
        }
    }, [open, lead, form]);

    const handleSubmit = async () => {
        try {
            const values = await form.validateFields();
            setLoading(true);
            await request.update({ entity: 'lead', id: lead._id, jsonData: values });
            message.success('Lead updated');
            onSuccess();
        } catch (e) {
            message.error('Failed to update');
        }
        setLoading(false);
    };

    return (
        <Modal
            title="Edit Lead"
            open={open}
            onCancel={onCancel}
            onOk={handleSubmit}
            confirmLoading={loading}
        >
            <Form form={form} layout="vertical">
                <LeadForm isUpdateForm={true} />
            </Form>
        </Modal>
    );
}

function LeadConvertModal({ open, onCancel, lead, onSuccess }) {
    const [form] = Form.useForm();
    const [loading, setLoading] = useState(false);

    // Populate form with lead basic info when modal opens
    useEffect(() => {
        if (open && lead) {
            form.setFieldsValue({
                name: lead.name,
                phone: lead.phone,
                email: lead.email,
            });
        }
    }, [open, lead, form]);

    const handleSubmit = async () => {
        try {
            const values = await form.validateFields();
            setLoading(true);
            const data = await request.convert({ entity: 'lead', id: lead._id, jsonData: values });
            if (data.success) {
                onSuccess(data.result);
            }
        } catch (e) {
            const { response } = e;
            message.error(response?.data?.message || 'Conversion failed');
        }
        setLoading(false);
    };

    return (
        <Modal
            title="Convert Lead to Customer"
            open={open}
            onCancel={onCancel}
            onOk={handleSubmit}
            confirmLoading={loading}
            width={800}
            style={{ top: 20 }}
            okText="Save Customer"
        >
            <Form form={form} layout="vertical">
                <CustomerForm isUpdateForm={false} />
            </Form>
        </Modal>
    );
}
