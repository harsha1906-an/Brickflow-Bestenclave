import React, { useState, useEffect } from 'react';
import { Drawer, Checkbox, Button, Divider, Row, Col, message } from 'antd';
import { SettingOutlined } from '@ant-design/icons';
import { useDispatch, useSelector } from 'react-redux';
import { selectCurrentAdmin } from '@/redux/auth/selectors';
import { updateProfile } from '@/redux/auth/actions';
import useLanguage from '@/locale/useLanguage';

export default function DashboardSettings({ visible, onClose }) {
    const translate = useLanguage();
    const dispatch = useDispatch();
    const currentAdmin = useSelector(selectCurrentAdmin);

    // Default configuration - show everything
    const defaultConfig = {
        chart: true,
        paymentSummary: true,
        dailyCost: true,
        statisticCards: true,
        customerPreview: true,
        recentQuotes: true,
    };

    const [config, setConfig] = useState(defaultConfig);

    useEffect(() => {
        if (currentAdmin && currentAdmin.dashboardConfig) {
            // Merge with default to handle new fields in future
            setConfig({ ...defaultConfig, ...currentAdmin.dashboardConfig });
        }
    }, [currentAdmin]);

    const handleChange = (key, checked) => {
        setConfig((prev) => ({ ...prev, [key]: checked }));
    };

    const handleSave = () => {
        dispatch(updateProfile({ entity: 'admin', jsonData: { dashboardConfig: config } }));
        message.success(translate('Dashboard settings saved'));
        onClose();
    };

    return (
        <Drawer
            title={translate('Customize Dashboard')}
            placement="right"
            onClose={onClose}
            open={visible}
            extra={
                <Button type="primary" onClick={handleSave}>
                    {translate('Save')}
                </Button>
            }
        >
            <p>{translate('Select widgets to display on your dashboard:')}</p>
            <Divider />

            <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                <Checkbox
                    checked={config.chart}
                    onChange={(e) => handleChange('chart', e.target.checked)}
                >
                    {translate('Income vs Expense Chart')}
                </Checkbox>



                <Checkbox
                    checked={config.paymentSummary}
                    onChange={(e) => handleChange('paymentSummary', e.target.checked)}
                >
                    {translate('Paid Summary')}
                </Checkbox>

                <Checkbox
                    checked={config.dailyCost}
                    onChange={(e) => handleChange('dailyCost', e.target.checked)}
                >
                    Total Daily Cost
                </Checkbox>

                <Checkbox
                    checked={config.statisticCards}
                    onChange={(e) => handleChange('statisticCards', e.target.checked)}
                >
                    {translate('Performance Cards')}
                </Checkbox>

                <Checkbox
                    checked={config.customerPreview}
                    onChange={(e) => handleChange('customerPreview', e.target.checked)}
                >
                    {translate('Customer Preview')}
                </Checkbox>

                <Checkbox
                    checked={config.recentQuotes}
                    onChange={(e) => handleChange('recentQuotes', e.target.checked)}
                >
                    {translate('Inventory Analytics')}
                </Checkbox>
            </div>
        </Drawer>
    );
}
