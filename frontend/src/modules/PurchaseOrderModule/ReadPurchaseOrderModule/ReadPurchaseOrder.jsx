import { useState, useEffect } from 'react';
import { Divider, Button, Row, Col, Descriptions, Statistic, Modal, Input, App, Popconfirm, Alert, InputNumber } from 'antd';
import { PageHeader } from '@ant-design/pro-layout';
import {
    EditOutlined,
    CloseCircleOutlined,
    CheckCircleOutlined,
    SendOutlined,
    StopOutlined,
    DownloadOutlined
} from '@ant-design/icons';

import { useSelector, useDispatch } from 'react-redux';
import useLanguage from '@/locale/useLanguage';
import { erp } from '@/redux/erp/actions';
import { selectCurrentItem } from '@/redux/erp/selectors';
import { selectCurrentAdmin } from '@/redux/auth/selectors';
import { useMoney } from '@/settings';
import { useNavigate } from 'react-router-dom';
import { request } from '@/request';

const Item = ({ item, currentErp }) => {
    const { moneyFormatter } = useMoney();
    return (
        <Row gutter={[12, 0]} key={item._id}>
            <Col className="gutter-row" span={11}>
                <p style={{ marginBottom: 5 }}>
                    <strong>{item.itemName}</strong>
                </p>
                <p>{item.description}</p>
            </Col>
            <Col className="gutter-row" span={4}>
                <p style={{ textAlign: 'right' }}>
                    {moneyFormatter({ amount: item.price, currency_code: currentErp.currency })}
                </p>
            </Col>
            <Col className="gutter-row" span={4}>
                <p style={{ textAlign: 'right' }}>
                    {item.quantity}
                </p>
            </Col>
            <Col className="gutter-row" span={5}>
                <p style={{ textAlign: 'right', fontWeight: '700' }}>
                    {moneyFormatter({ amount: item.amount || item.total, currency_code: currentErp.currency })}
                </p>
            </Col>
            <Divider dashed style={{ marginTop: 0, marginBottom: 15 }} />
        </Row>
    );
};

