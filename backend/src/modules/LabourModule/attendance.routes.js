const express = require('express');
const Attendance = require('../../models/appModels/Attendance');
const Labour = require('../../models/appModels/Labour');
const checkRbac = require('@/middlewares/rbacMiddleware');

const router = express.Router({ mergeParams: true });
const { logAuditAction } = require('../AuditLogModule');

// List attendance for a company (optionally filter by labourId or date)
router.get('/', checkRbac('attendance', 'read'), async (req, res) => {
  try {
    const { companyId } = req.params;
    const { labourId, date } = req.query;
    const filter = { companyId };
    if (labourId) filter.labourId = labourId;
    if (date) filter.date = new Date(date);
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
    res.status(201).json(attendance);
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

    // Optional: Recalculate wage if status/otHours changes
    if (update.status || update.otHours !== undefined) {
      const existing = await Attendance.findById(attendanceId).populate('labourId');
      if (existing && existing.labourId && existing.labourId.dailyWage) {
        const labour = existing.labourId;
        const status = update.status || existing.status;
        const otHours = update.otHours !== undefined ? update.otHours : (existing.otHours || 0);

        if (status === 'present') update.wage = labour.dailyWage;
        else if (status === 'half-day') update.wage = labour.dailyWage / 2;
        else if (status === 'overtime') {
          const hourly = labour.dailyWage / 8;
          update.wage = labour.dailyWage + (otHours || 0) * hourly;
        } else if (status === 'absent') {
          update.wage = 0;
        }
      }
    }

    const attendance = await Attendance.findOneAndUpdate({ _id: attendanceId, companyId }, update, { new: true });
    if (!attendance) return res.status(404).json({ error: 'Attendance not found' });
    res.json(attendance);
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

    await Attendance.deleteOne({ _id: attendanceId, companyId });
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
