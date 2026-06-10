const mongoose = require('mongoose');
const path = require('path');

// Load environment variables
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const dbUri = process.env.DATABASE || 'mongodb://127.0.0.1:27017/erp';

async function restore() {
  try {
    console.log(`Connecting to database at ${dbUri}...`);
    await mongoose.connect(dbUri, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('Connected successfully!');

    const db = mongoose.connection.db;

    // Find the primary company
    const company = await db.collection('companies').findOne({ removed: false });
    if (!company) {
      console.log('ERROR: No active company found in the database. Please run setup first.');
      await mongoose.disconnect();
      return;
    }

    const companyId = company._id;
    console.log(`Using primary Company: "${company.name}" (ID: ${companyId})\n`);

    const collectionsToMigrate = [
      'admins',
      'villas',
      'clients',
      'bookings',
      'payments',
      'expenses',
      'labours',
      'labourcontracts',
      'leads',
      'projects'
    ];

    const collections = await db.listCollections().toArray();
    const collectionNames = collections.map(c => c.name);

    for (const collName of collectionsToMigrate) {
      if (!collectionNames.includes(collName)) {
        console.log(`Skipping ${collName} (collection does not exist)`);
        continue;
      }

      console.log(`Migrating collection "${collName}"...`);
      
      // We target documents where companyId is missing, null, or undefined.
      // In MongoDB, { companyId: null } matches documents where companyId is null or missing.
      const query = {
        $or: [
          { companyId: { $exists: false } },
          { companyId: null }
        ]
      };

      const countToUpdate = await db.collection(collName).countDocuments(query);
      if (countToUpdate > 0) {
        const updateResult = await db.collection(collName).updateMany(
          query,
          { $set: { companyId: companyId } }
        );
        console.log(`  -> Successfully updated ${updateResult.modifiedCount} / ${countToUpdate} documents.`);
      } else {
        console.log(`  -> 0 documents need update.`);
      }
    }

    console.log('\nRestoration complete!');
    await mongoose.disconnect();
  } catch (err) {
    console.error('Migration Error:', err);
    process.exit(1);
  }
}

restore();
