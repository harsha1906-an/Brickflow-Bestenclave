const pug = require('pug');
const fs = require('fs');
const moment = require('moment');
const puppeteer = require('puppeteer');
const mongoose = require('mongoose');
const { loadSettings } = require('@/middlewares/settings');
const useLanguage = require('@/locale/useLanguage');
const { useMoney, useDate } = require('@/settings');

const { getDailyReportData } = require('@/modules/LabourModule/reporting.service');

const pugFiles = ['invoice', 'offer', 'quote', 'payment', 'inventoryreport', 'paymentrequest', 'bookingreceipt', 'expensevoucher', 'pettycashreport', 'customersummary', 'dailyexpensereport', 'customerdetails', 'supplierdetails', 'bookingdetails', 'labourlist', 'villareport', 'expensereport', 'taxreport'];

require('dotenv').config({ path: '.env' });
require('dotenv').config({ path: '.env.local' });

exports.generatePdf = async (
  modelName,
  info = { filename: 'pdf_file', format: 'A5', targetLocation: '' },
  result,
  callback // Legacy support: ignored
) => {
  try {
    console.log('generatePdf (Buffer Mode) called for:', modelName);

    // NO FS OPERATIONS - Pure Buffer
    const normalizedModelName = modelName.toLowerCase();
    console.log(`generatePdf called for: '${modelName}' (normalized: '${normalizedModelName}')`);
    console.log(`Available pugFiles: ${JSON.stringify(pugFiles)}`);

    if (!pugFiles.includes(normalizedModelName)) {
      throw new Error(`Model '${modelName}' not found in allowed pugFiles list.`);
    }

    if (pugFiles.includes(normalizedModelName)) {
      // Compile Pug template
      const settings = await loadSettings();
      const selectedLang = settings['brickflow_app_language'];
      const translate = useLanguage({ selectedLang });

      const {
        currency_symbol = '�,1',
        currency_position = 'before',
        decimal_sep = '.',
        thousand_sep = ',',
        cent_precision = 2,
        zero_format = false,
      } = settings;

      const { moneyFormatter } = useMoney({
        settings: {
          currency_symbol,
          currency_position,
          decimal_sep,
          thousand_sep,
          cent_precision: Number(cent_precision) || 2,
          zero_format,
        },
      });
      const { dateFormat } = useDate({ settings: { ...settings, dateFormat: settings.dateFormat || 'DD/MM/YYYY' } });

      const path = require('path');
      settings.public_server_file = process.env.PUBLIC_SERVER_FILE;

      const pdfDir = path.resolve(__dirname, '../../pdf');
      const desiredFilename = modelName + '.pug';
      
      // Find template file with case-insensitive lookup for Linux compatibility
      let templatePath = path.resolve(pdfDir, desiredFilename);
      if (!fs.existsSync(templatePath)) {
        console.log(`Template not found at exact path: ${templatePath}, searching with case-insensitive lookup...`);
        const files = fs.readdirSync(pdfDir);
        const matchedFile = files.find(file => file.toLowerCase() === desiredFilename.toLowerCase());
        if (matchedFile) {
          templatePath = path.resolve(pdfDir, matchedFile);
          console.log(`Found template with case-insensitive lookup: ${templatePath}`);
        } else {
          console.error('CRITICAL: Template file not found at:', templatePath);
          console.error('Available files:', files);
          throw new Error(`Template file not found: ${desiredFilename}`);
        }
      }
      console.log('Template Path Resolved:', templatePath);

      // Load Logo
      let logoBase64 = null;
      try {
        if (settings.company_logo) {
          const logoPath = path.resolve(__dirname, '../../', settings.company_logo);
          if (fs.existsSync(logoPath)) {
            const logoBitmap = fs.readFileSync(logoPath);
            const extension = path.extname(logoPath).replace('.', '') || 'png';
            logoBase64 = `data:image/${extension};base64,${logoBitmap.toString('base64')}`;
          }
        }
        
        // Fallback to logo.png
        if (!logoBase64) {
          const defaultLogoPath = path.resolve(__dirname, '../../public/uploads/logo.png');
          if (fs.existsSync(defaultLogoPath)) {
            const logoBitmap = fs.readFileSync(defaultLogoPath);
            logoBase64 = `data:image/png;base64,${logoBitmap.toString('base64')}`;
          }
        }
      } catch (err) {
        console.error('Error loading logo:', err);
      }

      const htmlContent = pug.renderFile(templatePath, {
        model: result,
        result: result, // Add this alias because pug template might use 'model' or 'result' or fields directly
        ...result,     // Spread result properties to top level for easier access (e.g. items, date)
        settings,
        translate,
        dateFormat,
        moneyFormatter,
        moment: moment,
        logo: logoBase64,
        companyName: settings.company_name || 'BrickFlow'
      });
      console.log('PUG Rendered successfully. Launching Puppeteer...');

      const browser = await puppeteer.launch({
        headless: 'new',
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage', // Handle Docker/AWS memory limits
          '--disable-accelerated-2d-canvas',
          '--no-first-run',
          '--no-zygote',
          // '--single-process', // removed to fix windows support
          '--disable-gpu'
        ],
        ignoreDefaultArgs: ['--disable-extensions'],
      });

      const page = await browser.newPage();
      await page.setContent(htmlContent, {
        waitUntil: 'load',
        timeout: 60000
      });
      console.log('Page Content Set. Generating PDF Buffer...');

      // Generate PDF as Buffer (no path option)
      const pdfBuffer = await page.pdf({
        format: info.format || 'A4',
        landscape: info.landscape === undefined ? false : info.landscape, // Default to Portrait for Daily Report (A4) unless specified
        printBackground: true,
        margin: info.margin || { top: 0, right: 0, bottom: 0, left: 0 },
      });
      console.log('PDF Buffer Generated. Size:', pdfBuffer.length);

      await browser.close();
      console.log('Browser Closed.');

      return pdfBuffer;
    }
  } catch (error) {
    console.error('PDF Generation Error:', error);
    throw error;
  }
};

