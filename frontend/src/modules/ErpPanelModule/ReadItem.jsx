import { useState, useEffect } from 'react';
import { Divider } from 'antd';

import { Button, Row, Col, Descriptions, Statistic, Tag, Form } from 'antd';
import numberToWords from '@/utils/numberToWords';
import { PageHeader } from '@ant-design/pro-layout';
import {
  EditOutlined,
  FilePdfOutlined,
  CloseCircleOutlined,
  RetweetOutlined,
  MailOutlined,
  WhatsAppOutlined,
} from '@ant-design/icons';

import { useSelector, useDispatch } from 'react-redux';
import useLanguage from '@/locale/useLanguage';
import { erp } from '@/redux/erp/actions';

import { nanoid as uniqueId } from 'nanoid';

import { selectCurrentItem } from '@/redux/erp/selectors';

import { DOWNLOAD_BASE_URL } from '@/config/serverApiConfig';
import { useMoney, useDate } from '@/settings';
import useMail from '@/hooks/useMail';
import { useNavigate } from 'react-router-dom';
import WhatsAppModal from '@/components/WhatsAppModal';

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
        <p
          style={{
            textAlign: 'right',
          }}
        >
          {moneyFormatter({ amount: item.price, currency_code: currentErp.currency })}
        </p>
      </Col>
      <Col className="gutter-row" span={4}>
        <p
          style={{
            textAlign: 'right',
          }}
        >
          {item.quantity}
        </p>
      </Col>
      <Col className="gutter-row" span={5}>
        <p
          style={{
            textAlign: 'right',
            fontWeight: '700',
          }}
        >
          {moneyFormatter({ amount: item.total, currency_code: currentErp.currency })}
        </p>
      </Col>
      <Divider dashed style={{ marginTop: 0, marginBottom: 15 }} />
    </Row>
  );
};

import storePersist from '@/redux/storePersist';

