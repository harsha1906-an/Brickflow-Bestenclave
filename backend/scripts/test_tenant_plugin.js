const mongoose = require('mongoose');
const path = require('path');

require('dotenv').config({ path: path.join(__dirname, '../.env') });

const { tenantStorage } = require('../src/middlewares/tenantContext');
const tenantPlugin = require('../src/middlewares/tenantPlugin');

// Load Company model so it registers in Mongoose
require('../src/models/appModels/Company');

const dbUri = process.env.DATABASE || 'mongodb://127.0.0.1:27017/erp';

async function runTest() {
  try {
    await mongoose.connect(dbUri);
    console.log('Connected to DB!');

    // Compile a dummy model for testing the plugin
    const Schema = mongoose.Schema;
    const TestSchema = new Schema({
      name: String,
      companyId: mongoose.Schema.Types.ObjectId,
    });
    
    // Register the tenant plugin on this test schema
    TestSchema.plugin(tenantPlugin);
    
    const TestModel = mongoose.model('TestTenant', TestSchema, 'testtenants');

    // Create a dummy company ID
    const dummyCompanyId = new mongoose.Types.ObjectId().toString();
    console.log(`Setting active tenant ID context to: ${dummyCompanyId}`);

    // Execute queries inside the AsyncLocalStorage context
    await tenantStorage.run(dummyCompanyId, async () => {
      // 1. Check if save() auto-injects companyId
      const testDoc = new TestModel({ name: 'Tenant Document 1' });
      await testDoc.save();
      console.log('Saved document companyId:', testDoc.companyId?.toString());
      if (testDoc.companyId?.toString() === dummyCompanyId) {
        console.log('✅ PASS: companyId auto-populated on save!');
      } else {
        console.log('❌ FAIL: companyId was not auto-populated!');
      }

      // 2. Check if find() automatically appends query criteria
      const query = TestModel.find({ name: 'Tenant Document 1' });
      await query.exec(); // execute query to trigger pre-find middleware hooks
      const filter = query.getFilter();
      console.log('Query filter constructed:', JSON.stringify(filter));
      if (filter.companyId?.toString() === dummyCompanyId) {
        console.log('✅ PASS: companyId filter auto-appended to query!');
      } else {
        console.log('❌ FAIL: companyId filter was not auto-appended!');
      }

      // Clean up the dummy document
      await TestModel.deleteOne({ _id: testDoc._id });
      console.log('Cleaned up test document.');

      console.log('Registered model names:', mongoose.modelNames());
      const CompanyModel = mongoose.model('Company');
      const companyQuery = CompanyModel.find({});
      await companyQuery.exec();
      const companyFilter = companyQuery.getFilter();
      console.log('Company query filter constructed:', JSON.stringify(companyFilter));
      if (companyFilter.companyId === undefined) {
        console.log('✅ PASS: Company query is NOT filtered by companyId (Whitelisted!)');
      } else {
        console.log('❌ FAIL: Company query was filtered by companyId!');
      }
    });

    await mongoose.disconnect();
    console.log('Disconnected.');
  } catch (err) {
    console.error('Test Failed:', err);
  }
}

runTest();
