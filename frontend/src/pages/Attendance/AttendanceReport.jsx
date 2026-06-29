import React, { useEffect, useState } from 'react';
import { Card, DatePicker, Button, Table, Spin, Tag, Space, Empty, App } from 'antd';
import { DownloadOutlined, ArrowLeftOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import { useMoney } from '@/settings';
import { request } from '@/request';
import { useAppContext } from '@/context/appContext';


const { RangePicker } = DatePicker;

const AttendanceReport = ({ onBack }) => {
    const { message } = App.useApp();
    const { moneyFormatter } = useMoney();
    const { state } = useAppContext();
    const companyId = state.currentCompany;
    // Default to current month start and end
    const [dateRange, setDateRange] = useState([dayjs().startOf('month'), dayjs().endOf('month')]);
    const [data, setData] = useState([]);
    const [labourList, setLabourList] = useState([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        fetchReportData();
        // eslint-disable-next-line
    }, [dateRange]);

    const fetchReportData = async () => {
        if (!dateRange || !dateRange[0] || !dateRange[1]) return;

        setLoading(true);
        try {
            // Fetch Labour
            const allLabour = await request.get({ entity: `companies/${companyId}/labour` });
            const activeLabour = allLabour.filter(l => l.isActive);
            setLabourList(activeLabour);

            // Fetch Attendance for range
            const startStr = dateRange[0].format('YYYY-MM-DD');
            const endStr = dateRange[1].format('YYYY-MM-DD');
            const attendanceData = await request.get({ entity: `companies/${companyId}/attendance?startDate=${startStr}&endDate=${endStr}` });

            // Process Data
            processData(activeLabour, attendanceData);

        } catch (e) {
            console.error(e);
            messageApi.error('Failed to load report data');
        }
        setLoading(false);
    };

    const processData = (labours, attendanceRecords) => {
        // Create lookup map: labourId -> date(YYYY-MM-DD) -> attendance
        const map = {};
        attendanceRecords.forEach(att => {
            const dateStr = dayjs(att.date).format('YYYY-MM-DD');
            if (!map[att.labourId]) map[att.labourId] = {};
            map[att.labourId][dateStr] = att;
        });

        const rows = labours.map(labour => ({
            key: labour._id,
            name: labour.name,
            attendance: map[labour._id] || {}
        }));
        setData(rows);
    };

    const getDaysInRange = () => {
        if (!dateRange || !dateRange[0] || !dateRange[1]) return [];
        const days = [];
        let curr = dateRange[0].clone();
        const end = dateRange[1].clone();

        while (curr.isBefore(end) || curr.isSame(end, 'day')) {
            days.push(curr);
            curr = curr.add(1, 'day');
        }
        return days;
    };

    const handleDownload = () => {
        const days = getDaysInRange();
        const header = ['Name', ...days.map(d => d.format('DD/MM')), 'Total Present', 'Total Overtime (Hrs)', 'Total Wage'];

        const csvRows = [header.join(',')];

        data.forEach(row => {
            const cols = [`"${row.name}"`];
            let presentCount = 0;
            let totalWage = 0;
            let totalOt = 0;

            days.forEach(day => {
                const dateStr = day.format('YYYY-MM-DD');
                const att = row.attendance[dateStr];
                let val = '';
                if (att) {
                    if (att.status === 'present') { val = 'P'; presentCount++; }
                    else if (att.status === 'absent') val = 'A';
                    else if (att.status === 'half-day') { val = 'HD'; presentCount += 0.5; }
                    else if (att.status === 'overtime') {
                        val = `OT(${att.otHours})`;
                        presentCount++;
                        totalOt += (att.otHours || 0);
                    } else if (att.status === 'casual-leave') {
                        val = 'CL';
                        if (att.wage > 0) presentCount++;
                    }
                    totalWage += (att.wage || 0);
                }
                cols.push(`"${val}"`);
            });

            cols.push(presentCount);
            cols.push(totalOt);
            cols.push(totalWage.toFixed(2));
            csvRows.push(cols.join(','));
        });

        const csvContent = "data:text/csv;charset=utf-8," + csvRows.join("\n");
        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", `Attendance_Report_${dateRange[0].format('YYYY-MM-DD')}_to_${dateRange[1].format('YYYY-MM-DD')}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    // Construct Columns dynamically
    const days = getDaysInRange();
    const columns = [
        {
            title: 'Name',
            dataIndex: 'name',
            key: 'name',
            fixed: 'left',
            width: 150,
            zIndex: 999,
        },
        ...days.map(day => {
            const dateStr = day.format('YYYY-MM-DD');
            return {
                title: day.format('DD/MM'), // Short date
                key: dateStr,
                width: 60,
                align: 'center',
                render: (_, record) => {
                    const att = record.attendance[dateStr];
                    if (!att) return <span style={{ color: '#eee' }}>-</span>;
                    if (att.status === 'present') return <Tag color="green" style={{ margin: 0 }}>P</Tag>;
                    if (att.status === 'absent') return <Tag color="red" style={{ margin: 0 }}>A</Tag>;
                    if (att.status === 'half-day') return <Tag color="orange" style={{ margin: 0 }}>HD</Tag>;
                    if (att.status === 'overtime') return <Tag color="purple" style={{ margin: 0 }}>OT</Tag>;
                    if (att.status === 'casual-leave') return <Tag color="blue" style={{ margin: 0 }}>CL</Tag>;
                    return att.status;
                }
            };
        }),
        {
            title: 'Total Days',
            key: 'totalDays',
            width: 100,
            fixed: 'right',
            render: (_, record) => {
                const values = Object.values(record.attendance);
                const count = values.reduce((acc, curr) => {
                    if (curr.status === 'present' || curr.status === 'overtime') return acc + 1;
                    if (curr.status === 'half-day') return acc + 0.5;
                    if (curr.status === 'casual-leave' && curr.wage > 0) return acc + 1;
                    return acc;
                }, 0);
                return <strong>{count}</strong>;
            }
        },
        {
            title: 'OT (Hrs)',
            key: 'totalOt',
            width: 90,
            fixed: 'right',
            render: (_, record) => {
                const total = Object.values(record.attendance).reduce((acc, curr) => acc + (curr.otHours || 0), 0);
                return total > 0 ? total : '-';
            }
        },
        {
            title: 'Advance',
            key: 'totalAdvance',
            width: 100,
            fixed: 'right',
            render: (_, record) => {
                const total = Object.values(record.attendance).reduce((acc, curr) => acc + (curr.advanceDeduction || 0), 0);
                return total > 0 ? <span style={{ color: 'red' }}>{moneyFormatter({ amount: total })}</span> : '-';
            }
        },
        {
            title: 'Penalty',
            key: 'totalPenalty',
            width: 100,
            fixed: 'right',
            render: (_, record) => {
                const total = Object.values(record.attendance).reduce((acc, curr) => acc + (curr.penalty || 0), 0);
                return total > 0 ? <span style={{ color: 'red' }}>{moneyFormatter({ amount: total })}</span> : '-';
            }
        },
        {
            title: 'Net Payable',
            key: 'netPayable',
            width: 120,
            fixed: 'right',
            render: (_, record) => {
                const total = Object.values(record.attendance).reduce((acc, curr) => acc + (curr.wage || 0), 0);
                return <strong style={{ color: '#52c41a' }}>{moneyFormatter({ amount: total })}</strong>;
            }
        }
    ];

    return (
        <Card>
            <Space direction="vertical" size="large" style={{ width: '100%' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Space>
                        <Button icon={<ArrowLeftOutlined />} onClick={onBack}>Back</Button>
                        <h2>Attendance Report</h2>
                    </Space>
                    <Space>
                        <RangePicker
                            value={dateRange}
                            onChange={setDateRange}
                            allowClear={false}
                        />
                        <Button
                            type="primary"
                            icon={<DownloadOutlined />}
                            onClick={handleDownload}
                            disabled={data.length === 0}
                        >
                            Download CSV
                        </Button>
                    </Space>
                </div>

                {data.length > 0 ? (
                    <Table
                        columns={columns}
                        dataSource={data}
                        scroll={{ x: 'max-content' }}
                        pagination={false}
                        size="small"
                        loading={loading}
                    />
                ) : (
                    <Empty description="No data for this range" />
                )}
            </Space>
        </Card>
    );
};

export default AttendanceReport;
