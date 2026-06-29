import React, { useEffect, useState } from 'react';
import { Card, Button, Alert, Modal, Spin, Empty, message, Space, Form, Input, Select, Tabs } from 'antd';
import { SaveOutlined, ExclamationCircleOutlined, UserAddOutlined, BuildOutlined, FileTextOutlined, CalendarOutlined, PlusCircleOutlined, WalletOutlined } from '@ant-design/icons';
import { useUserRole } from '@/hooks/useUserRole';
import { useAppContext } from '@/context/appContext';
import { request } from '@/request';
import dayjs from 'dayjs';
import DateSelector from './components/DateSelector';
import AttendanceSummary from './components/AttendanceSummary';
import LabourAttendanceRow from './components/LabourAttendanceRow';

import AttendanceReport from './AttendanceReport';
import AttendanceReview from './AttendanceReview';
import DailyReport from './DailyReport';
import { useMoney } from '@/settings';
import useMobile from '@/hooks/useMobile';
import { useThemeContext } from '@/context/ThemeContext';

// Remove static destructuring
// const { confirm } = Modal;

const AttendanceEntry = () => {
    const isMobile = useMobile();
    const { isDarkMode } = useThemeContext();
    const [modal, modalContextHolder] = Modal.useModal();
    const [messageApi, messageContextHolder] = message.useMessage();
    const { currency_symbol } = useMoney();
    const [showReport, setShowReport] = useState(false);

    const [selectedDate, setSelectedDate] = useState(dayjs());
    const [labourList, setLabourList] = useState([]);
    const [attendanceMap, setAttendanceMap] = useState({}); // labourId -> { status, otHours, _id }
    const [monthAttendance, setMonthAttendance] = useState([]);
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [substituteModalOpen, setSubstituteModalOpen] = useState(false);
    const [substituteForm] = Form.useForm();
    const { role } = useUserRole();
    const { state: stateApp } = useAppContext();
    const companyId = stateApp.currentCompany;
    const isReadOnly = role === 'ACCOUNTANT';

    useEffect(() => {
        fetchLabourAndAttendance();
        // eslint-disable-next-line
    }, [selectedDate]);

    const fetchLabourAndAttendance = async () => {
        setLoading(true);
        try {
            // Fetch all labour (we'll filter to active only for entry)
            // Use company-specific route
            const allLabour = await request.get({ entity: `companies/${companyId}/labour` });

            // Filter to only active labour for attendance entry
            const activeLabour = allLabour.filter(l => l.isActive);
            setLabourList(activeLabour);

            // Fetch existing attendance for selected date
            const dateStr = selectedDate.format('YYYY-MM-DD');
            const attendanceData = await request.get({
                entity: `companies/${companyId}/attendance?date=${dateStr}`
            });

            // Build map of existing attendance
            const map = {};
            attendanceData.forEach(att => {
                map[att.labourId] = {
                    status: att.status,
                    otHours: att.otHours || 0,
                    advanceDeduction: att.advanceDeduction || 0,
                    penalty: att.penalty || 0,
                    miscWorkDescription: att.miscWorkDescription || '',
                    _id: att._id
                };
            });
            setAttendanceMap(map);

            // Fetch monthly attendance to track casual leave counts
            const startOfMonthStr = selectedDate.startOf('month').format('YYYY-MM-DD');
            const endOfMonthStr = selectedDate.endOf('month').format('YYYY-MM-DD');
            const monthData = await request.get({
                entity: `companies/${companyId}/attendance?startDate=${startOfMonthStr}&endDate=${endOfMonthStr}`
            });
            setMonthAttendance(monthData || []);
        } catch (e) {
            messageApi.error('Failed to load data');
            console.error(e);
        }
        setLoading(false);
    };

    const handleStatusChange = (labourId, update) => {
        setAttendanceMap(prev => ({
            ...prev,
            [labourId]: {
                ...prev[labourId],
                ...update
            }
        }));
    };

    const getClCountExcludingToday = (labourId) => {
        const dateStr = selectedDate.format('YYYY-MM-DD');
        let count = 0;
        monthAttendance.forEach(att => {
            if (att.labourId === labourId && att.status === 'casual-leave') {
                const attDateStr = dayjs(att.date).format('YYYY-MM-DD');
                if (attDateStr !== dateStr) {
                    count++;
                }
            }
        });
        return count;
    };

    const handleAddSubstitute = async () => {
        try {
            const values = await substituteForm.validateFields();
            setSaving(true);
            const res = await request.post({
                entity: `companies/${companyId}/labour`,
                jsonData: {
                    ...values,
                    isActive: true,
                    isSubstitute: true
                }
            });
            messageApi.success('Substitute labour added');
            setSubstituteModalOpen(false);
            substituteForm.resetFields();
            // Refresh list and mark as present by default
            const newLabour = res;
            setLabourList(prev => [...prev, newLabour]);
            handleStatusChange(newLabour._id, 'present', 0);
        } catch (e) {
            console.error(e);
            messageApi.error('Failed to add substitute');
        }
        setSaving(false);
    };

    const getStatistics = () => {
        const total = labourList.length;
        let present = 0;
        let absent = 0;
        let unmarked = 0;

        labourList.forEach(labour => {
            const attendance = attendanceMap[labour._id];
            if (!attendance || !attendance.status) {
                unmarked++;
            } else if (['present', 'half-day', 'overtime'].includes(attendance.status)) {
                present++;
            } else if (['absent', 'casual-leave'].includes(attendance.status)) {
                absent++;
            }
        });

        return { total, present, absent, unmarked };
    };

    const handleSave = () => {
        const stats = getStatistics();

        if (stats.unmarked > 0) {
            // Show warning if some labour are unmarked
            modal.confirm({
                title: 'Unmarked Labour',
                icon: <ExclamationCircleOutlined />,
                content: (
                    <div>
                        <p><strong>{stats.unmarked}</strong> out of <strong>{stats.total}</strong> labour members have no attendance marked for this date.</p>
                        <p>Do you want to proceed and save only the marked attendance?</p>
                    </div>
                ),
                okText: 'Proceed',
                cancelText: 'Cancel',
                onOk: () => performSave(stats)
            });
        } else {
            // All marked, show simple confirmation
            modal.confirm({
                title: 'Save Attendance',
                content: `Save attendance for ${stats.total} labour members on ${selectedDate.format('DD MMM YYYY')}?`,
                okText: 'Save',
                cancelText: 'Cancel',
                onOk: () => performSave(stats)
            });
        }
    };

    const performSave = async (stats) => {
        setSaving(true);
        const dateStr = selectedDate.format('YYYY-MM-DD');
        let successCount = 0;
        let errorCount = 0;
        const errors = [];

        try {
            // Process each labour with marked attendance
            for (const labour of labourList) {
                const attendance = attendanceMap[labour._id];

                // Skip unmarked
                if (!attendance || !attendance.status) continue;

                try {
                    const payload = {
                        status: attendance.status,
                        otHours: attendance.otHours,
                        advanceDeduction: attendance.advanceDeduction,
                        penalty: attendance.penalty,
                        miscWorkDescription: attendance.miscWorkDescription
                    };

                    if (attendance._id) {
                        // Update existing attendance
                        await request.patch({
                            entity: `companies/${companyId}/attendance/${attendance._id}`,
                            jsonData: payload
                        });
                    } else {
                        // Create new attendance
                        await request.post({
                            entity: `companies/${companyId}/attendance`,
                            jsonData: {
                                labourId: labour._id,
                                date: dateStr,
                                ...payload
                            }
                        });
                    }
                    successCount++;
                } catch (e) {
                    errorCount++;
                    errors.push(`${labour.name}: ${e.response?.data?.error || e.message}`);
                }
            }

            // Show results
            if (errorCount === 0) {
                messageApi.success(`Successfully saved attendance for ${successCount} labour members`);
            } else {
                modal.error({
                    title: 'Partial Save',
                    content: (
                        <div>
                            <p>Saved: {successCount}, Failed: {errorCount}</p>
                            {errors.length > 0 && (
                                <div style={{ marginTop: 8 }}>
                                    <strong>Errors:</strong>
                                    <ul style={{ marginTop: 4, marginBottom: 0 }}>
                                        {errors.map((err, idx) => (
                                            <li key={idx} style={{ fontSize: 12 }}>{err}</li>
                                        ))}
                                    </ul>
                                </div>
                            )}
                        </div>
                    )
                });
            }

            // Refresh data
            fetchLabourAndAttendance();
        } catch (e) {
            messageApi.error('Failed to save attendance');
            console.error(e);
        }
        setSaving(false);
    };

    const handleMarkAll = (status) => {
        modal.confirm({
            title: `Mark All as ${status === 'present' ? 'Present' : 'Absent'}`,
            content: `Set attendance to "${status === 'present' ? 'Present' : 'Absent'}" for all ${labourList.length} labour members?`,
            okText: 'Proceed',
            cancelText: 'Cancel',
            onOk: () => {
                const newMap = { ...attendanceMap };
                labourList.forEach(labour => {
                    newMap[labour._id] = {
                        ...newMap[labour._id],
                        status
                    };
                });
                setAttendanceMap(newMap);
                messageApi.success(`All labour marked as ${status}`);
            }
        });
    };

    const [activeMainTab, setActiveMainTab] = useState('mark');
    const stats = getStatistics();
    return (
        <div>
            {modalContextHolder}
            {messageContextHolder}

            {/* Custom Mobile Action Tabs matching prototype */}
            {isMobile && (
              <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '12px', marginBottom: '8px' }} className="no-scrollbar">
                <button 
                  onClick={() => setActiveMainTab('mark')}
                  style={{
                    whiteSpace: 'nowrap',
                    padding: '8px 16px',
                    borderRadius: '20px',
                    fontSize: '13px',
                    fontWeight: '600',
                    border: activeMainTab === 'mark' ? '1px solid #0084ff' : '1px solid #e2e8f0',
                    background: activeMainTab === 'mark' ? '#f0f9ff' : '#ffffff',
                    color: activeMainTab === 'mark' ? '#0084ff' : '#64748b',
                    cursor: 'pointer',
                    outline: 'none',
                    transition: 'all 0.2s ease'
                  }}
                >
                  Mark Attendance
                </button>
                <button 
                  onClick={() => setActiveMainTab('review')}
                  style={{
                    whiteSpace: 'nowrap',
                    padding: '8px 16px',
                    borderRadius: '20px',
                    fontSize: '13px',
                    fontWeight: '600',
                    border: activeMainTab === 'review' ? '1px solid #0084ff' : '1px solid #e2e8f0',
                    background: activeMainTab === 'review' ? '#f0f9ff' : '#ffffff',
                    color: activeMainTab === 'review' ? '#0084ff' : '#64748b',
                    cursor: 'pointer',
                    outline: 'none',
                    transition: 'all 0.2s ease'
                  }}
                >
                  Review Payments
                </button>
                <button 
                  onClick={() => setActiveMainTab('report')}
                  style={{
                    whiteSpace: 'nowrap',
                    padding: '8px 16px',
                    borderRadius: '20px',
                    fontSize: '13px',
                    fontWeight: '600',
                    border: activeMainTab === 'report' ? '1px solid #0084ff' : '1px solid #e2e8f0',
                    background: activeMainTab === 'report' ? '#f0f9ff' : '#ffffff',
                    color: activeMainTab === 'report' ? '#0084ff' : '#64748b',
                    cursor: 'pointer',
                    outline: 'none',
                    transition: 'all 0.2s ease'
                  }}
                >
                  Monthly Report
                </button>
              </div>
            )}

            <Tabs
                activeKey={activeMainTab}
                onChange={setActiveMainTab}
                type="card"
                renderTabBar={isMobile ? () => <></> : undefined}
                style={{ marginBottom: 16 }}
                items={[
                    {
                        key: 'mark',
                        label: <span><PlusCircleOutlined /> Mark Attendance</span>,
                        children: (
                            <Card style={{ border: isMobile ? 'none' : undefined, background: isMobile ? 'transparent' : undefined }} styles={{ body: { padding: isMobile ? 0 : undefined } }}>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: isMobile ? '16px' : '24px', width: '100%' }}>
                                    {/* Header */}
                                    {isMobile ? (
                                      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                        {/* Title and Add Substitute */}
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                          <h2 style={{ fontSize: '18px', fontWeight: 'bold', margin: 0 }}>Mark Attendance</h2>
                                          <Button 
                                            type="text" 
                                            icon={<span style={{ fontSize: '16px', fontWeight: 'bold' }}>+</span>} 
                                            onClick={() => setSubstituteModalOpen(true)}
                                            disabled={isReadOnly}
                                            style={{ color: '#0084ff', fontWeight: '700', padding: '4px 8px', height: 'auto', display: 'flex', alignItems: 'center', gap: '2px' }}
                                          >
                                            Substitute
                                          </Button>
                                        </div>

                                        {/* Date Selector & Today/Yesterday */}
                                        <div style={{ display: 'flex', gap: '8px', alignItems: 'center', width: '100%' }}>
                                          <div style={{ flex: 1 }} className="mobile-horizontal">
                                            <DateSelector
                                              value={selectedDate}
                                              onChange={setSelectedDate}
                                              disabled={isReadOnly}
                                            />
                                          </div>
                                          <Button 
                                            onClick={() => setSelectedDate(dayjs())}
                                            style={{ borderRadius: '8px', fontSize: '13px', height: '40px', fontWeight: '500' }}
                                          >
                                            Today
                                          </Button>
                                          <Button 
                                            onClick={() => setSelectedDate(dayjs().subtract(1, 'day'))}
                                            style={{ borderRadius: '8px', fontSize: '13px', height: '40px', fontWeight: '500' }}
                                          >
                                            Yesterday
                                          </Button>
                                        </div>
                                      </div>
                                    ) : (
                                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                          <h2 style={{ margin: 0 }}>Mark Attendance</h2>
                                          <Space>
                                              <Button icon={<UserAddOutlined />} onClick={() => setSubstituteModalOpen(true)} disabled={isReadOnly}>
                                                  Add Substitute
                                              </Button>
                                              <Button icon={<FileTextOutlined />} onClick={() => setActiveMainTab('report')}>
                                                  View Report
                                              </Button>
                                              <DateSelector
                                                  value={selectedDate}
                                                  onChange={setSelectedDate}
                                                  disabled={isReadOnly}
                                              />
                                          </Space>
                                      </div>
                                    )}

                                    {/* Summary */}
                                    {!loading && labourList.length > 0 && (
                                        <AttendanceSummary
                                            total={stats.total}
                                            present={stats.present}
                                            absent={stats.absent}
                                            unmarked={stats.unmarked}
                                        />
                                    )}

                                    {/* Warning for unmarked */}
                                    {!loading && stats.unmarked > 0 && !isReadOnly && (
                                        <Alert
                                            message="Unmarked Labour"
                                            description={`${stats.unmarked} labour member${stats.unmarked > 1 ? 's' : ''} have no attendance marked for ${selectedDate.format('DD MMM YYYY')}.`}
                                            type="warning"
                                            showIcon
                                        />
                                    )}

                                    {/* Quick Actions */}
                                    {!loading && !isReadOnly && labourList.length > 0 && (
                                        isMobile ? (
                                          <div style={{ display: 'flex', gap: '12px', width: '100%', padding: '0 4px' }}>
                                            <Button 
                                              onClick={() => handleMarkAll('present')} 
                                              style={{ flex: 1, height: '40px', borderRadius: '10px', fontWeight: '600', color: '#1e293b', border: '1px solid #e2e8f0', boxShadow: '0 1px 2px rgba(0,0,0,0.02)' }}
                                            >
                                              Mark All Present
                                            </Button>
                                            <Button 
                                              onClick={() => handleMarkAll('absent')} 
                                              style={{ flex: 1, height: '40px', borderRadius: '10px', fontWeight: '600', color: '#1e293b', border: '1px solid #e2e8f0', boxShadow: '0 1px 2px rgba(0,0,0,0.02)' }}
                                            >
                                              Mark All Absent
                                            </Button>
                                          </div>
                                        ) : (
                                          <Space>
                                              <Button onClick={() => handleMarkAll('present')} size="small">
                                                  Mark All Present
                                              </Button>
                                              <Button onClick={() => handleMarkAll('absent')} size="small">
                                                  Mark All Absent
                                              </Button>
                                          </Space>
                                        )
                                    )}

                                    {/* Labour List */}
                                    {loading ? (
                                        <div style={{ textAlign: 'center', padding: '40px 0' }}>
                                            <Spin size="large" />
                                        </div>
                                    ) : labourList.length === 0 ? (
                                        <Empty
                                            description="No active labour members found"
                                            image={Empty.PRESENTED_IMAGE_SIMPLE}
                                        />
                                    ) : (
                                        <div style={{ background: 'transparent', padding: 0 }} className="mobile-cards-list-container">
                                            {labourList.map(labour => {
                                                const clCountExcludingToday = getClCountExcludingToday(labour._id);
                                                return (
                                                    <LabourAttendanceRow
                                                        key={labour._id}
                                                        labour={labour}
                                                        attendance={attendanceMap[labour._id]}
                                                        onStatusChange={handleStatusChange}
                                                        disabled={isReadOnly}
                                                        casualLeaveDisabled={clCountExcludingToday >= 4}
                                                    />
                                                );
                                            })}
                                        </div>
                                    )}

                                    {/* Save Button */}
                                    {!loading && !isReadOnly && labourList.length > 0 && (
                                        isMobile ? (
                                          <div style={{
                                            position: 'fixed',
                                            bottom: 0,
                                            left: 0,
                                            right: 0,
                                            backgroundColor: isDarkMode ? '#1f1f1f' : '#ffffff',
                                            borderTop: isDarkMode ? '1px solid #333' : '1px solid #eee',
                                            padding: '12px 16px',
                                            zIndex: 1000,
                                            boxShadow: '0 -4px 10px rgba(0, 0, 0, 0.05)',
                                            paddingBottom: 'calc(12px + safe-area-inset-bottom)'
                                          }}>
                                            <Button
                                                type="primary"
                                                size="large"
                                                icon={<SaveOutlined />}
                                                onClick={handleSave}
                                                loading={saving}
                                                disabled={stats.total === stats.unmarked}
                                                style={{
                                                  width: '100%',
                                                  height: '48px',
                                                  borderRadius: '12px',
                                                  fontWeight: 'bold',
                                                  fontSize: '15px',
                                                  display: 'flex',
                                                  alignItems: 'center',
                                                  justifyContent: 'center',
                                                  gap: '8px',
                                                  boxShadow: '0 4px 12px rgba(24, 144, 255, 0.2)'
                                                }}
                                            >
                                                Save Attendance ({stats.total - stats.unmarked} marked)
                                            </Button>
                                          </div>
                                        ) : (
                                          <div style={{ textAlign: 'right' }}>
                                              <Button
                                                  type="primary"
                                                  size="large"
                                                  icon={<SaveOutlined />}
                                                  onClick={handleSave}
                                                  loading={saving}
                                                  disabled={stats.total === stats.unmarked} // Disable if nothing marked
                                              >
                                                  Save Attendance ({stats.total - stats.unmarked} marked)
                                              </Button>
                                          </div>
                                        )
                                    )}

                                    {/* Read-only notice */}
                                    {isReadOnly && (
                                        <Alert
                                            message="View Only"
                                            description="You do not have permission to mark attendance."
                                            type="info"
                                            showIcon
                                        />
                                    )}
                                </div>
                            </Card>
                        )
                    },
                    {
                        key: 'review',
                        label: <span><CalendarOutlined /> Review Payments & Attendance</span>,
                        children: <AttendanceReview />
                    },
                    {
                        key: 'report',
                        label: <span><FileTextOutlined /> Monthly Matrix Report</span>,
                        children: <AttendanceReport onBack={() => setActiveMainTab('mark')} />
                    }
                ]}
            />
            <Modal
                title="Add Substitute Labour (Daily Wage)"
                open={substituteModalOpen}
                onCancel={() => setSubstituteModalOpen(false)}
                onOk={handleAddSubstitute}
                confirmLoading={saving}
                destroyOnClose
            >
                <Form form={substituteForm} layout="vertical" initialValues={{ skill: 'helper' }}>
                    <Form.Item name="name" label="Labour Name" rules={[{ required: true, message: 'Please enter name' }]}>
                        <Input placeholder="Full Name" />
                    </Form.Item>
                    <Form.Item name="skill" label="Skill / Work Type" rules={[{ required: true }]}>
                        <Select options={[
                            { value: 'mason', label: 'Mason' },
                            { value: 'electrician', label: 'Electrician' },
                            { value: 'plumber', label: 'Plumber' },
                            { value: 'helper', label: 'Helper' },
                            { value: 'staff', label: 'Staff' },
                            { value: 'other', label: 'Other' },
                        ]} />
                    </Form.Item>
                    <Form.Item name="dailyWage" label="Daily Wage" rules={[{ required: true, message: 'Please enter wage' }]}>
                        <Input type="number" prefix={currency_symbol} placeholder="0.00" />
                    </Form.Item>
                    <Form.Item name="phone" label="Phone (Optional)">
                        <Input placeholder="Contact Number" />
                    </Form.Item>
                </Form>
            </Modal>
        </div>
    );
};

export default AttendanceEntry;
