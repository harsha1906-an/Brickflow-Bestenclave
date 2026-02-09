import { useEffect, useState } from 'react';
import { useSelector } from 'react-redux';
import { Tag, Row, Col, Button, Card, Radio, Space, Skeleton } from 'antd';
import { SettingOutlined, CalendarOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import axios from 'axios';

import useLanguage from '@/locale/useLanguage';
import { useMoney } from '@/settings';
import { request } from '@/request';
import useFetch from '@/hooks/useFetch';
import useOnFetch from '@/hooks/useOnFetch';
import { useAppContext } from '@/context/appContext';
import { selectMoneyFormat } from '@/redux/settings/selectors';
import { selectCurrentAdmin } from '@/redux/auth/selectors';

import RecentTable from './components/RecentTable';
import InventoryAnalytics from './components/InventoryAnalytics';
import VillaProgressList from './components/VillaProgressList';
import SummaryCard from './components/SummaryCard';
import PreviewCard from './components/PreviewCard';
import CustomerPreviewCard from './components/CustomerPreviewCard';
import DashboardSettings from './components/DashboardSettings';
import DashboardChart from './components/DashboardChart';

export default function DashboardModule() {
  const translate = useLanguage();
  const { moneyFormatter } = useMoney();
  const money_format_settings = useSelector(selectMoneyFormat);
  const currentAdmin = useSelector(selectCurrentAdmin);
  const [showSettings, setShowSettings] = useState(false);

  // Default config if none exists
  const defaultConfig = {
    chart: true,
    quoteSummary: true,
    paymentSummary: true,
    dailyCost: true,
    statisticCards: true,
    customerPreview: true,
    recentQuotes: true,
  };

  const config = currentAdmin?.dashboardConfig ? { ...defaultConfig, ...currentAdmin.dashboardConfig } : defaultConfig;

  const getStatsData = async ({ entity, currency }) => {
    return await request.summary({
      entity,
      options: { currency },
    });
  };

  const {
    result: invoiceResult,
    isLoading: invoiceLoading,
    onFetch: fetchInvoicesStats,
  } = useOnFetch();

  const { result: quoteResult, isLoading: quoteLoading, onFetch: fetchQuotesStats } = useOnFetch();

  const {
    result: paymentResult,
    isLoading: paymentLoading,
    onFetch: fetchPayemntsStats,
  } = useOnFetch();

  const { result: clientResult, isLoading: clientLoading } = useFetch(() =>
    request.summary({ entity: 'client' })
  );

  const [analyticsResult, setAnalyticsResult] = useState([]);
  const [analyticsLoading, setAnalyticsLoading] = useState(false);

  const [dailyResult, setDailyResult] = useState({ total: 0 });
  const [dailyLoading, setDailyLoading] = useState(true);
  const [dateRange, setDateRange] = useState('month'); // 'today', 'month', 'custom'

  const [villasProgress, setVillasProgress] = useState([]);
  const [villasLoading, setVillasLoading] = useState(true);

  const { state } = useAppContext();
  const companyId = state.currentCompany;

  // Fetch analytics data based on date range
  useEffect(() => {
    if (config.chart) {
      const fetchData = async () => {
        setAnalyticsLoading(true);
        try {
          const rangeParam = dateRange === 'today' ? 'range=today' : 'range=month';
          const response = await request.get({ entity: `analytics/monthly-summary?${rangeParam}` });
          console.log('Analytics Response:', response);
          // Extract the result array from the response
          const data = response?.result || response || [];
          console.log('Setting chart data:', data);
          setAnalyticsResult(data);
        } catch (error) {
          console.error('Analytics fetch error:', error);
          setAnalyticsResult([]);
        } finally {
          setAnalyticsLoading(false);
        }
      };
      fetchData();
    }
  }, [config.chart, dateRange]);

  // Fetch villa progress data
  useEffect(() => {
    const fetchVillaProgress = async () => {
      setVillasLoading(true);
      try {
        console.log('=== VILLA PROGRESS DEBUG ===');
        console.log('CompanyId:', companyId);
        const endpoint = `companies/${companyId}/villas/progress-summary?companyId=${companyId}`;
        console.log('Calling endpoint:', endpoint);

        const response = await request.get({
          entity: endpoint
        });

        console.log('Villa Progress Full Response:', response);
        console.log('Response success:', response?.success);
        console.log('Response result:', response?.result);
        console.log('Result length:', response?.result?.length);

        if (response && response.result) {
          console.log('Setting villas:', response.result);
          setVillasProgress(response.result);
        } else {
          console.warn('No result in response, setting empty array');
          setVillasProgress([]);
        }
      } catch (error) {
        console.error('=== VILLA PROGRESS ERROR ===');
        console.error('Error details:', error);
        console.error('Error message:', error.message);
        console.error('Error response:', error.response);
        setVillasProgress([]);
      } finally {
        setVillasLoading(false);
        console.log('=== VILLA PROGRESS FETCH COMPLETE ===');
      }
    };

    if (companyId) {
      console.log('CompanyId exists, fetching villa progress...');
      fetchVillaProgress();
    } else {
      console.warn('No companyId available, skipping villa progress fetch');
    }
  }, [companyId]);

  useEffect(() => {
    const fetchDailyData = async () => {
      if (!companyId) return;
      try {
        const data = await request.get({ entity: `companies/${companyId}/daily-summary?date=${dayjs().format('YYYY-MM-DD')}` });
        setDailyResult({ total: data.totalDailyExpense });
      } catch (e) {
        console.error(e);
      } finally {
        setDailyLoading(false);
      }
    };
    if (config.dailyCost) fetchDailyData();
  }, [config.dailyCost]);

  useEffect(() => {
    const currency = money_format_settings.default_currency_code || null;

    if (currency) {
      if (config.quoteSummary) fetchQuotesStats(getStatsData({ entity: 'quote', currency }));
      if (config.paymentSummary) fetchPayemntsStats(getStatsData({ entity: 'payment', currency }));
    }
  }, [money_format_settings.default_currency_code, config.quoteSummary, config.paymentSummary]);

  const dataTableColumns = [
    {
      title: translate('number'),
      dataIndex: 'number',
    },
    {
      title: translate('Client'),
      dataIndex: ['client', 'name'],
    },

    {
      title: translate('Total'),
      dataIndex: 'total',
      onCell: () => {
        return {
          style: {
            textAlign: 'right',
            whiteSpace: 'nowrap',
            direction: 'ltr',
          },
        };
      },
      render: (total, record) => moneyFormatter({ amount: total, currency_code: record.currency }),
    },
    {
      title: translate('Status'),
      dataIndex: 'status',
    },
  ];

  const entityData = [
    {
      result: quoteResult,
      isLoading: quoteLoading,
      entity: 'quote',
      title: translate('quote'),
    },
  ];

  const statisticCards = entityData.map((data, index) => {
    const { result, entity, isLoading, title } = data;

    return (
      <PreviewCard
        key={index}
        title={title}
        isLoading={isLoading}
        entity={entity}
        statistics={
          !isLoading &&
          result?.performance?.map((item) => ({
            tag: item?.status,
            color: 'blue',
            value: item?.percentage,
          }))
        }
      />
    );
  });

  // Skeleton card component
  const SummaryCardSkeleton = () => (
    <Col className="gutter-row" xs={{ span: 24 }} sm={{ span: 12 }} md={{ span: 12 }} lg={{ span: 6 }}>
      <div className="whiteBox shadow" style={{ minHeight: '120px', height: '100%', padding: '15px' }}>
        <Skeleton active paragraph={{ rows: 2 }} />
      </div>
    </Col>
  );

  const TableSkeleton = () => (
    <div className="whiteBox shadow" style={{ minHeight: 458, padding: '20px' }}>
      <Skeleton active paragraph={{ rows: 8 }} />
    </div>
  );

  const CustomerCardSkeleton = () => (
    <div className="whiteBox shadow" style={{ minHeight: 200, padding: '20px' }}>
      <Skeleton active paragraph={{ rows: 4 }} />
    </div>
  );

  const ChartSkeleton = () => (
    <div className="whiteBox shadow" style={{ height: 400, padding: '20px' }}>
      <Skeleton active paragraph={{ rows: 10 }} />
    </div>
  );

  if (money_format_settings) {
    const isMobile = window.innerWidth <= 768;
    const gutterSize = isMobile ? [12, 12] : [24, 24];

    return (
      <>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '10px' }}>
          <Space size="middle">
            <CalendarOutlined style={{ fontSize: '18px' }} />
            <Radio.Group value={dateRange} onChange={(e) => setDateRange(e.target.value)} buttonStyle="solid">
              <Radio.Button value="today">{translate('Today')}</Radio.Button>
              <Radio.Button value="month">{translate('This Month')}</Radio.Button>
            </Radio.Group>
          </Space>
          <Button icon={<SettingOutlined />} onClick={() => setShowSettings(true)}>
            {translate('Customize Dashboard')}
          </Button>
        </div>

        {config.chart && (
          <Row gutter={gutterSize} style={{ marginBottom: '24px' }}>
            <Col className="gutter-row" span={24}>
              {analyticsLoading ? (
                <ChartSkeleton />
              ) : (
                <DashboardChart data={analyticsResult || []} isLoading={analyticsLoading} />
              )}
            </Col>
          </Row>
        )}

        <Row gutter={gutterSize}>
          {config.quoteSummary && (
            quoteLoading ? (
              <SummaryCardSkeleton />
            ) : (
              <SummaryCard
                title={translate('Quote')}
                prefix={translate('This month')}
                isLoading={quoteLoading}
                data={quoteResult?.total}
              />
            )
          )}

          {config.paymentSummary && (
            paymentLoading ? (
              <SummaryCardSkeleton />
            ) : (
              <SummaryCard
                title={translate('paid')}
                prefix={translate('This month')}
                isLoading={paymentLoading}
                data={paymentResult?.total}
              />
            )
          )}

          {config.dailyCost && (
            dailyLoading ? (
              <SummaryCardSkeleton />
            ) : (
              <SummaryCard
                title={'Total Daily Cost'}
                prefix={'Today'}
                isLoading={dailyLoading}
                data={dailyResult?.total}
              />
            )
          )}
        </Row>
        <div className="space30"></div>
        <Row gutter={gutterSize}>
          <Col className="gutter-row w-full" sm={{ span: 24 }} md={{ span: 24 }} lg={{ span: 18 }}>
            {villasLoading ? (
              <TableSkeleton />
            ) : (
              <div className="whiteBox shadow" style={{ minHeight: 458, maxHeight: 600, overflowY: 'auto' }}>
                <div className="pad20">
                  <h3 style={{ marginBottom: '20px', fontSize: '18px', fontWeight: '600' }}>
                    {translate('Villa Construction Progress')}
                  </h3>
                  {config.statisticCards ? (
                    <VillaProgressList villas={villasProgress} isLoading={villasLoading} />
                  ) : (
                    <div style={{ padding: '20px', textAlign: 'center', color: '#999' }}>
                      {translate('Progress tracking hidden')}
                    </div>
                  )}
                </div>
              </div>
            )}
          </Col>
          <Col className="gutter-row w-full" sm={{ span: 24 }} md={{ span: 24 }} lg={{ span: 6 }}>
            {config.customerPreview && (
              clientLoading ? (
                <CustomerCardSkeleton />
              ) : (
                <CustomerPreviewCard
                  isLoading={clientLoading}
                  activeCustomer={clientResult?.active}
                  newCustomer={clientResult?.new}
                />
              )
            )}
          </Col>
        </Row>
        <div className="space30"></div>
        <Row gutter={gutterSize}>
          <Col className="gutter-row w-full" sm={{ span: 24 }} lg={{ span: 24 }}>
            <div className="whiteBox shadow pad20" style={{ height: '100%' }}>
              <h3 style={{ marginBottom: 5, padding: '0 20px 20px' }}>
                {translate('Inventory Analytics')}
              </h3>
              {config.recentQuotes && <InventoryAnalytics />}
            </div>
          </Col>
        </Row>

        <DashboardSettings visible={showSettings} onClose={() => setShowSettings(false)} />
      </>
    );
  } else {
    return <></>;
  }
}
