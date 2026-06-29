const express = require('express');
const moment = require('moment');
const Attendance = require('../../models/appModels/Attendance');
const Labour = require('../../models/appModels/Labour');
const checkRbac = require('@/middlewares/rbacMiddleware');

const router = express.Router({ mergeParams: true });
const { logAuditAction } = require('../AuditLogModule');

const updateCasualLeaveWages = async (labourId, date, companyId) => {
  const startOfMonth = moment(date).utcOffset('+05:30').startOf('month').toDate();
  const endOfMonth = moment(date).utcOffset('+05:30').endOf('month').toDate();

  const attendances = await Attendance.find({
    labourId,
    companyId,
    date: { $gte: startOfMonth, $lte: endOfMonth },
    status: 'casual-leave'
  }).sort({ date: 1 });

  const labour = await Labour.findById(labourId);
  if (!labour) return;
  const dailyWage = labour.dailyWage || 0;

  for (let i = 0; i < attendances.length; i++) {
    const att = attendances[i];
    const targetWage = (i < 4) ? dailyWage : 0;
    if (att.wage !== targetWage) {
      att.wage = targetWage;
      await att.save();
    }
  }
};

// List attendance for a company (optionally filter by labourId or date range)
router.get('/', checkRbac('attendance', 'read'), async (req, res) => {
  try {
    const { companyId } = req.params;
    const { labourId, date, startDate, endDate } = req.query;
    const filter = { companyId };
    if (labourId) filter.labourId = labourId;
    if (date) {
      filter.date = new Date(date);
    } else if (startDate && endDate) {
      filter.date = {
        $gte: new Date(startDate),
        $lte: new Date(new Date(endDate).setHours(23, 59, 59, 999))
      };
    }
    const attendanceList = await Attendance.find(filter);
    res.json(attendanceList);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Mark attendance
router.post('/', checkRbac('attendance', 'create'), async (req, res) => {
  try {
    const { companyId } = req.params;
    const { labourId, date, status, otHours, advanceDeduction, penalty, miscWorkDescription } = req.body;
    // Validate labour exists and belongs to company
    const labour = await Labour.findOne({ _id: labourId, companyId });
    if (!labour) return res.status(400).json({ error: 'Invalid labourId for this company' });

    // Simple wage calculation logic
    let wage = 0;
    if (labour.dailyWage) {
      if (status === 'present') wage = labour.dailyWage;
      else if (status === 'half-day') wage = labour.dailyWage / 2;
      else if (status === 'overtime') {
        const hourly = labour.dailyWage / 8; // Assumes 8hr day
        wage = labour.dailyWage + (otHours || 0) * hourly;
      } else if (status === 'casual-leave') {
        // Temporarily assign dailyWage, will be adjusted by updateCasualLeaveWages
        wage = labour.dailyWage;
      }
    }

    const attendance = new Attendance({
      companyId,
      labourId,
      date,
      status,
      otHours,
      advanceDeduction,
      penalty,
      wage,
      miscWorkDescription
    });
    await attendance.save();

    if (status === 'casual-leave') {
      await updateCasualLeaveWages(labourId, date, companyId);
      const updatedAttendance = await Attendance.findById(attendance._id);
      res.status(201).json(updatedAttendance);
    } else {
      res.status(201).json(attendance);
    }
    // Audit log (fail-safe, after success)
    logAuditAction({
      req,
      module: 'attendance',
      action: 'create',
      entityType: 'Attendance',
      entityId: attendance._id,
      metadata: { labourId, date, status, otHours, advanceDeduction, penalty, wage, miscWorkDescription }
    });
  } catch (err) {
    if (err.code === 11000) {
      res.status(409).json({ error: 'Attendance already marked for this labour and date' });
    } else {
      res.status(400).json({ error: err.message });
    }
  }
});

// Update attendance
const updateAttendanceHandler = async (req, res) => {
  try {
    const { companyId, attendanceId } = req.params;
    const update = req.body;

    let statusChanged = false;
    let oldStatus = '';
    let oldDate = null;

    // Optional: Recalculate wage if status/otHours changes
    if (update.status || update.otHours !== undefined) {
      const existing = await Attendance.findById(attendanceId).populate('labourId');
      if (existing && existing.labourId && existing.labourId.dailyWage) {
        const labour = existing.labourId;
        const status = update.status || existing.status;
        const otHours = update.otHours !== undefined ? update.otHours : (existing.otHours || 0);

        oldStatus = existing.status;
        oldDate = existing.date;
        if (existing.status !== status) {
          statusChanged = true;
        }

        if (status === 'present') update.wage = labour.dailyWage;
        else if (status === 'half-day') update.wage = labour.dailyWage / 2;
        else if (status === 'overtime') {
          const hourly = labour.dailyWage / 8;
          update.wage = labour.dailyWage + (otHours || 0) * hourly;
        } else if (status === 'absent') {
          update.wage = 0;
        } else if (status === 'casual-leave') {
          // Temporarily assign dailyWage, will be adjusted by updateCasualLeaveWages
          update.wage = labour.dailyWage;
        }
      }
    }

    const attendance = await Attendance.findOneAndUpdate({ _id: attendanceId, companyId }, update, { new: true });
    if (!attendance) return res.status(404).json({ error: 'Attendance not found' });

    if (statusChanged || attendance.status === 'casual-leave' || oldStatus === 'casual-leave') {
      await updateCasualLeaveWages(attendance.labourId, attendance.date, companyId);
      if (oldDate && moment(oldDate).format('YYYY-MM') !== moment(attendance.date).format('YYYY-MM')) {
        await updateCasualLeaveWages(attendance.labourId, oldDate, companyId);
      }
      const updatedAttendance = await Attendance.findById(attendanceId);
      res.json(updatedAttendance);
    } else {
      res.json(attendance);
    }

    // Audit log (fail-safe, after success)
    logAuditAction({
      req,
      module: 'attendance',
      action: 'update',
      entityType: 'Attendance',
      entityId: attendance._id,
      metadata: update
    });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

router.put('/:attendanceId', checkRbac('attendance', 'update'), updateAttendanceHandler);
router.patch('/:attendanceId', checkRbac('attendance', 'update'), updateAttendanceHandler);

// Delete attendance
router.delete('/:attendanceId', checkRbac('attendance', 'delete'), async (req, res) => {
  try {
    const { companyId, attendanceId } = req.params;
    const attendance = await Attendance.findOne({ _id: attendanceId, companyId });
    if (!attendance) return res.status(404).json({ error: 'Attendance not found' });

    const status = attendance.status;
    const labourId = attendance.labourId;
    const date = attendance.date;

    await Attendance.deleteOne({ _id: attendanceId, companyId });

    if (status === 'casual-leave') {
      await updateCasualLeaveWages(labourId, date, companyId);
    }

    res.json({ success: true });
    
    // Audit log (fail-safe, after success)
    logAuditAction({
      req,
      module: 'attendance',
      action: 'delete',
      entityType: 'Attendance',
      entityId: attendanceId,
      metadata: attendance.toObject ? attendance.toObject() : attendance
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
// Trigger nodemon restart after port is free
