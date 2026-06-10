import { List, Progress, Tag, Spin, Row, Col, Typography, Card } from 'antd';
import { HomeOutlined, DollarOutlined, WalletOutlined, ArrowUpOutlined, ArrowDownOutlined } from '@ant-design/icons';
import useLanguage from '@/locale/useLanguage';
import { useMoney } from '@/settings';
import { useSelector } from 'react-redux';
import { selectMoneyFormat } from '@/redux/settings/selectors';

const { Text } = Typography;

export default function VillaFinancialsList({ villas, isLoading }) {
    const translate = useLanguage();
    const { moneyFormatter } = useMoney();
    const money_format_settings = useSelector(selectMoneyFormat);

    const currency = money_format_settings.default_currency_code || 'USD';

    if (isLoading) {
        return (
            <div style={{ textAlign: 'center', padding: '40px 0' }}>
                <Spin />
            </div>
        );
    }

    if (!villas || villas.length === 0) {
        return (
            <div style={{
                textAlign: 'center',
                padding: '40px 20px',
                color: '#999',
                background: '#fafafa',
                borderRadius: '8px',
                border: '1px dashed #d9d9d9'
            }}>
                <div style={{ fontSize: '16px', marginBottom: '8px' }}>
                    {translate('No villas found')}
                </div>
            </div>
        );
    }

    return (
        <List
            dataSource={villas}
            itemLayout="vertical"
            pagination={{ pageSize: 3, size: 'small' }}
            renderItem={(villa) => {
                const income = villa.income || 0;
                const expense = villa.expense || 0;
                const profit = income - expense;
                const profitColor = profit >= 0 ? '#3f8600' : '#cf1322';
                
                // Calculate percentage of expense relative to income for the bar
                let percent = 0;
                if (income > 0) {
                    percent = Math.min((expense / income) * 100, 100);
                } else if (expense > 0) {
                    percent = 100; // If no income but expense exists, show full bar
                }

                return (
                <List.Item style={{ padding: '20px', background: '#fff', borderRadius: '12px', marginBottom: '16px', border: '1px solid #e8e8e8', boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}>
                    <div style={{ width: '100%' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', borderBottom: '1px solid #f0f0f0', paddingBottom: '10px' }}>
                            <span style={{ fontWeight: '700', fontSize: '18px', color: '#1f1f1f' }}>
                                <HomeOutlined style={{ marginRight: '8px', color: '#1890ff' }} />
                                {villa.name || `Villa ${villa.villaNumber}`}
                            </span>
                             {villa.project && (
                                <Tag color="blue">{villa.project.name}</Tag>
                            )}
                        </div>
                        
                        <Row gutter={[24, 24]}>
                            <Col span={12}>
                                <div style={{ background: '#f6ffed', padding: '16px', borderRadius: '8px', border: '1px solid #b7eb8f', height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                                    <span style={{ fontSize: '14px', color: '#237804', fontWeight: '600', marginBottom: '8px' }}>Total Income</span>
                                    <div style={{ color: '#3f8600', fontWeight: 'bold', fontSize: '20px' }}>
                                        {moneyFormatter({ amount: income, currency_code: currency })}
                                    </div>
                                </div>
                            </Col>
                            <Col span={12}>
                                <div style={{ background: '#fff1f0', padding: '16px', borderRadius: '8px', border: '1px solid #ffa39e', height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                                    <span style={{ fontSize: '14px', color: '#a8071a', fontWeight: '600', marginBottom: '8px' }}>Total Expenses</span>
                                    <div style={{ color: '#cf1322', fontWeight: 'bold', fontSize: '20px' }}>
                                        {moneyFormatter({ amount: expense, currency_code: currency })}
                                    </div>
                                </div>
                            </Col>
                        </Row>
                        
                        <div style={{ marginTop: '20px', paddingTop: '16px', borderTop: '1px dashed #f0f0f0' }}>
                           <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                                <span style={{ fontSize: '14px', fontWeight: '600', color: '#595959' }}>Net Profit / Loss</span>
                                <span style={{ fontSize: '18px', fontWeight: 'bold', color: profitColor }}>
                                    {profit >= 0 ? '+' : ''}{moneyFormatter({ amount: profit, currency_code: currency })}
                                </span>
                           </div>
                           
                           <div>
                               <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', marginBottom: '6px' }}>
                                   <span style={{ color: '#8c8c8c' }}>Expense Utilization</span>
                                   <span style={{ fontWeight: '600', color: percent > 100 ? '#cf1322' : '#595959' }}>
                                       {percent.toFixed(0)}%
                                   </span>
                               </div>
                               <Progress 
                                    percent={percent} 
                                    strokeColor="#cf1322"
                                    trailColor="#f5f5f5"
                                    showInfo={false}
                                    strokeLinecap="square"
                                    size="small"
                                />
                           </div>
                        </div>

                    </div>
                </List.Item>
            )}}
        />
    );
}
