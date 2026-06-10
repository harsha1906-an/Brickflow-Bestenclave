const custom = require('@/controllers/pdfController');
const mongoose = require('mongoose');
const moment = require('moment');

module.exports = downloadPdf = async (req, res, { directory, id }) => {
  try {
    const role = req.admin?.role || 'engineer';
    
    // RBAC mapping for download directories
    const directoryToEntity = {
      invoice: 'invoice',
      quote: 'quote',
      payment: 'payment',
      paymentrequest: 'booking',
      bookingreceipt: 'booking',
      expense: 'expense',
      supplier: 'supplier',
      inventoryreport: 'material',
      villa: 'villa'
    };

    const entityName = directoryToEntity[directory] || directory;
    
    // Check permission using the rbacConfig
    const rbacConfig = require('@/settings/rbacConfig');
    let allowedRoles = ['owner', 'manager']; // Default fallback
    
    if (rbacConfig.entities[entityName] && rbacConfig.entities[entityName]['read']) {
      allowedRoles = rbacConfig.entities[entityName]['read'];
    }

    if (!allowedRoles.includes(role)) {
      return res.status(403).json({
        success: false,
        message: `Forbidden: Your role (${role}) is not authorized to download this document.`
      });
    }

    let modelName = directory.slice(0, 1).toUpperCase() + directory.slice(1);
    if (directory === 'paymentrequest' || directory === 'bookingreceipt') {
      modelName = 'Booking';
    }

    if (mongoose.models[modelName]) {
      const Model = mongoose.model(modelName);
      let query = Model.findOne({ _id: id });
      if (Model.schema.paths.client) query = query.populate('client');
      if (Model.schema.paths.villa) query = query.populate('villa');
      if (Model.schema.paths.labour) query = query.populate('labour');
      if (Model.schema.paths.supplier) query = query.populate('supplier');
      let result = await query.exec();

      // Throw error if no result
      if (!result) {
        throw { name: 'ValidationError' };
      }

      // Convert to plain object to allow adding custom properties like inWords
      if (result.toObject) {
         result = result.toObject();
      }

      // Handle paymentrequest specific logic
      if (directory === 'paymentrequest') {
        const milestoneId = req.query.milestoneId;
        const milestone = result.paymentPlan.find(m => m._id.toString() === milestoneId);
        if (!milestone) {
          return res.status(404).json({
            success: false,
            message: 'Milestone not found'
          });
        }
        result.requestedMilestone = milestone;
        // set a virtual date for the filename logic below
        result.date = milestone.dueDate || result.bookingDate;
        result.number = milestone.name.replace(/[^a-z0-9]/gi, '_');
      }

      // Handle Booking Receipt logic
      if (directory === 'bookingreceipt') {
        const { numberToWords } = require('@/helpers');
        result.inWords = numberToWords(result.downPayment || 0);
        // Reset modelName to 'BookingReceipt' so it uses the correct PUG template
        modelName = 'BookingReceipt';
      }

      // Handle Expense Voucher logic
      if (directory === 'expense') {
        const { numberToWords } = require('@/helpers');
        result.inWords = numberToWords(result.amount || 0);
        // Reset modelName to 'expensevoucher' so it uses the correct PUG template
        modelName = 'expensevoucher';
      }

      // Handle Supplier logic to use supplierDetails template
      if (directory === 'supplier') {
        modelName = 'supplierDetails';
      }
      if (directory === 'inventoryreport') {
        modelName = 'InventoryReport';
      }

      // Continue process if result is returned

      const fileId = modelName.toLowerCase() + '-' + result._id + '.pdf';
      const folderPath = modelName.toLowerCase();
      const targetLocation = `src/public/download/${folderPath}/${fileId}`;

      // Custom filename for the user
      const dateStr = result.date ? moment(result.date).format('DD-MM-YYYY') : moment().format('DD-MM-YYYY');
      const clientName = result.client?.name ? result.client.name.replace(/[^a-z0-9]/gi, '_') : 'Client';
      const invoiceNum = result.number ? `${result.number}-${result.year || ''}` : id;
      const downloadName = `${modelName}_${clientName}_${invoiceNum}_${dateStr}.pdf`;

      const pdfFormat = (modelName.toLowerCase() === 'bookingreceipt' || modelName.toLowerCase() === 'expensevoucher') ? 'A5' : 'A4';
      const isLandscape = (modelName.toLowerCase() === 'expensevoucher'); // Voucher is landscape

      const pdfBuffer = await custom.generatePdf(
        modelName,
        { filename: folderPath, format: pdfFormat, landscape: isLandscape }, 
        result
      );

      res.set({
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${downloadName}"`,
        'Content-Length': pdfBuffer.length,
      });

      return res.send(Buffer.from(pdfBuffer));
    } else {
      return res.status(404).json({
        success: false,
        result: null,
        message: `Model '${modelName}' does not exist`,
      });
    }
  } catch (error) {
    // If error is thrown by Mongoose due to required validations
    if (error.name == 'ValidationError') {
      return res.status(400).json({
        success: false,
        result: null,
        error: error.message,
        message: 'Required fields are not supplied',
      });
    } else if (error.name == 'BSONTypeError') {
      // If error is thrown by Mongoose due to invalid ID
      return res.status(400).json({
        success: false,
        result: null,
        error: error.message,
        message: 'Invalid ID',
      });
    } else {
      // Server Error
      return res.status(500).json({
        success: false,
        result: null,
        error: error.message,
        message: error.message,
        controller: 'downloadPDF.js',
      });
    }
  }
};
