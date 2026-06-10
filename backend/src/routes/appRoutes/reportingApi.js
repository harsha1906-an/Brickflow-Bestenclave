const express = require('express');
const router = express.Router();
const { generateDailySummary } = require('@/modules/LabourModule/reporting.service');
const { catchErrors } = require('@/handlers/errorHandlers');
const checkRbac = require('@/middlewares/rbacMiddleware');

router.get('/companies/:companyId/daily-summary', checkRbac('expense', 'summary'), catchErrors(async (req, res) => {
    const { date } = req.query;
    const { companyId } = req.params;
    const summary = await generateDailySummary(companyId, date);
    res.json(summary);
}));

const pdfController = require('@/controllers/pdfController');
router.get('/companies/:companyId/daily-report-pdf', checkRbac('expense', 'summary'), catchErrors(pdfController.downloadDailyReport));
router.get('/customer/:id/pdf-details', checkRbac('client', 'read'), catchErrors(pdfController.downloadCustomerDetails));
router.get('/supplier/:id/pdf-details', checkRbac('supplier', 'read'), catchErrors(pdfController.downloadSupplierDetails));
router.get('/booking/:id/pdf-details', checkRbac('booking', 'read'), catchErrors(pdfController.downloadBookingDetails));
router.get('/booking/:id/pdf-receipt', checkRbac('booking', 'receipt'), catchErrors(pdfController.downloadBookingReceipt));
router.get('/labour/pdf-list', checkRbac('labour', 'read'), catchErrors(pdfController.downloadLabourList));
router.get('/expense/pdf-report/:companyId', checkRbac('expense', 'read'), catchErrors(pdfController.downloadExpenseReport));
router.get('/expense/tax-report/:companyId', checkRbac('expense', 'read'), catchErrors(pdfController.downloadTaxReport));

module.exports = router;