exports.downloadDailyReport = async (req, res) => {
  try {
    const { companyId } = req.params;
    const { date, startDate, endDate, reportCategory } = req.query;

    console.log(`Generating Daily Expense Report PDF for Company: ${companyId}, Date: ${date || (startDate + ' to ' + endDate)}`);

    // Pass startDate/endDate if available, otherwise just date
    const start = date || startDate;
    let result = await getDailyReportData(companyId, start, endDate);

    const filterDailyReportItems = (reportObj) => {
      if (!reportCategory || reportCategory === 'all') return reportObj;
      let filteredItems = reportObj.items || [];
      if (reportCategory === 'income') {
        filteredItems = filteredItems.filter(i => i.type === 'income');
      } else if (reportCategory === 'expense') {
        filteredItems = filteredItems.filter(i => i.type === 'expense');
      } else if (reportCategory === 'labour') {
        filteredItems = filteredItems.filter(i => i.category === 'Labour' || i.category === 'Wages');
      } else if (reportCategory === 'supplier') {
        filteredItems = filteredItems.filter(i => i.category === 'Supplier');
      }
      const totalExpense = filteredItems.filter(i => i.type === 'expense').reduce((sum, i) => sum + i.amount, 0);
      const totalIncome = filteredItems.filter(i => i.type === 'income').reduce((sum, i) => sum + i.amount, 0);
      return {
        ...reportObj,
        items: filteredItems,
        totalExpense,
        totalIncome,
        netBalance: totalIncome - totalExpense
      };
    };

    if (Array.isArray(result)) {
      result = result.map(filterDailyReportItems);
    } else {
      result = filterDailyReportItems(result);
    }

    const rawPdf = await exports.generatePdf(
      'dailyExpenseReport',
      { format: 'A4', landscape: false },
      result
    );
    const pdfBuffer = Buffer.from(rawPdf);

    // DEBUG: Save to backend root for direct viewing
    const fs = require('fs');
    const path = require('path');
    const debugPath = path.resolve(__dirname, '../../debug_report.pdf');
    fs.writeFileSync(debugPath, pdfBuffer);
    console.log('Saved debug copy to:', debugPath);

    let filename = `DailyReport_${result.date ? result.date.replace(/\//g, '-') : 'Range'}.pdf`;
    if (startDate && endDate) {
      filename = `DailyReport_${startDate}_to_${endDate}.pdf`;
    }

    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Content-Length': pdfBuffer.length,
    });

    res.send(pdfBuffer);

  } catch (error) {
    console.error('Error generating Daily Report PDF:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to generate PDF',
      error: error.message,
    });
  }
};

