const express = require('express');
const router = express.Router({ mergeParams: true });
const Villa = require('../../models/appModels/Villa');
const checkRbac = require('@/middlewares/rbacMiddleware');

const { logAuditAction } = require('../AuditLogModule');
const villaController = require('../../controllers/appControllers/villaController');

// Get Villa Progress Summary for Dashboard
router.get('/progress-summary', checkRbac('villa', 'read'), villaController.progressSummary);

// List Villas for a company
router.get('/', checkRbac('villa', 'read'), async (req, res) => {
  const { companyId } = req.params;
  try {
    const villas = await Villa.find({ companyId });
    res.json(villas);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch villas' });
  }
});

// Create Villa
router.post('/', checkRbac('villa', 'create'), async (req, res) => {
  const { companyId } = req.params;
  const { villaNumber, houseType, builtUpArea, status } = req.body;
  try {
    const villa = new Villa({ companyId, villaNumber, houseType, builtUpArea, status });
    await villa.save();
    res.status(201).json(villa);
    // Audit log (fail-safe, after success)
    logAuditAction({
      req,
      module: 'villa',
      action: 'create',
      entityType: 'Villa',
      entityId: villa._id,
      metadata: { villaNumber, houseType, builtUpArea, status }
    });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Get Villa by ID
router.get('/:villaId', checkRbac('villa', 'read'), async (req, res) => {
  const { companyId, villaId } = req.params;
  try {
    const villa = await Villa.findOne({ _id: villaId, companyId });
    if (!villa) return res.status(404).json({ error: 'Villa not found' });
    res.json(villa);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch villa' });
  }
});

// Update Villa
router.put('/:villaId', checkRbac('villa', 'update'), async (req, res) => {
  const { companyId, villaId } = req.params;
  const { villaNumber, houseType, builtUpArea, status } = req.body;
  try {
    const villa = await Villa.findOneAndUpdate(
      { _id: villaId, companyId },
      { villaNumber, houseType, builtUpArea, status },
      { new: true, runValidators: true }
    );
    if (!villa) return res.status(404).json({ error: 'Villa not found' });
    res.json(villa);
    // Audit log (fail-safe, after success)
    logAuditAction({
      req,
      module: 'villa',
      action: 'update',
      entityType: 'Villa',
      entityId: villa._id,
      metadata: { villaNumber, houseType, builtUpArea, status }
    });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Delete Villa
router.delete('/:villaId', checkRbac('villa', 'delete'), async (req, res) => {
  const { companyId, villaId } = req.params;
  try {
    const villa = await Villa.findOneAndDelete({ _id: villaId, companyId });
    if (!villa) return res.status(404).json({ error: 'Villa not found' });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete villa' });
  }
});

module.exports = router;
