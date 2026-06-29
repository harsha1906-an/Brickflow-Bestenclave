import React, { useState, useEffect } from 'react';
import { Tag, Table, Card, Row, Col, Input, Select, DatePicker, Button, Space, Typography, Tooltip, Empty } from 'antd';
import { SearchOutlined, ReloadOutlined, InfoCircleOutlined, ArrowLeftOutlined } from '@ant-design/icons';
import { PageHeader } from '@ant-design/pro-layout';
import dayjs from 'dayjs';
import { request } from '@/request';
import { useMoney } from '@/settings';
import useLanguage from '@/locale/useLanguage';

const { RangePicker } = DatePicker;
const { Text } = Typography;

export default function AuditLog() {
  const translate = useLanguage();
  const { moneyFormatter } = useMoney();

  // Filters & State
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [actionFilter, setActionFilter] = useState('all');
  const [dateRange, setDateRange] = useState(null);
  const [sortOrder, setSortOrder] = useState('desc'); // 'desc' or 'asc'
  
  // Pagination
  const [pagination, setPagination] = useState({
    current: 1,
    pageSize: 10,
    total: 0,
  });

  // Debounce search input
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(searchTerm);
      setPagination((prev) => ({ ...prev, current: 1 }));
    }, 450);
    return () => clearTimeout(handler);
  }, [searchTerm]);

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const options = {
        page: pagination.current,
        items: pagination.pageSize,
        q: debouncedSearch,
        sortBy: 'createdAt',
        sortValue: sortOrder === 'desc' ? -1 : 1,
      };

      if (actionFilter !== 'all') {
        options.action = actionFilter;
      }

      if (dateRange && dateRange[0] && dateRange[1]) {
        options.startDate = dateRange[0].format('YYYY-MM-DD');
        options.endDate = dateRange[1].format('YYYY-MM-DD');
      }

      const response = await request.list({ entity: 'auditlog', options });
      if (response && response.success) {
        setLogs(response.result || []);
        setPagination((prev) => ({
          ...prev,
          total: response.pagination.count || 0,
        }));
      }
    } catch (error) {
      console.error('Failed to fetch audit logs:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, [debouncedSearch, actionFilter, dateRange, sortOrder, pagination.current, pagination.pageSize]);

  const handleRefresh = () => {
    fetchLogs();
  };

  const handleResetFilters = () => {
    setSearchTerm('');
    setActionFilter('all');
    setDateRange(null);
    setSortOrder('desc');
    setPagination((prev) => ({ ...prev, current: 1 }));
  };

  // Human-readable formatter for nested objects/refs
  const formatValue = (val) => {
    if (val === null || val === undefined) return '';
    if (typeof val === 'object') {
      if (val.name) return String(val.name);
      if (val.villaNumber) return `Villa: ${val.villaNumber}`;
      if (val.number) return `No. ${val.number}`;
      if (val.label) return String(val.label);
      return JSON.stringify(val);
    }
    return String(val);
  };

  // Helper to extract descriptive details for each log
  const getTransactionDetail = (record) => {
    const meta = record.metadata || {};
    const data = meta.new || meta.old || {};
    
    const moduleName = (record.module || record.entityType || '').toLowerCase();
    const action = (record.action || '').toLowerCase();

    switch (moduleName) {
      case 'payment':
        return `Payment Ref: ${data.ref || data.transactionCode || 'N/A'} (${data.paymentMode || ''}) - ${data.description || 'No description'}`;
      case 'expense':
        return `Expense: ${data.name || 'N/A'} - ${data.description || 'No description'}`;
      case 'pettycashtransaction':
        return `Petty Cash: ${data.name || 'N/A'} (${data.type || ''}) - ${data.note || 'No note'}`;
      case 'invoice':
        return `Invoice #${data.number || 'N/A'} - Status: ${data.status || 'N/A'}`;
      case 'quote':
        return `Quote #${data.number || 'N/A'} - Status: ${data.status || 'N/A'}`;
      case 'purchaseorder':
        return `Purchase Order #${data.number || 'N/A'} - Status: ${data.status || 'N/A'}`;
      case 'goodsreceipt':
        return `Goods Receipt #${data.number || 'N/A'}`;
      case 'villa':
        return `Villa: ${data.villaNumber || 'N/A'} (${data.type || ''})`;
      case 'client':
        return `Client: ${data.name || 'N/A'} - ${data.company || ''}`;
      case 'labour':
        return `Labour: ${data.name || 'N/A'} (${data.employmentType || ''}) - Skill: ${data.skill || 'N/A'}`;
      case 'attendance':
        return `Attendance for ${data.labour?.name || 'Labour'} on ${data.date ? dayjs(data.date).format('YYYY-MM-DD') : 'N/A'}: ${data.status || ''}`;
      default:
        return `${record.module || record.entityType || 'Document'} ${action}d (ID: ${record.entityId || 'N/A'})`;
    }
  };

  // Helper to extract amounts from metadata
  const getTransactionAmount = (record) => {
    const meta = record.metadata || {};
    const data = meta.new || meta.old || {};
    
    const amount = data.amount ?? data.total ?? data.totalAmount ?? data.subTotal ?? null;
    if (amount !== null && !isNaN(amount)) {
      return moneyFormatter({ amount, currency_code: data.currency });
    }
    return '-';
  };

  const renderKeyValueTable = (data, title, titleColor, borderColor, highlightColor) => {
    if (!data || typeof data !== 'object') return null;

    const filteredKeys = Object.keys(data).filter(key => {
      const k = key.toLowerCase();
      if (['updated', 'updatedat', 'created', 'createdat', 'version', '__v', '_id', 'removed', 'companyid', 'company'].includes(k)) return false;
      return data[key] !== undefined && data[key] !== null;
    });

    if (filteredKeys.length === 0) {
      return <div style={{ padding: '8px', color: '#8c8c8c' }}>No key-value details to display.</div>;
    }

    return (
      <div style={{ padding: '12px 16px', background: highlightColor, borderRadius: '8px', border: `1px solid ${borderColor}` }}>
        <h4 style={{ fontWeight: 600, color: titleColor, marginBottom: '10px' }}>{title}:</h4>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
          <thead>
            <tr style={{ borderBottom: `2px solid ${borderColor}`, textAlign: 'left' }}>
              <th style={{ padding: '8px 4px', fontWeight: 600, width: '30%' }}>Field Name</th>
              <th style={{ padding: '8px 4px', fontWeight: 600, width: '70%' }}>Value</th>
            </tr>
          </thead>
          <tbody>
            {filteredKeys.map((key) => (
              <tr key={key} style={{ borderBottom: '1px solid rgba(128,128,128,0.15)' }}>
                <td style={{ padding: '8px 4px', fontWeight: 500, color: '#096dd9' }}>{key}</td>
                <td style={{ padding: '8px 4px', wordBreak: 'break-all' }}>
                  {formatValue(data[key])}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  };

  // Render change diffs inside expandable row
  const renderChanges = (record) => {
    const meta = record.metadata || {};
    const { old: oldVal, new: newVal } = meta;

    if (!oldVal && !newVal) {
      return (
        <div style={{ padding: '8px', color: '#8c8c8c' }}>
          <InfoCircleOutlined style={{ marginRight: '8px' }} />
          No metadata details available.
        </div>
      );
    }

    const action = (record.action || '').toLowerCase();

    if (action === 'create') {
      return renderKeyValueTable(
        newVal, 
        'Created Document Details', 
        '#389e0d', 
        'rgba(56, 158, 13, 0.25)', 
        'rgba(56, 158, 13, 0.08)'
      );
    }

    if (action === 'delete') {
      return renderKeyValueTable(
        oldVal, 
        'Deleted Document Details', 
        '#cf1322', 
        'rgba(207, 19, 34, 0.25)', 
        'rgba(207, 19, 34, 0.08)'
      );
    }

    // Update diff comparison
    if (action === 'update' || action === 'edit') {
      if (!oldVal || !newVal) return <Text type="secondary">Incomplete update detail</Text>;
      
      const diffs = [];
      const allKeys = Array.from(new Set([...Object.keys(oldVal), ...Object.keys(newVal)]));

      for (const key of allKeys) {
        if (key === 'updated' || key === 'updatedAt' || key === 'version' || key === '__v') continue;

        const oldRaw = oldVal[key];
        const newRaw = newVal[key];

        if (JSON.stringify(oldRaw) !== JSON.stringify(newRaw)) {
          diffs.push({
            key,
            old: oldRaw,
            new: newRaw,
          });
        }
      }

      if (diffs.length === 0) {
        return <div style={{ padding: '8px', color: '#8c8c8c' }}>No significant field changes recorded (only system attributes changed).</div>;
      }

      return (
        <div style={{ padding: '12px 16px', background: 'rgba(212, 107, 8, 0.08)', borderRadius: '8px', border: '1px solid rgba(212, 107, 8, 0.25)' }}>
          <h4 style={{ fontWeight: 600, color: '#d46b08', marginBottom: '10px' }}>Field Audit Comparison:</h4>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
            <thead>
              <tr style={{ borderBottom: '2px solid rgba(212, 107, 8, 0.25)', textAlign: 'left' }}>
                <th style={{ padding: '8px 4px', fontWeight: 600, width: '20%' }}>Field Name</th>
                <th style={{ padding: '8px 4px', fontWeight: 600, width: '40%', color: '#cf1322' }}>Old Value</th>
                <th style={{ padding: '8px 4px', fontWeight: 600, width: '40%', color: '#389e0d' }}>New Value</th>
              </tr>
            </thead>
            <tbody>
              {diffs.map((d) => (
                <tr key={d.key} style={{ borderBottom: '1px solid #f0f0f0' }}>
                  <td style={{ padding: '8px 4px', fontWeight: 500, color: '#096dd9' }}>{d.key}</td>
                  <td style={{ padding: '8px 4px', color: '#cf1322', textDecoration: 'line-through', wordBreak: 'break-all' }}>
                    {formatValue(d.old) || <span style={{ fontStyle: 'italic', color: '#bfbfbf' }}>[empty]</span>}
                  </td>
                  <td style={{ padding: '8px 4px', color: '#389e0d', fontWeight: 'bold', wordBreak: 'break-all' }}>
                    {formatValue(d.new) || <span style={{ fontStyle: 'italic', color: '#bfbfbf' }}>[empty]</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
    }

    return <pre style={{ fontSize: '11px', whiteSpace: 'pre-wrap' }}>{JSON.stringify(meta, null, 2)}</pre>;
  };

  // Module/Entity Colors
  const getModuleTagColor = (moduleName) => {
    const mod = (moduleName || '').toLowerCase();
    if (mod.includes('payment')) return 'gold';
    if (mod.includes('expense')) return 'red';
    if (mod.includes('pettycash')) return 'orange';
    if (mod.includes('invoice')) return 'blue';
    if (mod.includes('quote')) return 'cyan';
    if (mod.includes('purchaseorder')) return 'geekblue';
    if (mod.includes('goodsreceipt')) return 'purple';
    if (mod.includes('villa')) return 'green';
    if (mod.includes('client')) return 'magenta';
    if (mod.includes('labour')) return 'lime';
    if (mod.includes('attendance')) return 'volcano';
    return 'default';
  };

  const renderActionTag = (action) => {
    const act = (action || '').toLowerCase();
    let color = 'blue';
    if (act === 'create') color = 'green';
    if (act === 'delete') color = 'red';
    if (act === 'update' || act === 'edit') color = 'orange';
    return <Tag color={color} style={{ fontWeight: 600 }}>{(action || '').toUpperCase()}</Tag>;
  };

  const columns = [
    {
      title: translate('Date & Time'),
      dataIndex: 'createdAt',
      key: 'createdAt',
      width: '180px',
      render: (date) => (date ? dayjs(date).format('YYYY-MM-DD HH:mm:ss') : ''),
    },
    {
      title: translate('User'),
      dataIndex: 'userId',
      key: 'userId',
      width: '150px',
      render: (user) => (user ? <Tag color="geekblue">{user.name}</Tag> : <Text type="secondary">System</Text>),
    },
    {
      title: translate('Transaction / Module'),
      dataIndex: 'module',
      key: 'module',
      width: '180px',
      render: (moduleName) => <Tag color={getModuleTagColor(moduleName)}>{(moduleName || '').toUpperCase()}</Tag>,
    },
    {
      title: translate('Action'),
      dataIndex: 'action',
      key: 'action',
      width: '120px',
      render: (action) => renderActionTag(action),
    },
    {
      title: translate('Details / Description'),
      key: 'details',
      render: (_, record) => <Text>{getTransactionDetail(record)}</Text>,
    },
    {
      title: translate('Amount'),
      key: 'amount',
      width: '140px',
      align: 'right',
      render: (_, record) => <Text strong>{getTransactionAmount(record)}</Text>,
    },
  ];

  return (
    <div style={{ padding: '24px' }}>
      <PageHeader
        onBack={() => window.history.back()}
        backIcon={<ArrowLeftOutlined />}
        title={translate('activity_logs')}
        ghost={true}
        style={{ padding: '0 0 20px 0' }}
      />

      <Card
        bordered={false}
        style={{
          borderRadius: '12px',
          boxShadow: '0 4px 20px rgba(0,0,0,0.05)',
          marginBottom: '24px',
        }}
      >
        <Row gutter={[16, 16]} align="middle">
          {/* Search Bar */}
          <Col xs={24} md={8}>
            <Input
              prefix={<SearchOutlined style={{ color: '#bfbfbf' }} />}
              placeholder="Search user, action details, amounts..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              allowClear
              size="large"
              style={{ borderRadius: '8px' }}
            />
          </Col>

          {/* Action Filter */}
          <Col xs={12} sm={8} md={4}>
            <Select
              style={{ width: '100%' }}
              size="large"
              placeholder="Filter Action"
              value={actionFilter}
              onChange={setActionFilter}
              options={[
                { value: 'all', label: 'All Actions' },
                { value: 'create', label: 'Create' },
                { value: 'update', label: 'Update / Edit' },
                { value: 'delete', label: 'Delete' },
              ]}
              dropdownStyle={{ borderRadius: '8px' }}
            />
          </Col>

          {/* Date Picker */}
          <Col xs={24} sm={16} md={6}>
            <RangePicker
              style={{ width: '100%', borderRadius: '8px' }}
              size="large"
              value={dateRange}
              onChange={setDateRange}
              format="YYYY-MM-DD"
              allowClear
            />
          </Col>

          {/* Sort Order */}
          <Col xs={12} sm={8} md={3}>
            <Select
              style={{ width: '100%' }}
              size="large"
              value={sortOrder}
              onChange={setSortOrder}
              options={[
                { value: 'desc', label: 'Newest First' },
                { value: 'asc', label: 'Oldest First' },
              ]}
              dropdownStyle={{ borderRadius: '8px' }}
            />
          </Col>

          {/* Actions */}
          <Col xs={12} sm={8} md={3} style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
            <Tooltip title="Refresh Logs">
              <Button
                icon={<ReloadOutlined />}
                size="large"
                onClick={handleRefresh}
                style={{ borderRadius: '8px' }}
              />
            </Tooltip>
            <Button
              size="large"
              onClick={handleResetFilters}
              style={{ borderRadius: '8px' }}
            >
              Reset
            </Button>
          </Col>
        </Row>
      </Card>

      <Card
        bordered={false}
        style={{
          borderRadius: '12px',
          boxShadow: '0 4px 20px rgba(0,0,0,0.05)',
        }}
        styles={{ body: { padding: '0px' } }}
      >
        <Table
          columns={columns}
          rowKey={(record) => record._id}
          dataSource={logs}
          loading={loading}
          pagination={{
            current: pagination.current,
            pageSize: pagination.pageSize,
            total: pagination.total,
            showSizeChanger: true,
            pageSizeOptions: ['10', '20', '50'],
            onChange: (page, pageSize) => {
              setPagination((prev) => ({ ...prev, current: page, pageSize }));
            },
          }}
          expandable={{
            expandedRowRender: (record) => renderChanges(record),
            rowExpandable: (record) => {
              const meta = record.metadata || {};
              return !!(meta.old || meta.new);
            },
          }}
          locale={{
            emptyText: <Empty description="No activity logs found matching the selected filters" />,
          }}
          scroll={{ x: true }}
          style={{ borderRadius: '12px', overflow: 'hidden' }}
        />
      </Card>
    </div>
  );
}
