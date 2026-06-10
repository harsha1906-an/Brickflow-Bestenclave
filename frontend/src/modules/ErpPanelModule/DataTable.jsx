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
import { Dropdown, Table, Button, App } from 'antd'; // Added App import
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
        columns={columnsWithActions}
        rowKey={(item) => item._id}
        dataSource={dataSource}
        pagination={pagination}
        loading={listIsLoading}
        onChange={handelDataTableLoad}
        scroll={{ x: true }}
      />
    </>
  );
}
