import React from 'react';
import { Tag } from 'antd';
import dayjs from 'dayjs';
import CrudModule from '@/modules/CrudModule/CrudModule';
import useLanguage from '@/locale/useLanguage';

export default function AuditLog() {
  const translate = useLanguage();
  const entity = 'auditlog';

  const searchConfig = {
    entity: 'auditlog',
    displayLabels: ['module', 'action'],
    searchFields: 'module,action,entityType',
    outputValue: '_id',
  };

  const deleteModalLabels = ['module'];

  const renderChanges = (value, record) => {
    if (!record || !record.metadata) return 'No changes recorded';
    const { old: oldVal, new: newVal } = record.metadata;
    
    // If it's a create, just list the new values or show the whole JSON
    if (record.action === 'create' || record.action === 'CREATE') {
      return (
        <div style={{ maxHeight: '400px', overflowY: 'auto' }}>
          <h4 style={{ fontWeight: 600 }}>New Document:</h4>
          <pre style={{ fontSize: '12px', background: '#fafafa', padding: '8px', border: '1px solid #e8e8e8', borderRadius: '4px', whiteSpace: 'pre-wrap' }}>
            {JSON.stringify(newVal, null, 2)}
          </pre>
        </div>
      );
    }

    // If it's a delete, list the deleted values
    if (record.action === 'delete' || record.action === 'DELETE') {
      return (
        <div style={{ maxHeight: '400px', overflowY: 'auto' }}>
          <h4 style={{ fontWeight: 600 }}>Deleted Document:</h4>
          <pre style={{ fontSize: '12px', background: '#fafafa', padding: '8px', border: '1px solid #e8e8e8', borderRadius: '4px', whiteSpace: 'pre-wrap' }}>
            {JSON.stringify(oldVal, null, 2)}
          </pre>
        </div>
      );
    }

    // For update, compare keys and highlight differences
    if (record.action === 'update' || record.action === 'UPDATE') {
      if (!oldVal || !newVal) {
        return 'No detail available';
      }
      const diffs = [];
      const allKeys = Array.from(new Set([...Object.keys(oldVal), ...Object.keys(newVal)]));
      
      for (const key of allKeys) {
        // Ignore timestamp or id differences if they are irrelevant or noisy
        if (key === 'updated' || key === 'updatedAt' || key === 'version' || key === '__v') continue;
        
        const oldRaw = oldVal[key];
        const newRaw = newVal[key];
        
        // Check if they are different
        if (JSON.stringify(oldRaw) !== JSON.stringify(newRaw)) {
          diffs.push({
            key,
            old: typeof oldRaw === 'object' ? JSON.stringify(oldRaw) : String(oldRaw ?? ''),
            new: typeof newRaw === 'object' ? JSON.stringify(newRaw) : String(newRaw ?? '')
          });
        }
      }
      
      if (diffs.length === 0) {
        return <div>No significant field changes (e.g. only system fields updated)</div>;
      }
      
      return (
        <div style={{ maxHeight: '400px', overflowY: 'auto' }}>
          <h4 style={{ fontWeight: 600, marginBottom: '10px' }}>Field Changes:</h4>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
            <thead>
              <tr style={{ background: '#fafafa', borderBottom: '1px solid #e8e8e8' }}>
                <th style={{ padding: '6px', textAlign: 'left', fontWeight: 600 }}>Field</th>
                <th style={{ padding: '6px', textAlign: 'left', fontWeight: 600 }}>Old Value</th>
                <th style={{ padding: '6px', textAlign: 'left', fontWeight: 600 }}>New Value</th>
              </tr>
            </thead>
            <tbody>
              {diffs.map((d) => (
                <tr key={d.key} style={{ borderBottom: '1px solid #f0f0f0' }}>
                  <td style={{ padding: '6px', fontWeight: 500, color: '#1890ff' }}>{d.key}</td>
                  <td style={{ padding: '6px', color: '#ff4d4f', textDecoration: 'line-through', wordBreak: 'break-all' }}>{d.old || 'empty'}</td>
                  <td style={{ padding: '6px', color: '#52c41a', fontWeight: 'bold', wordBreak: 'break-all' }}>{d.new || 'empty'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
    }

    // Default fallback
    return <pre style={{ fontSize: '11px', whiteSpace: 'pre-wrap' }}>{JSON.stringify(record.metadata, null, 2)}</pre>;
  };

  const readColumns = [
    {
      title: translate('Date & Time'),
      dataIndex: 'createdAt',
      isDate: true,
      render: (date) => (date ? dayjs(date).format('YYYY-MM-DD HH:mm:ss') : ''),
    },
    {
      title: translate('User'),
      dataIndex: 'userId.name',
    },
    {
      title: translate('Module'),
      dataIndex: 'module',
    },
    {
      title: translate('Action'),
      dataIndex: 'action',
    },
    {
      title: translate('Entity Type'),
      dataIndex: 'entityType',
    },
    {
      title: translate('Entity ID'),
      dataIndex: 'entityId',
    },
    {
      title: translate('Changes Detail'),
      dataIndex: 'metadata',
      render: (value, record) => renderChanges(value, record),
    },
  ];

  const dataTableColumns = [
    {
      title: translate('Date & Time'),
      dataIndex: 'createdAt',
      render: (date) => (date ? dayjs(date).format('YYYY-MM-DD HH:mm:ss') : ''),
    },
    {
      title: translate('User'),
      dataIndex: 'userId.name',
    },
    {
      title: translate('Module'),
      dataIndex: 'module',
    },
    {
      title: translate('Action'),
      dataIndex: 'action',
      render: (action) => {
        let color = 'blue';
        const act = (action || '').toLowerCase();
        if (act === 'create') color = 'green';
        if (act === 'delete') color = 'red';
        if (act === 'update') color = 'orange';
        return <Tag color={color}>{(action || '').toUpperCase()}</Tag>;
      },
    },
    {
      title: translate('Entity Type'),
      dataIndex: 'entityType',
    },
    {
      title: translate('Entity ID'),
      dataIndex: 'entityId',
    },
  ];

  const Labels = {
    PANEL_TITLE: translate('activity_logs'),
    DATATABLE_TITLE: translate('activity_logs_list'),
    ADD_NEW_ENTITY: translate('add_new_activity_log'),
    ENTITY_NAME: translate('activity_log'),
  };

  const configPage = {
    entity,
    ...Labels,
  };

  const config = {
    ...configPage,
    readColumns,
    dataTableColumns,
    searchConfig,
    deleteModalLabels,
    readOnly: true,
  };

  return <CrudModule config={config} />;
}