exports.downloadCustomerDetails = async (req, res) => {
  try {
    const { id } = req.params;
    const Client = mongoose.model('Client');
    const result = await Client.findById(id).lean();

    if (!result) {
      return res.status(404).json({ success: false, message: 'Customer not found' });
    }

    console.log(`Generating Customer Details PDF for: ${result.name}`);

    const rawPdf = await exports.generatePdf(
      'customerDetails',
      { format: 'A4', landscape: false },
      result
    );
    const pdfBuffer = Buffer.from(rawPdf);

    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="Customer_${result.name.replace(/[^a-zA-Z0-9]/g, '_')}.pdf"`,
      'Content-Length': pdfBuffer.length,
    });

    res.send(pdfBuffer);
  } catch (error) {
    console.error('Error generating Customer Details PDF:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to generate PDF',
      error: error.message,
    });
  }
};

exports.downloadSupplierDetails = async (req, res) => {
  try {
    const { id } = req.params;
    console.log(`downloadSupplierDetails called for ID: ${id}`);

    let Supplier;
    try {
      Supplier = mongoose.model('Supplier');
    } catch (e) {
      console.warn('Supplier model not found in mongoose registry, attempting to require...');
      Supplier = require('@/models/appModels/Supplier');
    }

    const result = await Supplier.findById(id).lean();

    if (!result) {
      console.error(`Supplier not found for ID: ${id}`);
      return res.status(404).json({ success: false, message: 'Supplier not found' });
    }

    console.log(`Generating Supplier Details PDF for: ${result.name}`);

    const rawPdf = await exports.generatePdf(
      'supplierDetails',
      { format: 'A4', landscape: false },
      result
    );
    const pdfBuffer = Buffer.from(rawPdf);

    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="Supplier_${result.name.replace(/[^a-zA-Z0-9]/g, '_')}.pdf"`,
      'Content-Length': pdfBuffer.length,
    });

    res.send(pdfBuffer);
  } catch (error) {
    console.error('Error generating Supplier Details PDF:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to generate PDF',
      error: error.message,
    });
  }
};

