const express = require('express');
const mongoose = require('mongoose');
const Labour = require('../../models/appModels/Labour');
const checkRbac = require('@/middlewares/rbacMiddleware');

const router = express.Router({ mergeParams: true });
const { logAuditAction } = require('../AuditLogModule');

// List all labour for a company
router.get('/', checkRbac('labour', 'read'), async (req, res) => {
  try {
    const { companyId } = req.params;
    const labourList = await Labour.find({ companyId }).lean();
    
    const LabourContract = mongoose.model('LabourContract');
    const updatedList = await Promise.all(labourList.map(async (labour) => {
      const contractCount = await LabourContract.countDocuments({ labour: labour._id, removed: false });
      return {
        ...labour,
        hasActiveContracts: contractCount > 0
      };
    }));
    
    res.json(updatedList);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Create new labour
router.post('/', checkRbac('labour', 'create'), async (req, res) => {
  try {
    const { companyId } = req.params;
    const {
      name,
      skill,
      isActive,
      employmentType,
      dailyWage,
      monthlySalary,
      paymentDay,
      isSubstitute,
      phone,
      customSkill,
      notes,
      milestonePlan
    } = req.body;
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
      phone,
      customSkill,
      notes,
      milestonePlan
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
      metadata: {
        name,
        skill,
        isActive,
        employmentType,
        dailyWage,
        monthlySalary,
        paymentDay,
        isSubstitute,
        phone,
        customSkill,
        notes,
        milestonePlan
      }
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
    
    if (update.milestonePlan) {
      const LabourContract = mongoose.model('LabourContract');
      const contractCount = await LabourContract.countDocuments({ labour: labourId, removed: false });
      if (contractCount > 0) {
        return res.status(400).json({ error: 'Cannot edit milestone plan of a contractor with active contracts' });
      }
    }
    
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
const deleteLabourHandler = async (req, res) => {
  try {
    const { companyId, labourId } = req.params;
    const result = await Labour.deleteOne({ _id: labourId, companyId });
    if (result.deletedCount === 0) return res.status(404).json({ error: 'Labour not found' });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

router.delete('/:labourId', checkRbac('labour', 'delete'), deleteLabourHandler);
router.delete('/delete/:labourId', checkRbac('labour', 'delete'), deleteLabourHandler);

module.exports = router;
