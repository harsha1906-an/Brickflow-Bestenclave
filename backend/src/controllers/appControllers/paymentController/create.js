const mongoose = require('mongoose');

const Model = mongoose.model('Payment');
const Invoice = mongoose.model('Invoice');
const custom = require('@/controllers/pdfController');

const { calculate } = require('@/helpers');

const { logAuditAction } = require('../../../modules/AuditLogModule');

const create = async (req, res) => {
  try {
    // Creating a new document in the collection
    if (req.body.amount === 0) {
      return res.status(202).json({
        success: false,
        result: null,
        message: `The Minimum Amount couldn't be 0`,
      });
    }

    // Check if this is a Booking Payment or Invoice Payment
    if (req.body.booking) {
      // --- BOOKING PAYMENT LOGIC ---
      const Booking = mongoose.model('Booking');
      const currentBooking = await Booking.findById(req.body.booking);
      if (!currentBooking) {
        return res.status(404).json({ success: false, message: 'Booking not found' });
      }

      if (req.admin) req.body['createdBy'] = req.admin._id;
      // Ensure invoice is not set if not provided (it's optional now)
      if (!req.body.invoice) delete req.body.invoice;

      const result = await Model.create(req.body);

      // Update Booking Payment Plan if stage provided
      if (req.body.buildingStage && currentBooking.paymentPlan) {
        // Find the payment plan item that matches the stage name/description
        let planIndex = -1;
        if (req.body.milestoneId) {
          planIndex = currentBooking.paymentPlan.findIndex(p => p._id && p._id.toString() === req.body.milestoneId);
        }
        
        // Fallback for backwards compatibility
        if (planIndex === -1 && req.body.buildingStage) {
          planIndex = currentBooking.paymentPlan.findIndex(p =>
            p.name && p.name.toLowerCase().includes(req.body.buildingStage.toLowerCase())
          );
        }

        if (planIndex !== -1) {
          const plan = currentBooking.paymentPlan[planIndex];
          // Increment total paid amount
          const newPaidAmount = (plan.paidAmount || 0) + req.body.amount;
          plan.paidAmount = newPaidAmount;

          if (req.body.ledger === 'official') {
            plan.paidAccountableAmount = (plan.paidAccountableAmount || 0) + req.body.amount;
          } else {
            plan.paidNonAccountableAmount = (plan.paidNonAccountableAmount || 0) + req.body.amount;
          }

          // Update status
          if (newPaidAmount >= plan.amount) {
            plan.status = 'paid';
          } else {
            plan.status = 'partially';
          }
          plan.paymentDate = new Date();
          plan.transactionId = req.body.ref;
          plan.paymentMode = req.body.paymentMode;

          // Update the array item
          currentBooking.paymentPlan[planIndex] = plan;

          // Save the booking
          await Booking.findByIdAndUpdate(req.body.booking, { paymentPlan: currentBooking.paymentPlan });

          // --- SYNC WITH INVOICE ---
          // Find if there is an invoice for this villa and this stage
          const matchingInvoice = await Invoice.findOne({
            villa: result.villa,
            buildingStage: req.body.buildingStage,
            removed: false
          });

          if (matchingInvoice) {
            const { total, discount, credit: existingCredit } = matchingInvoice;
            const newCredit = (existingCredit || 0) + req.body.amount;

            let invoiceStatus =
              calculate.sub(total, (discount || 0)) <= newCredit
                ? 'paid'
                : newCredit > 0
                  ? 'partially'
                  : 'unpaid';

            await Invoice.findByIdAndUpdate(matchingInvoice._id, {
              $push: { payment: result._id },
              $inc: { credit: req.body.amount },
              $set: { paymentStatus: invoiceStatus },
            });

            // Link the Payment document to this Invoice if it wasn't already
            await Model.findByIdAndUpdate(result._id, { invoice: matchingInvoice._id });
          }
        }
      }

      const fileId = 'payment-' + result._id + '.pdf';
      await Model.findByIdAndUpdate(result._id, { pdf: fileId });

      res.status(200).json({
        success: true,
        result: result,
        message: 'Booking Payment recorded successfully',
      });

      try {
        logAuditAction({
          req,
          module: 'payment',
          action: 'create',
          entityType: 'Payment',
          entityId: result._id,
          metadata: { amount: result.amount, booking: result.booking, client: result.client }
        });
      } catch (e) {
        console.error("Audit Log Error", e);
      }
      return;

    } else {
      // --- EXISTING INVOICE LOGIC ---
      const currentInvoice = await Invoice.findOne({
        _id: req.body.invoice,
        removed: false,
      });

      if (!currentInvoice) {
        // Handle case where invoice ID is invalid/missing but logic fell through
        return res.status(404).json({ success: false, message: 'Invoice not found' });
      }

      const {
        total: previousTotal,
        discount: previousDiscount,
        credit: previousCredit,
      } = currentInvoice;

      const maxAmount = calculate.sub(calculate.sub(previousTotal, previousDiscount), previousCredit);

      if (req.body.amount > maxAmount) {
        return res.status(202).json({
          success: false,
          result: null,
          message: `The Max Amount you can add is ${maxAmount}`,
        });
      }
      if (req.admin) req.body['createdBy'] = req.admin._id;

      const result = await Model.create(req.body);

      const fileId = 'payment-' + result._id + '.pdf';
      const updatePath = await Model.findOneAndUpdate(
        {
          _id: result._id.toString(),
          removed: false,
        },
        { pdf: fileId },
        {
          new: true,
        }
      ).exec();
      // Returning successfull response

      const { _id: paymentId, amount } = result;

      // Logic for Invoice Update
      const { id: invoiceId, total, discount, credit } = currentInvoice;

      let paymentStatus =
        calculate.sub(total, discount) === calculate.add(credit, amount)
          ? 'paid'
          : calculate.add(credit, amount) > 0
            ? 'partially'
            : 'unpaid';

      const invoiceUpdate = await Invoice.findOneAndUpdate(
        { _id: req.body.invoice },
        {
          $push: { payment: paymentId.toString() },
          $inc: { credit: amount },
          $set: { paymentStatus: paymentStatus },
        },
        {
          new: true, // return the new result instead of the old one
          runValidators: true,
        }
      ).exec();

      res.status(200).json({
        success: true,
        result: updatePath,
        message: 'Payment Invoice created successfully',
      });
      // Audit log (fail-safe, after success)
      try {
        logAuditAction({
          req,
          module: 'payment',
          action: 'create',
          entityType: 'Payment',
          entityId: result._id,
          metadata: { amount: result.amount, invoice: result.invoice, client: result.client }
        });
      } catch (e) {
        console.error("Audit log error", e);
      }
      return;
    }
  } catch (error) {
    console.log("PAYMENT CREATE ERROR:", error);
    try {
      require('fs').writeFileSync('error_log.txt', JSON.stringify(error, Object.getOwnPropertyNames(error)) + '\nStack: ' + error.stack);
    } catch (fsErr) {
      console.error("Failed to write error log", fsErr);
    }
    return res.status(500).json({
      success: false,
      message: 'Internal Server Error: ' + error.message,
      error: error
    });
  }
};

module.exports = create;