exports.downloadBookingDetails = async (req, res) => {
  try {
    const { id } = req.params;
    console.log(`downloadBookingDetails called for ID: ${id}`);

    const Booking = mongoose.model('Booking');
    const Payment = mongoose.model('Payment');

    const result = await Booking.findById(id).populate('client').populate('villa').lean();

    if (!result) {
      return res.status(404).json({ success: false, message: 'Booking not found' });
    }

    // Fetch Payments
    const payments = await Payment.find({ booking: id, removed: false }).sort({ date: 1 }).lean();

    // Calculate Stats
    const totalPaid = payments.reduce((sum, p) => sum + (p.amount || 0), 0);
    const paidWhite = payments.filter(p => p.ledger === 'official').reduce((sum, p) => sum + (p.amount || 0), 0);
    const paidBlack = payments.filter(p => p.ledger === 'internal').reduce((sum, p) => sum + (p.amount || 0), 0);

    // Safety check for older bookings that might not have accountableAmount set
    const officialAmount = result.accountableAmount || result.officialAmount || 0;
    const internalAmount = result.nonAccountableAmount || result.internalAmount || 0;

    const stats = {
      totalPaid,
      paidWhite,
      paidBlack,
      pendingWhite: officialAmount - paidWhite,
      pendingBlack: internalAmount - paidBlack,
      pendingTotal: (result.totalAmount || 0) - totalPaid
    };

    console.log(`Generating Booking Details PDF for: ${result._id}`);

    const rawPdf = await exports.generatePdf(
      'bookingDetails',
      { format: 'A4', landscape: false },
      { ...result, payments, stats }
    );
    const pdfBuffer = Buffer.from(rawPdf);

    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="Booking_${result.villaNumber || id}.pdf"`,
      'Content-Length': pdfBuffer.length,
    });

    res.send(pdfBuffer);
  } catch (error) {
    console.error('Error in downloadBookingDetails:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to generate PDF',
      error: error.message,
    });
  }
};

exports.downloadBookingReceipt = async (req, res) => {
  try {
    const { id } = req.params;
    const { milestoneId } = req.query;
    console.log(`downloadBookingReceipt called for ID: ${id}, Milestone: ${milestoneId}`);

    const Booking = mongoose.model('Booking');
    const result = await Booking.findById(id).populate('client').populate('villa').lean();

    if (!result) {
      return res.status(404).json({ success: false, message: 'Booking not found' });
    }

    // Find the specific milestone
    const milestone = result.paymentPlan.find(p => p._id.toString() === milestoneId);

    if (!milestone) {
      return res.status(404).json({ success: false, message: 'Milestone not found' });
    }

    // Override Booking fields with Milestone data for the receipt
    const { numberToWords } = require('@/helpers');

    // Create a context object specifically for the template
    const receiptContext = {
      ...result,
      bookingDate: milestone.paymentDate || milestone.dueDate || new Date(), // Use payment date
      downPayment: milestone.paidAmount || milestone.amount, // Use amount paid
      inWords: numberToWords(milestone.paidAmount || milestone.amount || 0),
      transactionId: milestone.transactionId || milestone.notes || result.transactionId || '-',
      paymentMethod: milestone.paymentMode || result.paymentMethod || 'Bank Transfer',
      milestoneName: milestone.name,
    };

    console.log(`Generating Booking Receipt for Milestone: ${milestone.name}`);

    const rawPdf = await exports.generatePdf(
      'BookingReceipt', // Matches the pug file BookingReceipt.pug (case sensitive?? Windows is forgiving, Linux is not. File is BookingReceipt.pug)
      { format: 'A5', landscape: true },
      receiptContext
    );
    const pdfBuffer = Buffer.from(rawPdf);

    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="Receipt_${milestone.name.replace(/[^a-z0-9]/gi, '_')}.pdf"`,
      'Content-Length': pdfBuffer.length,
    });

    res.send(pdfBuffer);

  } catch (error) {
    console.error('Error in downloadBookingReceipt:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to generate PDF',
      error: error.message,
    });
  }
};

