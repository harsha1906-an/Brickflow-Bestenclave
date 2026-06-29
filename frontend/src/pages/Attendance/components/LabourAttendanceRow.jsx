import { Radio, Tag, Space, InputNumber, Input } from 'antd';
import { CheckCircleOutlined, CloseCircleOutlined, WarningOutlined, ClockCircleOutlined, FieldTimeOutlined } from '@ant-design/icons';
import { useMoney } from '@/settings';
import useMobile from '@/hooks/useMobile';
import { useThemeContext } from '@/context/ThemeContext';

const LabourAttendanceRow = ({ labour, attendance = {}, onStatusChange, disabled = false, casualLeaveDisabled = false }) => {
    const { status, otHours, advanceDeduction, penalty, miscWorkDescription } = attendance;
    const isMarked = status !== null && status !== undefined;
    const { moneyFormatter } = useMoney();
    const isMobile = useMobile();
    const { isDarkMode } = useThemeContext();

    const getStatusBadge = () => {
        if (!isMarked) {
            return <Tag icon={<WarningOutlined />} color="warning">Unmarked</Tag>;
        }
        if (status === 'present') return <Tag icon={<CheckCircleOutlined />} color="success">Present</Tag>;
        if (status === 'absent') return <Tag icon={<CloseCircleOutlined />} color="error">Absent</Tag>;
        if (status === 'half-day') return <Tag icon={<FieldTimeOutlined />} color="processing">Half Day</Tag>;
        if (status === 'overtime') return <Tag icon={<ClockCircleOutlined />} color="purple">Overtime</Tag>;
        if (status === 'casual-leave') return <Tag icon={<CheckCircleOutlined />} color="blue">Casual Leave</Tag>;
        return null;
    };

    const getSkillLabel = (skill) => {
        const skillMap = {
            mason: 'Mason',
            electrician: 'Electrician',
            plumber: 'Plumber',
            helper: 'Helper',
            staff: 'Staff',
            other: 'Other'
        };
        return skillMap[skill] || skill;
    };

    if (isMobile) {
        const activeColorMap = {
            'present': { bg: '#22c55e', text: '#ffffff', border: '#22c55e' },
            'half-day': { bg: '#3b82f6', text: '#ffffff', border: '#3b82f6' },
            'overtime': { bg: '#8b5cf6', text: '#ffffff', border: '#8b5cf6' },
            'casual-leave': { bg: '#64748b', text: '#ffffff', border: '#64748b' },
            'absent': { bg: '#ef4444', text: '#ffffff', border: '#ef4444' }
        };

        const getStatusBadgeMobile = () => {
            if (!isMarked) {
                return (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px', padding: '4px 8px', borderRadius: '4px', background: isDarkMode ? '#2c220c' : '#fef3c7', color: isDarkMode ? '#fbbf24' : '#d97706', fontSize: '11px', fontWeight: 'bold' }}>
                        <WarningOutlined style={{ fontSize: '11px' }} />
                        Unmarked
                    </div>
                );
            }
            if (status === 'present') {
                return (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px', padding: '4px 8px', borderRadius: '4px', background: '#f0fdf4', color: '#16a34a', fontSize: '11px', fontWeight: 'bold' }}>
                        <CheckCircleOutlined style={{ fontSize: '11px' }} />
                        Present
                    </div>
                );
            }
            if (status === 'half-day') {
                return (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px', padding: '4px 8px', borderRadius: '4px', background: '#eff6ff', color: '#2563eb', fontSize: '11px', fontWeight: 'bold' }}>
                        <ClockCircleOutlined style={{ fontSize: '11px' }} />
                        Half Day
                    </div>
                );
            }
            if (status === 'overtime') {
                return (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px', padding: '4px 8px', borderRadius: '4px', background: '#f5f3ff', color: '#7c3aed', fontSize: '11px', fontWeight: 'bold' }}>
                        <ClockCircleOutlined style={{ fontSize: '11px' }} />
                        Overtime ({otHours || 0}h)
                    </div>
                );
            }
            if (status === 'casual-leave') {
                return (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px', padding: '4px 8px', borderRadius: '4px', background: '#f8fafc', color: '#475569', fontSize: '11px', fontWeight: 'bold' }}>
                        <CheckCircleOutlined style={{ fontSize: '11px' }} />
                        Casual
                    </div>
                );
            }
            if (status === 'absent') {
                return (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px', padding: '4px 8px', borderRadius: '4px', background: '#fef2f2', color: '#dc2626', fontSize: '11px', fontWeight: 'bold' }}>
                        <CloseCircleOutlined style={{ fontSize: '11px' }} />
                        Absent
                    </div>
                );
            }
            return null;
        };

        const renderStatusButton = (btnStatus, label) => {
            const isActive = status === btnStatus;
            const colors = activeColorMap[btnStatus];
            const btnBg = isActive ? colors.bg : (isDarkMode ? '#2d2d2d' : '#ffffff');
            const btnText = isActive ? colors.text : (isDarkMode ? '#bbbbbb' : '#4b5563');
            const btnBorder = isActive ? colors.border : (isDarkMode ? '#444444' : '#e5e7eb');

            return (
                <button
                    key={btnStatus}
                    onClick={() => onStatusChange(labour._id, { status: btnStatus })}
                    disabled={disabled || (btnStatus === 'casual-leave' && casualLeaveDisabled)}
                    style={{
                        whiteSpace: 'nowrap',
                        padding: '6px 14px',
                        borderRadius: '20px',
                        fontSize: '12px',
                        fontWeight: 'bold',
                        border: `1px solid ${btnBorder}`,
                        background: btnBg,
                        color: btnText,
                        cursor: 'pointer',
                        opacity: (btnStatus === 'casual-leave' && casualLeaveDisabled) ? 0.4 : 1,
                        transition: 'all 0.15s ease'
                    }}
                >
                    {label}
                </button>
            );
        };

        return (
            <div 
                style={{
                    background: isDarkMode ? '#1f1f1f' : '#ffffff',
                    border: isDarkMode ? '1px solid #303030' : '1px solid #f1f5f9',
                    borderRadius: '16px',
                    padding: '20px',
                    marginBottom: '16px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '16px',
                    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.01)'
                }}
            >
                {/* Header: Name and Status Badge */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div>
                        <h3 style={{ fontSize: '16px', fontWeight: 'bold', margin: 0, textTransform: 'uppercase', color: isDarkMode ? '#fff' : '#0f172a' }}>
                            {labour.name}
                            {labour.isSubstitute && (
                                <span style={{ marginLeft: '6px', padding: '2px 6px', background: '#dbeafe', color: '#2563eb', fontSize: '10px', borderRadius: '4px', fontWeight: 'bold' }}>
                                    Sub
                                </span>
                            )}
                        </h3>
                        <div style={{ fontSize: '12px', color: '#64748b', marginTop: '2px', fontWeight: '500' }}>
                            {getSkillLabel(labour.skill)} {labour.dailyWage ? `• ${moneyFormatter({ amount: labour.dailyWage })}/day` : ''}
                        </div>
                    </div>
                    <div>
                        {getStatusBadgeMobile()}
                    </div>
                </div>

                {/* Status Radio Buttons (horizontal scrollable) */}
                <div 
                    style={{ 
                        display: 'flex', 
                        gap: '8px', 
                        overflowX: 'auto', 
                        paddingBottom: '4px', 
                        marginLeft: '-4px', 
                        paddingLeft: '4px' 
                    }} 
                    className="no-scrollbar"
                >
                    {renderStatusButton('present', 'Present')}
                    {renderStatusButton('half-day', 'Half Day')}
                    {renderStatusButton('overtime', 'Overtime')}
                    {renderStatusButton('casual-leave', 'Casual')}
                    {renderStatusButton('absent', 'Absent')}
                </div>

                {/* OT Hours Slider (only visible if Overtime selected) */}
                {status === 'overtime' && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '8px 12px', background: isDarkMode ? '#2d2d2d' : '#f8fafc', borderRadius: '8px' }}>
                        <span style={{ fontSize: '11px', fontWeight: 'bold', color: isDarkMode ? '#aaa' : '#64748b', textTransform: 'uppercase' }}>Overtime Hours:</span>
                        <InputNumber
                            size="small"
                            min={0.5}
                            max={24}
                            step={0.5}
                            value={otHours || 0}
                            onChange={(val) => onStatusChange(labour._id, { otHours: val })}
                            disabled={disabled}
                            style={{ width: '80px', fontWeight: 'bold' }}
                        />
                    </div>
                )}

                {/* Numeric Adjustments (Advance & Penalty) */}
                {status && status !== 'absent' && (
                    <>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                            {/* Advance Deduction */}
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                <label style={{ fontSize: '10px', fontWeight: '700', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                    Advance
                                </label>
                                <div style={{ display: 'flex', alignItems: 'center', background: isDarkMode ? '#2d2d2d' : '#f8fafc', borderRadius: '8px', padding: '4px 8px' }}>
                                    <span style={{ color: '#94a3b8', fontWeight: 'bold', marginRight: '4px' }}>-</span>
                                    <input 
                                        type="number"
                                        min="0"
                                        value={advanceDeduction || 0}
                                        onChange={(e) => onStatusChange(labour._id, { advanceDeduction: e.target.value === '' ? 0 : Number(e.target.value) })}
                                        disabled={disabled}
                                        style={{
                                            width: '100%',
                                            border: 'none',
                                            background: 'transparent',
                                            textAlign: 'center',
                                            fontWeight: 'bold',
                                            fontSize: '14px',
                                            outline: 'none',
                                            color: isDarkMode ? '#ffffff' : '#1e293b',
                                            padding: 0
                                        }}
                                    />
                                </div>
                            </div>

                            {/* Penalty */}
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                <label style={{ fontSize: '10px', fontWeight: '700', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                    Penalty
                                </label>
                                <div style={{ display: 'flex', alignItems: 'center', background: isDarkMode ? '#2d2d2d' : '#f8fafc', borderRadius: '8px', padding: '4px 8px' }}>
                                    <span style={{ color: '#94a3b8', fontWeight: 'bold', marginRight: '4px' }}>-</span>
                                    <input 
                                        type="number"
                                        min="0"
                                        value={penalty || 0}
                                        onChange={(e) => onStatusChange(labour._id, { penalty: e.target.value === '' ? 0 : Number(e.target.value) })}
                                        disabled={disabled}
                                        style={{
                                            width: '100%',
                                            border: 'none',
                                            background: 'transparent',
                                            textAlign: 'center',
                                            fontWeight: 'bold',
                                            fontSize: '14px',
                                            outline: 'none',
                                            color: isDarkMode ? '#ffffff' : '#1e293b',
                                            padding: 0
                                        }}
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Misc Work Description */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                            <label style={{ fontSize: '10px', fontWeight: '700', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                Misc work description
                            </label>
                            <input
                                type="text"
                                placeholder="Add details..."
                                value={miscWorkDescription || ''}
                                onChange={(e) => onStatusChange(labour._id, { miscWorkDescription: e.target.value })}
                                disabled={disabled}
                                style={{
                                    width: '100%',
                                    border: 'none',
                                    background: isDarkMode ? '#2d2d2d' : '#f8fafc',
                                    padding: '8px 12px',
                                    borderRadius: '8px',
                                    fontSize: '13px',
                                    outline: 'none',
                                    color: isDarkMode ? '#ffffff' : '#1e293b'
                                }}
                            />
                        </div>
                    </>
                )}
            </div>
        );
    }

    return (
        <div className="attendance-row">
            <div className="attendance-name-sec">
                <div className="attendance-name-title">
                    {labour.name}
                    {labour.isSubstitute && <Tag color="blue" style={{ margin: 0 }}>Substitute</Tag>}
                </div>
                <div className="attendance-skill-subtitle">{getSkillLabel(labour.skill)}</div>
                {labour.dailyWage && <div className="attendance-wage-badge">{moneyFormatter({ amount: labour.dailyWage })}/day</div>}
            </div >
            <div className="attendance-badge-sec">
                {getStatusBadge()}
            </div>
            <div className="attendance-controls-sec">
                <div className="attendance-radio-container">
                    <Radio.Group
                        value={status}
                        onChange={(e) => onStatusChange(labour._id, { status: e.target.value })}
                        disabled={disabled}
                        buttonStyle="solid"
                        size="small"
                        className="attendance-status-radios"
                    >
                        <Radio.Button value="present">Present</Radio.Button>
                        <Radio.Button value="half-day">Half Day</Radio.Button>
                        <Radio.Button value="overtime">Overtime</Radio.Button>
                        <Radio.Button value="casual-leave" disabled={casualLeaveDisabled}>Casual Leave</Radio.Button>
                        <Radio.Button value="absent">Absent</Radio.Button>
                    </Radio.Group>

                    {status === 'overtime' && (
                        <InputNumber
                            size="small"
                            min={0.5}
                            max={8}
                            step={0.5}
                            placeholder="OT"
                            value={otHours}
                            onChange={(val) => onStatusChange(labour._id, { otHours: val })}
                            disabled={disabled}
                            addonAfter="Hrs"
                            className="attendance-ot-input"
                        />
                    )}
                </div>

                {status && status !== 'absent' && (
                    <div className="attendance-adjustments-grid">
                        <InputNumber
                            size="small"
                            min={0}
                            placeholder="Advance"
                            value={advanceDeduction}
                            onChange={(val) => onStatusChange(labour._id, { advanceDeduction: val })}
                            disabled={disabled}
                            prefix="-"
                            addonBefore="Advance"
                            className="attendance-adj-input"
                        />
                        <InputNumber
                            size="small"
                            min={0}
                            placeholder="Penalty"
                            value={penalty}
                            onChange={(val) => onStatusChange(labour._id, { penalty: val })}
                            disabled={disabled}
                            prefix="-"
                            addonBefore="Penalty"
                            className="attendance-adj-input"
                        />
                        <Input
                            size="small"
                            placeholder="Misc work description"
                            value={miscWorkDescription}
                            onChange={(e) => onStatusChange(labour._id, { miscWorkDescription: e.target.value })}
                            disabled={disabled}
                            className="attendance-desc-input"
                        />
                    </div>
                )}
            </div>
        </div >
    );
};

export default LabourAttendanceRow;
