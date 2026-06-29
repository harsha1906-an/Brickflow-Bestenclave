import { useEffect, Fragment } from 'react';
import dayjs from 'dayjs';
import {
  EyeOutlined,
  EditOutlined,
  DeleteOutlined,
  FilePdfOutlined,
  RedoOutlined,
  PlusOutlined,
  EllipsisOutlined,
  ArrowRightOutlined,
  ArrowLeftOutlined,
  DownloadOutlined,
} from '@ant-design/icons';
import { Dropdown, Table, Button, App, Pagination, Skeleton } from 'antd'; // Added App import
import { PageHeader } from '@ant-design/pro-layout';
import axios from 'axios'; // Added axios import

import AutoCompleteAsync from '@/components/AutoCompleteAsync';
import { useSelector, useDispatch } from 'react-redux';
import useLanguage from '@/locale/useLanguage';
import { erp } from '@/redux/erp/actions';
import { selectListItems } from '@/redux/erp/selectors';
import { useErpContext } from '@/context/erp';
import { nanoid as uniqueId } from 'nanoid';
import { useNavigate } from 'react-router-dom';
import useMobile from '@/hooks/useMobile';
import { useThemeContext } from '@/context/ThemeContext';

import { DOWNLOAD_BASE_URL } from '@/config/serverApiConfig';

function AddNewItem({ config }) {
  const navigate = useNavigate();
  const { ADD_NEW_ENTITY, entity } = config;

  const handleClick = () => {
    navigate(`/${entity.toLowerCase()}/create`);
  };

  return (
    <Button onClick={handleClick} type="primary" icon={<PlusOutlined />}>
      {ADD_NEW_ENTITY}
    </Button>
  );
}