exports.downloadLabourList = async (req, res) => {
  try {
    const { company } = req.query; // Expect company ID in query if needed, or get it from headers/middleware
    console.log(`downloadLabourList called. Company: ${company}`);

    let Labour;
    try {
      Labour = mongoose.model('Labour');
    } catch (e) {
      console.warn('Labour model not found in mongoose registry, attempting to require...');
      Labour = require('@/models/appModels/Labour');
    }

    // Filter by company if provided, otherwise removed: false
    const query = { removed: false };
    if (company) {
      query.companyId = company;
    }

    const result = await Labour.find(query).sort({ name: 1 }).lean();

    console.log(`Generating Labour List PDF, count: ${result.length}`);

    const rawPdf = await exports.generatePdf(
      'labourList',
      { format: 'A4', landscape: false },
      result // Pass array as model
    );
    const pdfBuffer = Buffer.from(rawPdf);

    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="Labour_List_Report.pdf"`,
      'Content-Length': pdfBuffer.length,
    });

    res.send(pdfBuffer);
  } catch (error) {
    console.error('Error in downloadLabourList:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to generate PDF',
      error: error.message,
    });
  }
};

exports.downloadVillaReport = async (req, res) => {
  try {
    const { id } = req.params;
    console.log(`downloadVillaReport called for ID: ${id}`);

    // Load Models
    const Villa = mongoose.model('Villa');
    const Expense = mongoose.model('Expense');
    const Payment = mongoose.model('Payment');
    const InventoryTransaction = mongoose.model('InventoryTransaction');
    const LabourContract = mongoose.model('LabourContract');

    // 1. Fetch Villa Details
    const villa = await Villa.findById(id).lean();
    if (!villa) {
      return res.status(404).json({ success: false, message: 'Villa not found' });
    }

    // 2. Fetch Labour Expenses
    const labourExpenses = await Expense.find({ villa: id, recipientType: 'Labour', removed: false }).populate('labour').lean();
    const lTotal = labourExpenses.reduce((sum, e) => sum + (e.amount || 0), 0);

    // 3. Fetch Material Transactions (Inward only)
    const materialTransactions = await InventoryTransaction.find({ villa: id, type: 'inward', removed: false }).populate('material').lean();
    const mTotal = materialTransactions.reduce((sum, t) => sum + (t.totalCost || 0), 0);

    // 4. Fetch Customer Payments
    const payments = await Payment.find({ villa: id, removed: false }).populate('client').lean();
    const pTotal = payments.reduce((sum, p) => sum + (p.amount || 0), 0);

    // 5. Fetch Labour Contracts
    const contracts = await LabourContract.find({ villa: id, removed: false }).lean();
    let contractTotal = 0;
    let contractPaid = 0;

    contracts.forEach(c => {
      contractTotal += c.totalAmount || 0;
      if (c.milestones && Array.isArray(c.milestones)) {
        c.milestones.forEach(ms => {
          if (ms.isCompleted) contractPaid += ms.amount || 0;
        });
      }
    });

    const stats = {
      material: mTotal,
      labour: lTotal,
      total: mTotal + lTotal,
      payments: pTotal,
      balance: (villa.totalAmount || 0) - pTotal,
      contractTotal: contractTotal,
      contractPaid: contractPaid,
      contractRemaining: contractTotal - contractPaid
    };

    const result = {
      villa,
      stats,
      labourExpenses,
      materialTransactions,
      payments,
      contracts
    };

    console.log(`Generating Villa Report PDF for Villa: ${villa.villaNumber}`);

    const rawPdf = await exports.generatePdf(
      'VillaReport',
      { format: 'A4', landscape: false },
      result
    );
    const pdfBuffer = Buffer.from(rawPdf);

    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="Villa_Report_${villa.villaNumber}.pdf"`,
      'Content-Length': pdfBuffer.length,
    });

    res.send(pdfBuffer);

  } catch (error) {
    console.error('Error in downloadVillaReport:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to generate PDF',
      error: error.message,
    });
  }
};

