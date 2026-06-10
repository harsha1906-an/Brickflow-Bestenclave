const express = require('express');
const Labour = require('../../models/appModels/Labour');
const checkRbac = require('@/middlewares/rbacMiddleware');

const router = express.Router({ mergeParams: true });
const { logAuditAction } = require('../AuditLogModule');

// List all labour for a company
router.get('/', checkRbac('labour', 'read'), async (req, res) => {
  try {
    const { companyId } = req.params;
    const labourList = await Labour.find({ companyId });
    res.json(labourList);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Create new labour
router.post('/', checkRbac('labour', 'create'), async (req, res) => {
  try {
    const { companyId } = req.params;
    const { name, skill, isActive, employmentType, dailyWage, monthlySalary, paymentDay, isSubstitute, phone } = req.body;
    const labour = new Labour({
      companyId,
      name,
      skill,
      isActive,
      employmentType,
      dailyWage,
      monthlySalary,
      paymentDay,
      isSubstitute,
      phone
    });
    await labour.save();
    res.status(201).json(labour);
    // Audit log (fail-safe, after success)
    logAuditAction({
      req,
      module: 'labour',
      action: 'create',
      entityType: 'Labour',
      entityId: labour._id,
      metadata: { name, skill, isActive, employmentType, dailyWage, monthlySalary, paymentDay, isSubstitute, phone }
    });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Update labour
router.patch('/:labourId', checkRbac('labour', 'update'), async (req, res) => {
  try {
    const { companyId, labourId } = req.params;
    const update = req.body;
    const labour = await Labour.findOneAndUpdate({ _id: labourId, companyId }, update, { new: true });
    if (!labour) return res.status(404).json({ error: 'Labour not found' });
    res.json(labour);
    // Audit log (fail-safe, after success)
    logAuditAction({
      req,
      module: 'labour',
      action: 'update',
      entityType: 'Labour',
      entityId: labour._id,
      metadata: update
    });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Delete labour
router.delete('/:labourId', checkRbac('labour', 'delete'), async (req, res) => {
  try {
    const { companyId, labourId } = req.params;
    const result = await Labour.deleteOne({ _id: labourId, companyId });
    if (result.deletedCount === 0) return res.status(404).json({ error: 'Labour not found' });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