export default function DataTable({ config, extra = [], customFilters }) {
  const translate = useLanguage();
  let { entity, dataTableColumns, disableAdd = false, searchConfig } = config;

  const { DATATABLE_TITLE } = config;

  const { result: listResult, isLoading: listIsLoading } = useSelector(selectListItems);

  const { pagination, items: dataSource } = listResult;

  const { erpContextAction } = useErpContext();
  const { modal } = erpContextAction;
  const { message } = App.useApp(); // Use App hook for message

  const navigate = useNavigate();

  const handleRead = (record) => {
    dispatch(erp.currentItem({ data: record }));
    navigate(`/${entity}/read/${record._id}`);
  };
  const handleEdit = (record) => {
    const data = { ...record };
    dispatch(erp.currentAction({ actionType: 'update', data }));
    navigate(`/${entity}/update/${record._id}`);
  };

  const handleDelete = (record) => {
    dispatch(erp.currentAction({ actionType: 'delete', data: record }));
    modal.open();
  };

  const handleRecordPayment = (record) => {
    dispatch(erp.currentItem({ data: record }));
    navigate(`/invoice/pay/${record._id}`);
  };

  const handleDownloadCSV = () => {
    if (!dataSource || dataSource.length === 0) return;

    // Helper to flatten nested objects for CSV
    const getVal = (obj, path) => {
      if (Array.isArray(path)) {
        return path.reduce((prev, curr) => (prev ? prev[curr] : ''), obj);
      }
      return obj[path];
    };

    const headers = dataTableColumns.filter(c => c.title && c.dataIndex).map(c => c.title);
    const csvRows = [headers.join(',')];

    dataSource.forEach(record => {
      const row = dataTableColumns.filter(c => c.title && c.dataIndex).map(c => {
        let val = getVal(record, c.dataIndex) || '';
        // Clean values for CSV
        if (typeof val === 'string') val = `"${val.replace(/"/g, '""')}"`;
        return val;
      });
      csvRows.push(row.join(','));
    });

    const csvContent = "data:text/csv;charset=utf-8," + csvRows.join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `${entity}_list_${dayjs().format('YYYY-MM-DD')}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Build columns with actions
  const columnsWithActions = [
    ...dataTableColumns,
    {
      title: '',
      key: 'action',
      fixed: 'right',
      render: (_, record) => {
        const items = [
            {
              label: translate('Show'),
              key: 'read',
              icon: <EyeOutlined />,
              onClick: () => handleRead(record)
            },
            {
              label: translate('Edit'),
              key: 'edit',
              icon: <EditOutlined />,
              disabled: entity === 'booking' && record.paymentPlan?.some(p => (p.paidAmount || 0) > 0),
              onClick: () => handleEdit(record)
            },
            ...extra,
            {
              type: 'divider',
            },
        
            {
              label: translate('Delete'),
              key: 'delete',
              icon: <DeleteOutlined />,
              onClick: () => handleDelete(record)
            },
          ];
        return (
        <Dropdown
          menu={{
            items,
          }}
          trigger={['click']}
        >
          <EllipsisOutlined
            style={{ cursor: 'pointer', fontSize: '24px' }}
            onClick={(e) => e.preventDefault()}
          />
        </Dropdown>
      )},
    },
  ];

  const dispatch = useDispatch();

  const handelDataTableLoad = (pagination) => {
    const options = { page: pagination.current || 1, items: pagination.pageSize || 10 };
    dispatch(erp.list({ entity, options }));
  };

  const dispatcher = () => {
    dispatch(erp.list({ entity }));
  };

  useEffect(() => {
    const controller = new AbortController();
    dispatcher();
    return () => {
      controller.abort();
    };
  }, []);

  const filterTable = (value) => {
    const options = { equal: value, filter: searchConfig?.entity };
    dispatch(erp.list({ entity, options }));
  };

  const isMobile = useMobile();
  const { isDarkMode } = useThemeContext();

  const columnsWithLabels = columnsWithActions.map(col => {
    if (col.key === 'action' || !col.title) return col;
    return {
      ...col,
      onCell: (record, rowIndex) => {
        const baseProps = col.onCell ? col.onCell(record, rowIndex) : {};
        return {
          ...baseProps,
          'data-label': col.title,
        };
      }
    };
  });

  const getColValue = (col, record) => {
    const rawVal = Array.isArray(col.dataIndex) 
      ? col.dataIndex.reduce((p, c) => p?.[c], record)
      : record[col.dataIndex];
    return col.render ? col.render(rawVal, record) : rawVal;
  };

  const renderMobileCards = () => {
    const headerCol = dataTableColumns[0];
    const statusCol = dataTableColumns.find(c => c.dataIndex === 'status' || c.key === 'status');
    const priceCol = dataTableColumns.find(c => 
      c.dataIndex && (
        c.dataIndex === 'totalAmount' || 
        c.dataIndex === 'amount' || 
        c.dataIndex === 'total' || 
        c.dataIndex === 'price' ||
        c.dataIndex === 'dailyWage' ||
        (Array.isArray(c.dataIndex) && (c.dataIndex.includes('total') || c.dataIndex.includes('amount') || c.dataIndex.includes('price')))
      )
    );
    
    const detailCols = dataTableColumns.filter(c => 
      c !== headerCol && 
      c !== statusCol && 
      c !== priceCol && 
      c.title && 
      c.dataIndex
    );

    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {dataSource.map((record) => {
          const headerVal = getColValue(headerCol, record);
          const statusVal = statusCol ? getColValue(statusCol, record) : null;
          const priceVal = priceCol ? getColValue(priceCol, record) : null;

          return (
            <div 
              key={record._id} 
              className="soft-card-shadow"
              style={{
                background: isDarkMode ? '#1f1f1f' : '#ffffff',
                border: isDarkMode ? '1px solid #303030' : '1px solid #e7e8e9',
                borderRadius: '16px',
                padding: '20px',
                display: 'flex',
                flexDirection: 'column',
                gap: '16px',
                position: 'relative'
              }}
            >
              {/* Header Row */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <div style={{ fontSize: '10px', fontWeight: 'bold', color: '#888', letterSpacing: '0.05em', textTransform: 'uppercase', marginBottom: '4px' }}>
                    {headerCol.title}
                  </div>
                  <div style={{ fontSize: '16px', fontWeight: 'bold', color: isDarkMode ? '#fff' : '#191c1d' }}>
                    {headerVal || '-'}
                  </div>
                </div>
                {statusVal && (
                  <div>
                    {statusVal}
                  </div>
                )}
              </div>

              {/* Details Grid */}
              {detailCols.length > 0 && (
                <div style={{ 
                  display: 'grid', 
                  gridTemplateColumns: 'repeat(2, 1fr)', 
                  gap: '16px 12px',
                  padding: '4px 0'
                }}>
                  {detailCols.map((col, idx) => {
                    const val = getColValue(col, record);
                    return (
                      <div key={idx}>
                         <div style={{ fontSize: '10px', fontWeight: 'bold', color: '#888', letterSpacing: '0.05em', textTransform: 'uppercase', marginBottom: '2px' }}>
                           {col.title}
                         </div>
                         <div style={{ fontSize: '13px', color: isDarkMode ? '#ddd' : '#191c1d' }}>
                           {val || '-'}
                         </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Divider and Footer */}
              <div style={{ 
                borderTop: isDarkMode ? '1px solid #303030' : '1px solid #edeeef', 
                paddingTop: '16px', 
                display: 'flex', 
                justifyContent: 'space-between', 
                alignItems: 'center' 
              }}>
                {priceCol ? (
                  <div>
                    <div style={{ fontSize: '10px', fontWeight: 'bold', color: '#888', letterSpacing: '0.05em', textTransform: 'uppercase', marginBottom: '2px' }}>
                      {priceCol.title}
                    </div>
                    <div style={{ fontSize: '16px', fontWeight: 'bold', color: '#1890ff' }}>
                      {priceVal}
                    </div>
                  </div>
                ) : (
                  <div />
                )}

                {/* Dropdown Action Menu */}
                <div>
                  <Dropdown
                    menu={{
                      items: [
                        {
                          label: translate('Show'),
                          key: 'read',
                          icon: <EyeOutlined />,
                          onClick: () => handleRead(record)
                        },
                        {
                          label: translate('Edit'),
                          key: 'edit',
                          icon: <EditOutlined />,
                          disabled: entity === 'booking' && record.paymentPlan?.some(p => (p.paidAmount || 0) > 0),
                          onClick: () => handleEdit(record)
                        },
                        ...extra,
                        { type: 'divider' },
                        {
                          label: translate('Delete'),
                          key: 'delete',
                          icon: <DeleteOutlined />,
                          onClick: () => handleDelete(record)
                        }
                      ]
                    }}
                    trigger={['click']}
                  >
                    <Button 
                      type="text" 
                      shape="circle" 
                      icon={<EllipsisOutlined style={{ fontSize: '20px' }} />} 
                    />
                  </Dropdown>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  if (isMobile) {
    return (
      <div style={{ padding: '8px 0 24px 0' }}>
        {/* Title & Add Button Row */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <h2 style={{ fontSize: '20px', fontWeight: 'bold', margin: 0, color: isDarkMode ? '#fff' : '#191c1d' }}>
            {DATATABLE_TITLE}
          </h2>
          {!disableAdd && <AddNewItem config={config} />}
        </div>

        {/* Full-width Search Bar */}
        {searchConfig?.entity && (
          <div style={{ marginBottom: '16px', width: '100%' }}>
            <AutoCompleteAsync
              entity={searchConfig?.entity}
              displayLabels={['name']}
              searchFields={'name'}
              onChange={filterTable}
              style={{ width: '100%' }}
            />
          </div>
        )}

        {/* Refresh & CSV Buttons Row (compact icons) */}
        <div style={{ display: 'flex', gap: '8px', marginBottom: '16px', justifyContent: 'flex-end' }}>
          <Button size="small" onClick={handelDataTableLoad} icon={<RedoOutlined />}>
            {translate('Refresh')}
          </Button>
          <Button size="small" onClick={handleDownloadCSV} icon={<DownloadOutlined />}>
            {translate('Download CSV')}
          </Button>
        </div>

        {/* Mobile Card List */}
        {listIsLoading ? (
          <div style={{ padding: '40px 0', textAlign: 'center' }}>
            <Skeleton active paragraph={{ rows: 8 }} />
          </div>
        ) : dataSource.length === 0 ? (
          <Card style={{ textAlign: 'center', padding: '30px 0' }}>No items found</Card>
        ) : (
          renderMobileCards()
        )}

        {/* Compact Mobile Pagination */}
        {pagination && pagination.total > pagination.pageSize && (
          <Pagination
            current={pagination.current}
            pageSize={pagination.pageSize}
            total={pagination.total}
            onChange={(page, pageSize) => handelDataTableLoad({ current: page, pageSize })}
            size="small"
            style={{ marginTop: '20px', display: 'flex', justifyContent: 'center' }}
          />
        )}
      </div>
    );
  }

  return (
    <>
      <PageHeader
        title={DATATABLE_TITLE}
        ghost={true}
        onBack={() => window.history.back()}
        backIcon={<ArrowLeftOutlined />}
        extra={[
          <Fragment key={`${uniqueId()}`}>{customFilters}</Fragment>,
          <AutoCompleteAsync
            key={`${uniqueId()}`}
            entity={searchConfig?.entity}
            displayLabels={['name']}
            searchFields={'name'}
            onChange={filterTable}
          // redirectLabel={'Add New Client'}
          // withRedirect
          // urlToRedirect={'/customer'}
          />,
          <Button onClick={handleDownloadCSV} key={`${uniqueId()}`} icon={<DownloadOutlined />}>
            {translate('Download CSV')}
          </Button>,
          <Button onClick={handelDataTableLoad} key={`${uniqueId()}`} icon={<RedoOutlined />}>
            {translate('Refresh')}
          </Button>,

          !disableAdd && <AddNewItem config={config} key={`${uniqueId()}`} />,
        ]}
        style={{
          padding: '20px 0px',
        }}
      ></PageHeader>

      <Table
        columns={columnsWithLabels}
        rowKey={(item) => item._id}
        dataSource={dataSource}
        pagination={pagination}
        loading={listIsLoading}
        onChange={handelDataTableLoad}
        scroll={{ x: true }}
        className="mobile-card-table"
      />
    </>
  );
}