exports.downloadExpenseReport = async (req, res) => {
  try {
    const { startDate, endDate, recipientType, villa, labourSkill, supplier, supplierType, sortBy, sortOrder } = req.query;
    const companyId = req.params.companyId;

    console.log(`Generating Expense Report PDF for Company: ${companyId}`);

    const Expense = mongoose.model('Expense');
    const Labour = mongoose.model('Labour');
    const Supplier = require('@/models/appModels/Supplier');

    let filter = { removed: false };
    if (companyId) filter.companyId = companyId;

    if (startDate && endDate) {
      filter.date = {
        $gte: new Date(startDate),
        $lte: new Date(new Date(endDate).setHours(23, 59, 59, 999))
      };
    }

    if (recipientType && recipientType !== 'all') {
      filter.recipientType = recipientType;
    }

    if (supplier) {
      filter.supplier = supplier;
    }

    if (supplierType && supplierType !== 'all') {
      const suppliersWithType = await Supplier.find({
        removed: false,
        supplierType: supplierType,
        ...(companyId ? { companyId } : {})
      }).distinct('_id');

      if (suppliersWithType.length > 0) {
        filter.supplier = { $in: suppliersWithType };
      } else {
        filter.supplier = { $in: [] }; // Force empty result
      }
    }

    if (recipientType === 'Labour') {
      if (villa) filter.villa = villa;
      if (labourSkill && labourSkill !== 'all') {
        const labourWithSkill = await Labour.find({
          removed: false,
          skill: labourSkill,
          ...(companyId ? { companyId } : {})
        }).distinct('_id');

        if (labourWithSkill.length > 0) {
          filter.labour = { $in: labourWithSkill };
        } else {
          filter.labour = { $in: [] }; // Force empty result
        }
      }
    }

    const sortField = sortBy || 'date';
    const sortVal = sortOrder === 'asc' ? 1 : -1;

    const items = await Expense.find(filter)
      .sort({ [sortField]: sortVal })
      .populate('supplier')
      .populate('labour')
      .lean();

    const data = {
      items,
      startDate: startDate ? moment(startDate).format('DD/MM/YYYY') : null,
      endDate: endDate ? moment(endDate).format('DD/MM/YYYY') : null,
    };

    const rawPdf = await exports.generatePdf(
      'expensereport',
      { format: 'A4', landscape: true },
      data
    );
    const pdfBuffer = Buffer.from(rawPdf);

    const filename = `Expense_Report_${moment().format('YYYY-MM-DD')}.pdf`;

    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Content-Length': pdfBuffer.length,
    });

    res.send(pdfBuffer);

  } catch (error) {
    console.error('Error generating Expense Report PDF:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to generate PDF',
      error: error.message,
    });
  }
};