export default function ReadPurchaseOrder({ config }) {
    const { message } = App.useApp();
    const translate = useLanguage();
    const { entity, ENTITY_NAME } = config;
    const dispatch = useDispatch();
    const navigate = useNavigate();
    const { moneyFormatter } = useMoney();

    const { result: currentResult } = useSelector(selectCurrentItem);
    const currentAdmin = useSelector(selectCurrentAdmin);
    const role = currentAdmin?.role;

    const [currentErp, setCurrentErp] = useState(currentResult || {});
    const [itemslist, setItemsList] = useState([]);

    // Modal for Rejection
    const [isRejectModalVisible, setIsRejectModalVisible] = useState(false);
    const [rejectReason, setRejectReason] = useState('');

    // Modal for Receive Goods (GRN)
    const [isReceiveModalVisible, setIsReceiveModalVisible] = useState(false);
    const [receiveItems, setReceiveItems] = useState([]);

    useEffect(() => {
        if (currentResult) {
            setCurrentErp(currentResult);
            setItemsList(currentResult.details || []);
        }
    }, [currentResult]);

    // Pre-populate receive items when modal opens
    useEffect(() => {
        if (isReceiveModalVisible && itemslist.length > 0) {
            setReceiveItems(itemslist.map(item => ({
                itemName: item.itemName,
                quantityReceived: item.quantity, // Default to full receipt
            })));
        }
    }, [isReceiveModalVisible, itemslist]);


    const handleAction = async (action, data = {}) => {
        try {
            await request.patch({ entity: entity + '/' + action, id: currentErp._id, jsonData: data });
            message.success(`${action} successful`);
            dispatch(erp.read({ entity, id: currentErp._id }));
            setIsRejectModalVisible(false);
        } catch (error) {
            console.error(error);
            message.error(error.message || 'Action failed');
        }
    };

    const handleReceiveGoods = async () => {
        try {
            // Call the goodsreceipt create API
            await request.create({
                entity: 'goodsreceipt',
                jsonData: {
                    purchaseOrderId: currentErp._id,
                    items: receiveItems,
                    notes: 'Generated from PO'
                }
            });
            message.success('Goods Received and Inventory Updated');
            setIsReceiveModalVisible(false);
            // Optionally refresh or navigate, but staying here is fine
        } catch (error) {
            message.error(error.message || 'Failed to receive goods');
        }
    };


    const getExtraButtons = () => {
        const buttons = [];

        buttons.push(
            <Button
                key="close"
                onClick={() => navigate(`/${entity.toLowerCase()}`)}
                icon={<CloseCircleOutlined />}
            >
                {translate('Close')}
            </Button>
        );

        // Edit - Only Engineer and Draft
        if (role === 'engineer' && currentErp.status === 'draft') {
            buttons.push(
                <Button
                    key="edit"
                    onClick={() => {
                        dispatch(erp.currentAction({ actionType: 'update', data: currentErp }));
                        navigate(`/${entity.toLowerCase()}/update/${currentErp._id}`);
                    }}
                    type="primary"
                    icon={<EditOutlined />}
                >
                    {translate('Edit')}
                </Button>
            );
            buttons.push(
                <Popconfirm
                    key="submit"
                    title="Are you sure you want to submit this Purchase Order?"
                    onConfirm={() => handleAction('submit')}
                    okText="Yes"
                    cancelText="No"
                >
                    <Button
                        type="primary"
                        style={{ backgroundColor: '#52c41a', borderColor: '#52c41a' }}
                        icon={<SendOutlined />}
                    >
                        {translate('Submit')}
                    </Button>
                </Popconfirm>
            );
        }

        // Approve/Reject - Only Owner and Submitted
        if (role === 'owner' && currentErp.status === 'submitted') {
            buttons.push(
                <Popconfirm
                    key="approve"
                    title="Are you sure you want to approve this Purchase Order?"
                    onConfirm={() => handleAction('approve')}
                    okText="Yes"
                    cancelText="No"
                >
                    <Button
                        type="primary"
                        style={{ backgroundColor: '#1890ff', borderColor: '#1890ff' }}
                        icon={<CheckCircleOutlined />}
                    >
                        {translate('Approve')}
                    </Button>
                </Popconfirm>
            );
            buttons.push(
                <Button
                    key="reject"
                    onClick={() => setIsRejectModalVisible(true)}
                    danger
                    icon={<StopOutlined />}
                >
                    {translate('Reject')}
                </Button>
            );
        }

        // Receive Goods - Visible if Approved (Ideally for Engineer or Store Manager)
        if (currentErp.status === 'approved') {
            buttons.push(
                <Button
                    key="receive"
                    onClick={() => setIsReceiveModalVisible(true)}
                    type="primary"
                    icon={<DownloadOutlined />}
                >
                    Receive Goods
                </Button>
            );
        }

        return buttons;
    };

    const rejectionLog = currentErp.auditLog?.find(log => log.status === 'rejected');

    return (
        <>
            <PageHeader
                onBack={() => navigate(`/${entity.toLowerCase()}`)}
                title={`${ENTITY_NAME} # ${currentErp.number}`}
                ghost={false}
                tags={[
                    <span key="status" style={{ textTransform: 'uppercase' }}>
                        {currentErp.status && translate(currentErp.status)}
                    </span>
                ]}
                extra={getExtraButtons()}
                style={{ padding: '20px 0px' }}
            >
                <Row>
                    <Statistic title="Status" value={currentErp.status} />
                    <Statistic
                        title={translate('Total')}
                        value={moneyFormatter({ amount: currentErp.total, currency_code: currentErp.currency })}
                        style={{ margin: '0 32px' }}
                    />
                </Row>
            </PageHeader>
            <Divider dashed />

            {currentErp.status === 'rejected' && rejectionLog && (
                <>
                    <Alert
                        message="Purchase Order Rejected"
                        description={
                            <div>
                                <strong>Reason:</strong> {rejectionLog.reason}
                                <br />
                                <strong>Date:</strong> {rejectionLog.date ? rejectionLog.date.substring(0, 10) : ''}
                            </div>
                        }
                        type="error"
                        showIcon
                        style={{ marginBottom: 20 }}
                    />
                    <Divider />
                </>
            )}

            <Descriptions title={`Vendor: ${currentErp.vendor}`}>
                <Descriptions.Item label={translate('Date')}>{currentErp.date ? currentErp.date.substring(0, 10) : ''}</Descriptions.Item>
            </Descriptions>
            <Divider />
            <Row gutter={[12, 0]}>
                <Col className="gutter-row" span={11}><p><strong>{translate('Item')}</strong></p></Col>
                <Col className="gutter-row" span={4}><p style={{ textAlign: 'right' }}><strong>{translate('Price')}</strong></p></Col>
                <Col className="gutter-row" span={4}><p style={{ textAlign: 'right' }}><strong>{translate('Quantity')}</strong></p></Col>
                <Col className="gutter-row" span={5}><p style={{ textAlign: 'right' }}><strong>{translate('Total')}</strong></p></Col>
                <Divider />
            </Row>
            {itemslist.map((item) => (
                <Item key={item._id || Math.random()} item={item} currentErp={currentErp}></Item>
            ))}
            <div style={{ width: '300px', float: 'right', textAlign: 'right', fontWeight: '700' }}>
                <Row gutter={[12, -5]}>
                    <Col className="gutter-row" span={12}><p>{translate('Total')} :</p></Col>
                    <Col className="gutter-row" span={12}>
                        <p>{moneyFormatter({ amount: currentErp.total, currency_code: currentErp.currency })}</p>
                    </Col>
                </Row>
            </div>

            <Modal
                title="Reject Purchase Order"
                visible={isRejectModalVisible}
                onOk={() => handleAction('reject', { reason: rejectReason })}
                onCancel={() => setIsRejectModalVisible(false)}
            >
                <p>Please enter the reason for rejection:</p>
                <Input.TextArea rows={4} value={rejectReason} onChange={e => setRejectReason(e.target.value)} />
            </Modal>

            {/* Goods Receipt Modal */}
            <Modal
                title="Receive Goods"
                visible={isReceiveModalVisible}
                onOk={handleReceiveGoods}
                onCancel={() => setIsReceiveModalVisible(false)}
                okText="Confirm Receipt"
                width={600}
            >
                <p>Confirm the quantity received for each item:</p>
                {receiveItems.map((item, index) => (
                    <Row key={index} style={{ marginBottom: 10 }} align="middle">
                        <Col span={12}><strong>{item.itemName}</strong></Col>
                        <Col span={12}>
                            <InputNumber
                                min={0}
                                value={item.quantityReceived}
                                onChange={(val) => {
                                    const newItems = [...receiveItems];
                                    newItems[index].quantityReceived = val;
                                    setReceiveItems(newItems);
                                }}
                            />
                        </Col>
                    </Row>
                ))}
            </Modal>
        </>
    );
}