export default function ReadItem({ config, selectedItem, ReadForm }) {
  const translate = useLanguage();
  const { entity, ENTITY_NAME } = config;
  const dispatch = useDispatch();
  const navigate = useNavigate();

  const { moneyFormatter } = useMoney();
  const { send, isLoading: mailInProgress } = useMail({ entity });

  const isTransaction = ['invoice', 'quote', 'purchaseorder', 'payment'].includes(
    entity.toLowerCase()
  );

  const resetErp = {
    status: '',
    client: {
      name: '',
      email: '',
      phone: '',
      address: '',
    },
    subTotal: 0,
    taxTotal: 0,
    taxRate: 0,
    total: 0,
    credit: 0,
    number: 0,
    year: 0,
  };

  const [itemslist, setItemsList] = useState([]);
  const [currentErp, setCurrentErp] = useState(selectedItem ?? resetErp);
  const [client, setClient] = useState({});
  const [isWhatsAppOpen, setIsWhatsAppOpen] = useState(false);

  useEffect(() => {
    if (selectedItem) {
      const { items, invoice, ...others } = selectedItem;

      if (Array.isArray(items)) {
        setItemsList(items);
        setCurrentErp(selectedItem);
      } else if (invoice && Array.isArray(invoice.items)) {
        setItemsList(invoice.items);
        setCurrentErp({ ...others, ...invoice });
      } else {
        setItemsList([]);
        setCurrentErp(selectedItem);
      }
    }
  }, [selectedItem]);

  useEffect(() => {
    if (currentErp?.client) {
      setClient(currentErp.client);
    } else {
      setClient({});
    }
  }, [currentErp]);

  const itemNumber = currentErp?.number || '';
  const itemYear = currentErp?.year || '';
  const itemStatus = currentErp?.status || '';
  const itemPaymentStatus = currentErp?.paymentStatus || '';

  return (
    <>
      <PageHeader
        onBack={() => {
          navigate(`/${entity.toLowerCase()}`);
        }}
        title={`${ENTITY_NAME} ${isTransaction ? `# ${itemNumber}/${itemYear}` : ''}`}
        ghost={false}
        tags={[
          <span key="status">{itemStatus && translate(itemStatus)}</span>,
          itemPaymentStatus && (
            <span key="paymentStatus">
              {itemPaymentStatus && translate(itemPaymentStatus)}
            </span>
          ),
        ]}
        extra={[
          <Button
            key={`${uniqueId()}`}
            onClick={() => {
              navigate(`/${entity.toLowerCase()}`);
            }}
            icon={<CloseCircleOutlined />}
          >
            {translate('Close')}
          </Button>,
          isTransaction && (
            <Button
              key={`${uniqueId()}`}
              onClick={() => {
                const auth = storePersist.get('auth');
                const token = auth?.current?.token || '';
                window.open(
                  `${DOWNLOAD_BASE_URL}${entity}/${entity}-${currentErp?._id}.pdf?token=${token}`,
                  '_blank'
                );
              }}
              icon={<FilePdfOutlined />}
            >
              {translate('Download PDF')}
            </Button>
          ),
           isTransaction && (
            <Button
              key={`${uniqueId()}`}
              loading={mailInProgress}
              onClick={() => {
                send(currentErp?._id);
              }}
              icon={<MailOutlined />}
            >
              {translate('Send by Email')}
            </Button>
          ),
          isTransaction && (
            <Button
              key={`${uniqueId()}`}
              onClick={() => {
                setIsWhatsAppOpen(true);
              }}
              icon={<WhatsAppOutlined />}
            >
              {translate('Send via WhatsApp')}
            </Button>
          ),
          <Button
            key={`${uniqueId()}`}
            onClick={() => {
              dispatch(erp.convert({ entity, id: currentErp?._id }));
            }}
            icon={<RetweetOutlined />}
            style={{ display: entity === 'quote' ? 'inline-block' : 'none' }}
          >
            {translate('Convert to Invoice')}
          </Button>,

          <Button
            key={`${uniqueId()}`}
            onClick={() => {
              dispatch(
                erp.currentAction({
                  actionType: 'update',
                  data: currentErp,
                })
              );
              navigate(`/${entity.toLowerCase()}/update/${currentErp?._id}`);
            }}
            type="primary"
            icon={<EditOutlined />}
          >
            {translate('Edit')}
          </Button>,
        ]}
        style={{
          padding: '20px 0px',
        }}
      >
        {isTransaction && (
          <Row gutter={[16, 16]} align="middle" style={{ marginBottom: 10 }}>
            <Col>
              <Statistic title="Status" value={itemStatus} />
            </Col>
            <Col style={{ marginLeft: 32 }}>
              <Statistic
                title={translate('SubTotal')}
                value={moneyFormatter({
                  amount: currentErp?.subTotal || 0,
                  currency_code: currentErp?.currency,
                })}
              />
              {currentErp?.subTotal > 0 && (
                <div style={{ fontSize: '11px', color: '#888', fontStyle: 'italic', marginTop: '2px' }}>
                  {numberToWords(currentErp.subTotal)}
                </div>
              )}
            </Col>
            <Col style={{ marginLeft: 32 }}>
              <Statistic
                title={translate('Total')}
                value={moneyFormatter({ amount: currentErp?.total || 0, currency_code: currentErp?.currency })}
              />
              {currentErp?.total > 0 && (
                <div style={{ fontSize: '11px', color: '#888', fontStyle: 'italic', marginTop: '2px' }}>
                  {numberToWords(currentErp.total)}
                </div>
              )}
            </Col>
            <Col style={{ marginLeft: 32 }}>
              <Statistic
                title={translate('Paid')}
                value={moneyFormatter({
                  amount: currentErp?.credit || 0,
                  currency_code: currentErp?.currency,
                })}
              />
              {currentErp?.credit > 0 && (
                <div style={{ fontSize: '11px', color: '#888', fontStyle: 'italic', marginTop: '2px' }}>
                  {numberToWords(currentErp.credit)}
                </div>
              )}
            </Col>
          </Row>
        )}
      </PageHeader>
      <Divider dashed />
      {!isTransaction && ReadForm ? (
        <Form initialValues={currentErp} layout="vertical" disabled={true}>
          <ReadForm isUpdateForm={true} />
        </Form>
      ) : (
        <>
          <Descriptions title={`Details : ${currentErp?.name || currentErp?.client?.name || ''}`}>
            <Descriptions.Item label={translate('Address')}>{client?.address || ''}</Descriptions.Item>
            <Descriptions.Item label={translate('email')}>{client?.email || ''}</Descriptions.Item>
            <Descriptions.Item label={translate('Phone')}>{client?.phone || ''}</Descriptions.Item>
            {currentErp?.reference && (
              <Descriptions.Item label={translate('Reference')}>{currentErp.reference}</Descriptions.Item>
            )}
            {currentErp?.villa && (
              <Descriptions.Item label={translate('Villa')}>{currentErp.villa.villaNumber}</Descriptions.Item>
            )}
            {entity.toLowerCase() === 'payment' && currentErp?.ledger && (
              <Descriptions.Item label={translate('Account')}>
                <Tag color={currentErp.ledger === 'internal' ? 'volcano' : 'blue'}>
                  {currentErp.ledger === 'internal' ? 'Internal (Black)' : 'Official (White)'}
                </Tag>
              </Descriptions.Item>
            )}
          </Descriptions>
          <Divider />
          <Row gutter={[12, 0]}>
            <Col className="gutter-row" span={11}>
              <p>
                <strong>{translate('Product')}</strong>
              </p>
            </Col>
            <Col className="gutter-row" span={4}>
              <p
                style={{
                  textAlign: 'right',
                }}
              >
                <strong>{translate('Price')}</strong>
              </p>
            </Col>
            <Col className="gutter-row" span={4}>
              <p
                style={{
                  textAlign: 'right',
                }}
              >
                <strong>{translate('Quantity')}</strong>
              </p>
            </Col>
            <Col className="gutter-row" span={5}>
              <p
                style={{
                  textAlign: 'right',
                }}
              >
                <strong>{translate('Total')}</strong>
              </p>
            </Col>
            <Divider />
          </Row>
          {Array.isArray(itemslist) && itemslist.map((item) => (
            <Item key={item?._id || uniqueId()} item={item} currentErp={currentErp}></Item>
          ))}
          <div
            style={{
              width: '300px',
              float: 'right',
              textAlign: 'right',
              fontWeight: '700',
            }}
          >
            <Row gutter={[12, -5]}>
              <Col className="gutter-row" span={12}>
                <p>{translate('Sub Total')} :</p>
              </Col>

              <Col className="gutter-row" span={12}>
                <p>
                  {moneyFormatter({ amount: currentErp?.subTotal || 0, currency_code: currentErp?.currency })}
                </p>
              </Col>
              <Col className="gutter-row" span={12}>
                <p>
                  {translate('Tax Total')} ({currentErp?.taxRate || 0} %) :
                </p>
              </Col>
              <Col className="gutter-row" span={12}>
                <p>
                  {moneyFormatter({ amount: currentErp?.taxTotal || 0, currency_code: currentErp?.currency })}
                </p>
              </Col>
              <Col className="gutter-row" span={12}>
                <p>{translate('Total')} :</p>
              </Col>
              <Col className="gutter-row" span={12}>
                <p>
                  {moneyFormatter({ amount: currentErp?.total || 0, currency_code: currentErp?.currency })}
                </p>
              </Col>
              {currentErp?.total > 0 && (
                <Col span={24} style={{ marginTop: '8px' }}>
                  <div style={{ fontSize: '11px', color: '#888', fontStyle: 'italic', textAlign: 'right' }}>
                    {numberToWords(currentErp.total)}
                  </div>
                </Col>
              )}
            </Row>
          </div>
        </>
      )}
      <WhatsAppModal
        isOpen={isWhatsAppOpen}
        onClose={() => setIsWhatsAppOpen(false)}
        currentErp={currentErp}
        entity={entity}
      />
    </>
  );
}
