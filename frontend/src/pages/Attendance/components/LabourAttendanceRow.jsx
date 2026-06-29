import { Radio, Tag, Space, InputNumber, Input } from 'antd';
import { CheckCircleOutlined, CloseCircleOutlined, WarningOutlined, ClockCircleOutlined, FieldTimeOutlined } from '@ant-design/icons';
import { useMoney } from '@/settings';

const LabourAttendanceRow = ({ labour, attendance = {}, onStatusChange, disabled = false, casualLeaveDisabled = false }) => {
    const { status, otHours, advanceDeduction, penalty, miscWorkDescription } = attendance;
    const isMarked = status !== null && status !== undefined;
    const { moneyFormatter } = useMoney();

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

    return (
        <div style={{
            display: 'flex',
            alignItems: 'center',
            padding: '12px 16px',
            borderBottom: '1px solid #333',
        }}>
            <div style={{ flex: '0 0 200px' }}>
                <div style={{ fontWeight: 500, display: 'flex', alignItems: 'center', gap: '8px' }}>
                    {labour.name}
                    {labour.isSubstitute && <Tag color="blue" style={{ margin: 0 }}>Substitute</Tag>}
                </div>
                <div style={{ fontSize: '12px', color: '#8c8c8c' }}>{getSkillLabel(labour.skill)}</div>
                {labour.dailyWage && <div style={{ fontSize: '11px', color: '#52c41a' }}>{moneyFormatter({ amount: labour.dailyWage })}/day</div>}
            </div >
            <div style={{ flex: '0 0 100px' }}>
                {getStatusBadge()}
            </div>
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <Radio.Group
                        value={status}
                        onChange={(e) => onStatusChange(labour._id, { status: e.target.value })}
                        disabled={disabled}
                        buttonStyle="solid"
                        size="small"
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
                            placeholder="OT Hours"
                            value={otHours}
                            onChange={(val) => onStatusChange(labour._id, { otHours: val })}
                            disabled={disabled}
                            addonAfter="Hrs"
                            style={{ width: 100 }}
                        />
                    )}
                </div>

                {status && status !== 'absent' && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                        <InputNumber
                            size="small"
                            min={0}
                            placeholder="Advance"
                            value={advanceDeduction}
                            onChange={(val) => onStatusChange(labour._id, { advanceDeduction: val })}
                            disabled={disabled}
                            prefix="-"
                            addonBefore="Advance"
                            style={{ width: 130 }}
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
                            style={{ width: 130 }}
                        />
                        <Input
                            size="small"
                            placeholder="Misc work description"
                            value={miscWorkDescription}
                            onChange={(e) => onStatusChange(labour._id, { miscWorkDescription: e.target.value })}
                            disabled={disabled}
                            style={{ flex: 1, minWidth: 150 }}
                        />
                    </div>
                )}
            </div>
        </div >
    );
};

export default LabourAttendanceRow;
