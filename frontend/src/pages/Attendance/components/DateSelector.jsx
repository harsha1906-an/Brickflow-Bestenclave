import React from 'react';
import { DatePicker, Space, Button } from 'antd';
import dayjs from 'dayjs';

import useMobile from '@/hooks/useMobile';

const DateSelector = ({ value, onChange, disabled = false, style }) => {
    const isMobile = useMobile();
    const handleQuickSelect = (daysOffset) => {
        const date = dayjs().add(daysOffset, 'day');
        onChange(date);
    };

    if (isMobile) {
        return (
            <DatePicker
                value={value}
                onChange={onChange}
                disabled={disabled}
                format="YYYY-MM-DD"
                placeholder="Select date"
                style={{ width: '100%', height: '40px', borderRadius: '8px', ...style }}
            />
        );
    }

    return (
        <Space size="middle">
            <DatePicker
                value={value}
                onChange={onChange}
                disabled={disabled}
                format="YYYY-MM-DD"
                placeholder="Select date"
                style={{ width: 200, ...style }}
            />
            <Button size="small" onClick={() => handleQuickSelect(0)} disabled={disabled}>
                Today
            </Button>
            <Button size="small" onClick={() => handleQuickSelect(-1)} disabled={disabled}>
                Yesterday
            </Button>
        </Space>
    );
};

export default DateSelector;