exports.downloadTaxReport = async (req, res) => {
  try {
    const { startDate, endDate, sortBy, sortOrder, reportCategory } = req.query;
    const companyId = req.params.companyId;

    console.log(`Generating Tax Report PDF for Company: ${companyId}, ${startDate} to ${endDate}`);

    const Payment = mongoose.model('Payment');
    const Expense = mongoose.model('Expense');

    let dateFilter = {};
    if (startDate && endDate) {
      dateFilter = {
        $gte: new Date(startDate),
        $lte: new Date(new Date(endDate).setHours(23, 59, 59, 999))
      };
    }

    let paymentFilter = { removed: false, ledger: { $ne: 'internal' } };
    if (companyId) paymentFilter.companyId = companyId;
    if (startDate && endDate) paymentFilter.date = dateFilter;

    let expenseFilter = { removed: false };
    if (companyId) expenseFilter.companyId = companyId;
    if (startDate && endDate) expenseFilter.date = dateFilter;

    const sortField = sortBy || 'date';
    const sortVal = sortOrder === 'asc' ? 1 : -1;

    let includeIncome = !reportCategory || reportCategory === 'all' || reportCategory === 'income';
    let includeExpense = !reportCategory || reportCategory === 'all' || reportCategory === 'expense' || reportCategory === 'labour' || reportCategory === 'supplier';

    if (reportCategory === 'labour') {
      expenseFilter.recipientType = 'Labour';
    } else if (reportCategory === 'supplier') {
      expenseFilter.recipientType = 'Supplier';
    }

    // Fetch payments with client populated
    let payments = [];
    if (includeIncome) {
      payments = await Payment.find(paymentFilter)
        .populate('client')
        .populate('tax')
        .sort({ [sortField]: sortVal })
        .lean();
    }

    // Fetch expenses with supplier and labour populated
    let expenses = [];
    if (includeExpense) {
      expenses = await Expense.find(expenseFilter)
        .populate('supplier')
        .populate('labour')
        .populate('tax')
        .sort({ [sortField]: sortVal })
        .lean();
    }

    // Build income rows (payments)
    let totalIncome = 0;
    let totalIncomeTax = 0;
    const incomeRows = payments.map(p => {
      const baseAmount = p.amount || 0;
      const taxAmount = p.taxAmount || 0;
      const total = p.totalAmount || (baseAmount + taxAmount);
      totalIncome += baseAmount;
      totalIncomeTax += taxAmount;
      return {
        date: p.date,
        dateStr: moment(p.date).format('DD/MM/YYYY'),
        ref: p.ref || p.transactionCode || (p._id ? p._id.toString().slice(-6).toUpperCase() : '-'),
        entity: p.client ? p.client.name : 'Unknown Client',
        description: p.description || p.buildingStage || 'Customer Payment',
        paymentMode: p.paymentMode || '-',
        paymentType: p.paymentType || 'Construction',
        ledger: p.ledger || 'official',
        baseAmount,
        taxRate: p.taxRate || 0,
        taxAmount,
        taxType: p.taxType || 'None',
        cgst: p.taxType === 'CGST_SGST' ? taxAmount / 2 : 0,
        sgst: p.taxType === 'CGST_SGST' ? taxAmount / 2 : 0,
        igst: p.taxType === 'IGST' ? taxAmount : 0,
        totalAmount: total,
      };
    });

    // Build expense rows
    let totalExpense = 0;
    let totalExpenseTax = 0;
    const expenseRows = expenses.map(e => {
      const baseAmount = e.amount || 0;
      const taxAmount = e.taxAmount || 0;
      const total = e.totalAmount || (baseAmount + taxAmount);
      totalExpense += baseAmount;
      totalExpenseTax += taxAmount;

      // FIX: recipientType is 'Supplier' or 'Labour' (capitalized) per enum
      let entityName = e.otherRecipient || 'Other';
      if (e.recipientType === 'Supplier' && e.supplier) entityName = e.supplier.name;
      if (e.recipientType === 'Labour' && e.labour) entityName = e.labour.name;

      return {
        date: e.date,
        dateStr: moment(e.date).format('DD/MM/YYYY'),
        ref: e.reference || (e._id ? e._id.toString().slice(-6).toUpperCase() : '-'),
        entity: entityName,
        recipientType: e.recipientType || 'Other',
        description: e.description || '-',
        paymentMode: e.paymentMode || '-',
        paymentType: e.paymentType || 'Construction',
        baseAmount,
        taxRate: e.taxRate || 0,
        taxAmount,
        taxType: e.taxType || 'None',
        cgst: e.taxType === 'CGST_SGST' ? taxAmount / 2 : 0,
        sgst: e.taxType === 'CGST_SGST' ? taxAmount / 2 : 0,
        igst: e.taxType === 'IGST' ? taxAmount : 0,
        totalAmount: total,
      };
    });

    const netProfit = totalIncome - totalExpense;
    const netTaxBalance = totalIncomeTax - totalExpenseTax;

    // Summarize income by payment type
    const incomeByType = {};
    incomeRows.forEach(r => {
      const k = r.paymentType || 'Other';
      if (!incomeByType[k]) incomeByType[k] = 0;
      incomeByType[k] += r.baseAmount;
    });

    // Summarize expenses by recipient type
    const expenseByType = {};
    expenseRows.forEach(r => {
      const k = r.recipientType || 'Other';
      if (!expenseByType[k]) expenseByType[k] = 0;
      expenseByType[k] += r.baseAmount;
    });

    const data = {
      incomeRows,
      expenseRows,
      totalIncome,
      totalIncomeTax,
      totalExpense,
      totalExpenseTax,
      netProfit,
      netTaxBalance,
      incomeByType,
      expenseByType,
      startDate: startDate ? moment(startDate).format('DD/MM/YYYY') : null,
      endDate: endDate ? moment(endDate).format('DD/MM/YYYY') : null,
    };

    const rawPdf = await exports.generatePdf(
      'taxreport',
      { format: 'A4', landscape: true },
      data
    );
    const pdfBuffer = Buffer.from(rawPdf);

    let filename = `TaxReport_${moment().format('YYYY-MM-DD')}.pdf`;
    if (startDate && endDate) {
      filename = `TaxReport_${startDate}_to_${endDate}.pdf`;
    }

    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Content-Length': pdfBuffer.length,
    });

    res.send(pdfBuffer);

  } catch (error) {
    console.error('Error generating Tax Report PDF:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to generate PDF',
      error: error.message,
    });
  }
};
