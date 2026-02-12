const mongoose = require('mongoose');

const Model = mongoose.model('Payment');
const Invoice = mongoose.model('Invoice');
const custom = require('@/controllers/pdfController');

const { calculate } = require('@/helpers');

const update = async (req, res) => {
  if (req.body.amount === 0) {
    return res.status(202).json({
      success: false,
      result: null,
      message: `The Minimum Amount couldn't be 0`,
    });
  }

  // Check if user is Owner
  if (req.admin.role !== 'owner') {
    const PaymentUpdate = mongoose.model('PaymentUpdate');

    // Create a update request
    await PaymentUpdate.create({
      payment: req.params.id,
      requestedBy: req.admin._id,
      requestedChanges: req.body,
    });

    return res.status(200).json({
      success: true,
      result: null,
      message: 'Update request submitted for Owner approval',
    });
  } else {
      // Owner requires security code to update
      if (req.body.securityCode !== '090926') {
          return res.status(403).json({
              success: false,
              result: null,
              message: 'Invalid Security Code. Access Denied.',
          });
      }
  }
  // Find document by id and updates with the required fields
  const previousPayment = await Model.findOne({
    _id: req.params.id,
    removed: false,
  }).populate('invoice');

  const { amount: previousAmount } = previousPayment;
  const { total, discount, credit: previousCredit } = previousPayment.invoice;
  const invoiceId = previousPayment.invoice._id;

  const { amount: currentAmount } = req.body;

  const changedAmount = calculate.sub(currentAmount, previousAmount);
  const maxAmount = calculate.sub(total, calculate.add(discount, previousCredit));

  if (changedAmount > maxAmount) {
    return res.status(202).json({
      success: false,
      result: null,
      message: `The Max Amount you can add is ${calculate.add(maxAmount, previousAmount)}`,
      error: `The Max Amount you can add is ${calculate.add(maxAmount, previousAmount)}`,
    });
  }

  let paymentStatus =
    calculate.sub(total, discount) === calculate.add(previousCredit, changedAmount)
      ? 'paid'
      : calculate.add(previousCredit, changedAmount) > 0
        ? 'partially'
        : 'unpaid';

  const updatedDate = new Date();
  const updates = {
    number: req.body.number,
    date: req.body.date,
    amount: req.body.amount,
    paymentMode: req.body.paymentMode,
    ref: req.body.ref,
    description: req.body.description,
    updated: updatedDate,
  };

  const result = await Model.findOneAndUpdate(
    { _id: req.params.id, removed: false },
    { $set: updates },
    {
      new: true, // return the new result instead of the old one
    }
  ).exec();

  const updateInvoice = await Invoice.findOneAndUpdate(
    { _id: result.invoice._id.toString() },
    {
      $inc: { credit: changedAmount },
      $set: {
        paymentStatus: paymentStatus,
      },
    },
    {
      new: true, // return the new result instead of the old one
    }
  ).exec();

  return res.status(200).json({
    success: true,
    result,
    message: 'Successfully updated the Payment ',
  });
};

module.exports = update;
