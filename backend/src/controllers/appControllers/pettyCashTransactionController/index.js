const createCRUDController = require('@/controllers/middlewaresControllers/createCRUDController');
const methods = createCRUDController('PettyCashTransaction');
const mongoose = require('mongoose');

const summary = require('./summary');
const report = require('./report');

// Helper to calculate balance excluding a specific transaction ID
const getBalanceExcluding = async (excludeId = null) => {
  const PettyCashTransaction = mongoose.model('PettyCashTransaction');
  const match = { removed: false };
  if (excludeId) {
    match._id = { $ne: new mongoose.Types.ObjectId(excludeId) };
  }
  
  const agg = await PettyCashTransaction.aggregate([
    { $match: match },
    {
      $group: {
        _id: '$type',
        total: { $sum: '$amount' }
      }
    }
  ]);
  
  let totalInward = 0;
  let totalOutward = 0;
  agg.forEach(item => {
    if (item._id === 'inward') totalInward = item.total;
    if (item._id === 'outward') totalOutward = item.total;
  });
  
  return { totalInward, totalOutward, balance: totalInward - totalOutward };
};

// Override create
const originalCreate = methods.create;
methods.create = async (req, res) => {
  try {
    const { type, amount } = req.body;
    const parsedAmount = Number(amount);
    
    if (type === 'outward') {
      const { balance } = await getBalanceExcluding();
      if (parsedAmount > balance) {
        return res.status(400).json({
          success: false,
          result: null,
          message: `Cannot record expense. Amount (${parsedAmount}) exceeds remaining petty cash balance (${balance}).`
        });
      }
    }
    return originalCreate(req, res);
  } catch (error) {
    return res.status(500).json({
      success: false,
      result: null,
      message: error.message
    });
  }
};

// Override update
const originalUpdate = methods.update;
methods.update = async (req, res) => {
  try {
    const PettyCashTransaction = mongoose.model('PettyCashTransaction');
    const existing = await PettyCashTransaction.findOne({ _id: req.params.id, removed: false });
    if (!existing) {
      return res.status(404).json({ success: false, message: 'Transaction not found' });
    }
    
    const newType = req.body.type !== undefined ? req.body.type : existing.type;
    const newAmount = Number(req.body.amount !== undefined ? req.body.amount : existing.amount);
    
    const { totalInward, totalOutward } = await getBalanceExcluding(existing._id);
    const hypotheticalInward = totalInward + (newType === 'inward' ? newAmount : 0);
    const hypotheticalOutward = totalOutward + (newType === 'outward' ? newAmount : 0);
    
    if (hypotheticalInward - hypotheticalOutward < 0) {
      return res.status(400).json({
        success: false,
        result: null,
        message: `Updating this transaction would result in a negative remaining balance (${hypotheticalInward - hypotheticalOutward}).`
      });
    }
    
    return originalUpdate(req, res);
  } catch (error) {
    return res.status(500).json({
      success: false,
      result: null,
      message: error.message
    });
  }
};

// Override delete
const originalDelete = methods.delete;
methods.delete = async (req, res) => {
  try {
    const PettyCashTransaction = mongoose.model('PettyCashTransaction');
    const existing = await PettyCashTransaction.findOne({ _id: req.params.id, removed: false });
    if (!existing) {
      return res.status(404).json({ success: false, message: 'Transaction not found' });
    }
    
    if (existing.type === 'inward') {
      const { totalInward, totalOutward } = await getBalanceExcluding(existing._id);
      if (totalInward - totalOutward < 0) {
        return res.status(400).json({
          success: false,
          result: null,
          message: `Deleting this top-up transaction would result in a negative remaining balance (${totalInward - totalOutward}).`
        });
      }
    }
    
    return originalDelete(req, res);
  } catch (error) {
    return res.status(500).json({
      success: false,
      result: null,
      message: error.message
    });
  }
};

methods.summary = summary;
methods.report = report;

module.exports = methods;
