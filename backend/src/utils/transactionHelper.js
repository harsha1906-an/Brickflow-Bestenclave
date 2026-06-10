const mongoose = require('mongoose');

/**
 * Runs a callback function within a MongoDB ACID transaction.
 * @param {Function} workFn - The function containing the DB operations. Receives the `session` object.
 * @returns {Promise<any>} The result returned by `workFn`.
 */
const runInTransaction = async (workFn) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    const result = await workFn(session);
    await session.commitTransaction();
    return result;
  } catch (error) {
    await session.abortTransaction();
    throw error;
  } finally {
    session.endSession();
  }
};

module.exports = {
  runInTransaction,
};
