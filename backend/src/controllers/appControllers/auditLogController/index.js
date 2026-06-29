const createCRUDController = require('@/controllers/middlewaresControllers/createCRUDController');
require('@/modules/AuditLogModule/auditLog.model'); // Ensure model is loaded

const methods = createCRUDController('AuditLog');

// Audit Logs are strictly read-only
const readOnlyError = (req, res) => {
  return res.status(403).json({
    success: false,
    message: 'Audit Logs are read-only and cannot be modified.',
  });
};

const mongoose = require('mongoose');
const AuditLog = mongoose.model('AuditLog');

methods.create = readOnlyError;
methods.update = readOnlyError;
methods.delete = readOnlyError;

// Override paginated list because AuditLog does not have the 'removed' field
methods.list = async (req, res) => {
  try {
    const page = req.query.page || 1;
    const limit = parseInt(req.query.items) || 10;
    const skip = page * limit - limit;

    const { sortBy = 'createdAt', sortValue = -1, filter, equal, action, startDate, endDate } = req.query;

    const query = {};

    // 1. Date Range Filter
    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) {
        query.createdAt.$gte = new Date(startDate);
      }
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        query.createdAt.$lte = end;
      }
    }

    // 2. Action Filter
    if (action && action !== 'all') {
      if (action === 'update' || action === 'edit') {
        query.action = { $in: ['update', 'edit', 'UPDATE', 'EDIT'] };
      } else {
        query.action = { $regex: new RegExp(`^${action}$`, 'i') };
      }
    } else if (filter && equal) {
      query[filter] = equal;
    }

    // 3. Search Query (q)
    if (req.query.q) {
      const escapeRegex = (string) => {
        return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      };
      const safeQuery = escapeRegex(req.query.q);
      const orConditions = [
        { module: { $regex: new RegExp(safeQuery, 'i') } },
        { action: { $regex: new RegExp(safeQuery, 'i') } },
        { entityType: { $regex: new RegExp(safeQuery, 'i') } },
        { 'metadata.new.name': { $regex: new RegExp(safeQuery, 'i') } },
        { 'metadata.old.name': { $regex: new RegExp(safeQuery, 'i') } },
        { 'metadata.new.description': { $regex: new RegExp(safeQuery, 'i') } },
        { 'metadata.old.description': { $regex: new RegExp(safeQuery, 'i') } },
        { 'metadata.new.receiptNumber': { $regex: new RegExp(safeQuery, 'i') } },
        { 'metadata.old.receiptNumber': { $regex: new RegExp(safeQuery, 'i') } },
        { 'metadata.new.type': { $regex: new RegExp(safeQuery, 'i') } },
        { 'metadata.old.type': { $regex: new RegExp(safeQuery, 'i') } },
        { 'metadata.new.villaNumber': { $regex: new RegExp(safeQuery, 'i') } },
        { 'metadata.old.villaNumber': { $regex: new RegExp(safeQuery, 'i') } },
      ];

      // Support numeric searches (amount, totals, numbers)
      const numQuery = Number(req.query.q);
      if (!isNaN(numQuery)) {
        orConditions.push(
          { 'metadata.new.amount': numQuery },
          { 'metadata.old.amount': numQuery },
          { 'metadata.new.total': numQuery },
          { 'metadata.old.total': numQuery },
          { 'metadata.new.number': numQuery },
          { 'metadata.old.number': numQuery }
        );
      }

      // Check if it's a valid Mongo ObjectId
      if (mongoose.Types.ObjectId.isValid(req.query.q)) {
        orConditions.push({ entityId: new mongoose.Types.ObjectId(req.query.q) });
      }

      // Search by User Name (populate userId refers to Admin model)
      const Admin = mongoose.model('Admin');
      const matchedAdmins = await Admin.find({
        name: { $regex: new RegExp(safeQuery, 'i') }
      }).select('_id').lean().exec();
      
      if (matchedAdmins.length > 0) {
        const adminIds = matchedAdmins.map(admin => admin._id);
        orConditions.push({ userId: { $in: adminIds } });
      }

      query.$or = orConditions;
    }

    const resultsPromise = AuditLog.find(query)
      .skip(skip)
      .limit(limit)
      .sort({ [sortBy]: parseInt(sortValue, 10) || -1 })
      .populate('userId')
      .exec();

    const countPromise = AuditLog.countDocuments(query);
    const [result, count] = await Promise.all([resultsPromise, countPromise]);

    const pages = Math.ceil(count / limit);
    const pagination = { page, pages, count };

    return res.status(200).json({
      success: true,
      result,
      pagination,
      message: 'Successfully found all documents',
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};

// Override search because AuditLog does not have the 'removed' field
methods.search = async (req, res) => {
  try {
    const fieldsArray = req.query.fields ? req.query.fields.split(',') : ['module', 'action'];
    const fields = { $or: [] };

    const escapeRegex = (string) => {
      return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    };
    const safeQuery = escapeRegex(req.query.q || '');

    for (const field of fieldsArray) {
      fields.$or.push({ [field]: { $regex: new RegExp(safeQuery, 'i') } });
    }

    const results = await AuditLog.find({
      ...fields,
    })
      .limit(20)
      .populate('userId')
      .exec();

    return res.status(200).json({
      success: true,
      result: results,
      message: 'Successfully found all documents',
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};

module.exports = methods;
