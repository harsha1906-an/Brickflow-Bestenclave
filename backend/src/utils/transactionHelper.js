const mongoose = require('mongoose');

/**
 * Runs a callback function within a MongoDB ACID transaction.
 * Fallback: If MongoDB is running in standalone mode (no replica set support),
 * it runs the callback function without transaction isolation.
 * @param {Function} workFn - The function containing the DB operations. Receives the `session` object.
 * @returns {Promise<any>} The result returned by `workFn`.
 */
const runInTransaction = async (workFn) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    const result = await workFn(session);
    await session.commitTransaction();
    session.endSession();
    return result;
  } catch (error) {
    try {
      await session.abortTransaction();
    } catch (abortErr) {
      // Aborting might fail if the transaction never reached the server
    }
    session.endSession();

    // Check if the error is due to MongoDB transactions not being supported (standalone DB)
    const isNoTxError = 
      error.code === 20 || 
      (error.message && (
        error.message.includes('replica set') || 
        error.message.includes('Transaction numbers') ||
        error.message.includes('mongos')
      ));

    if (isNoTxError) {
      // Fallback: run the operations without a transaction session
      return await workFn(undefined);
    }
    throw error;
  }
};

module.exports = {
  runInTransaction,
};

