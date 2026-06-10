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

    const { sortBy = 'createdAt', sortValue = -1, filter, equal } = req.query;

    const fieldsArray = req.query.fields ? req.query.fields.split(',') : [];
    let fields = fieldsArray.length === 0 ? {} : { $or: [] };

    const escapeRegex = (string) => {
      return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    };
    const safeQuery = escapeRegex(req.query.q || '');

    for (const field of fieldsArray) {
      fields.$or.push({ [field]: { $regex: new RegExp(safeQuery, 'i') } });
    }

    const query = {
      ...fields,
    };
    if (filter && equal) {
      query[filter] = equal;
    }

    const resultsPromise = AuditLog.find(query)
      .skip(skip)
      .limit(limit)
      .sort({ [sortBy]: sortValue })
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
