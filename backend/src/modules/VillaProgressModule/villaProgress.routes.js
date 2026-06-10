const express = require('express');
const VillaProgress = require('./villaProgress.model');
const Villa = require('../../models/appModels/Villa');
const checkRbac = require('@/middlewares/rbacMiddleware');

const router = express.Router({ mergeParams: true });
const { logAuditAction } = require('../AuditLogModule');

// Middleware: Validate villa and company
async function validateVilla(req, res, next) {
  const { companyId, villaId } = req.params;
  // Use a more lenient check to match villaController.read behavior
  const villa = await Villa.findOne({ _id: villaId, removed: false });
  if (!villa) {
    return res.status(404).json({
      code: 'VILLA_NOT_FOUND',
      message: 'Progress cannot be recorded for a non-existent villa.'
    });
  }
  // Optional: If companyId is provided and different from villa.companyId, log a warning but allow it 
  // since the main controller doesn't enforce strict company scoping yet.
  next();
}

// Get current progress for a villa
router.get('/', validateVilla, checkRbac('villa', 'read'), async (req, res) => {
  const { companyId, villaId } = req.params;
  const progress = await VillaProgress.findOne({ companyId, villaId });
  if (!progress) return res.json(null);
  res.json(progress);
});

// Create or update progress (overwrite-last)
router.post('/', validateVilla, checkRbac('villa', 'update'), async (req, res) => {
  const { companyId, villaId } = req.params;
  const { stage, percentage, notes } = req.body;
  const updatedBy = req.admin?._id;
  if (!updatedBy) return res.status(401).json({ code: 'UNAUTHORIZED', message: 'User not authenticated.' });
  try {
    const progress = await VillaProgress.findOneAndUpdate(
      { companyId, villaId },
      { stage, percentage, notes, updatedAt: new Date(), updatedBy },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );
    res.status(200).json(progress);
    // Audit log (fail-safe, after success)
    logAuditAction({
      req,
      module: 'progress',
      action: 'update',
      entityType: 'VillaProgress',
      entityId: progress._id,
      metadata: { stage, percentage, notes }
    });
  } catch (err) {
    res.status(400).json({ code: 'PROGRESS_ERROR', message: err.message });
  }
});

module.exports = router;
