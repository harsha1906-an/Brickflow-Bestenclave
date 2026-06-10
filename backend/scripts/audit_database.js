const mongoose = require('mongoose');
const path = require('path');
const fs = require('fs');

// Load env from backend
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const dbUri = process.env.DATABASE || 'mongodb://127.0.0.1:27017/erp';

async function audit() {
  try {
    console.log(`Connecting to database at ${dbUri}...`);
    await mongoose.connect(dbUri, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('Connected successfully!');

    const db = mongoose.connection.db;
    const report = [];
    report.push(`Database Audit Report - ${new Date().toISOString()}`);
    report.push(`Database URI: ${dbUri}`);
    report.push('==================================================\n');

    // Get all collections
    const collections = await db.listCollections().toArray();
    const collectionNames = collections.map(c => c.name);
    report.push(`Found collections: ${collectionNames.join(', ')}\n`);

    // Helper to log issues
    const logIssue = (msg) => {
      console.log(msg);
      report.push(msg);
    };

    // 1. Audit Companies
    if (collectionNames.includes('companies')) {
      const activeCompanies = await db.collection('companies').find({ removed: false }).toArray();
      const allCompanies = await db.collection('companies').find({}).toArray();
      logIssue(`Companies: Total = ${allCompanies.length}, Active = ${activeCompanies.length}`);
      for (const comp of allCompanies) {
        logIssue(`  - Company: "${comp.name}" | ID: ${comp._id} | removed: ${comp.removed || false}`);
      }
      logIssue('');
    } else {
      logIssue('WARNING: "companies" collection does not exist!');
    }

    // 2. Audit Admins
    if (collectionNames.includes('admins')) {
      const admins = await db.collection('admins').find({}).toArray();
      logIssue(`Admins: Total = ${admins.length}`);
      for (const admin of admins) {
        const hasCompany = admin.companyId ? true : false;
        let companyExists = false;
        if (hasCompany) {
          const comp = await db.collection('companies').findOne({ _id: admin.companyId });
          if (comp) companyExists = true;
        }
        logIssue(`  - Admin: ${admin.email} (${admin.name || 'No Name'})`);
        logIssue(`    ID: ${admin._id} | Role: ${admin.role} | removed: ${admin.removed || false}`);
        logIssue(`    companyId: ${admin.companyId} (Valid: ${hasCompany && companyExists})`);
        if (!hasCompany) {
          logIssue(`    ERROR: companyId is MISSING/UNDEFINED for admin ${admin.email}! This admin will not see filtered data.`);
        } else if (!companyExists) {
          logIssue(`    ERROR: companyId ${admin.companyId} references a non-existent company!`);
        }
      }
      logIssue('');
    }

    // List of collections that should have companyId and removed fields
    const entityCollections = [
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

    for (const collName of entityCollections) {
      if (!collectionNames.includes(collName)) {
        logIssue(`Skipping ${collName} (collection does not exist)`);
        continue;
      }

      const allDocs = await db.collection(collName).find({}).toArray();
      const removedDocs = allDocs.filter(d => d.removed === true);
      const activeDocs = allDocs.filter(d => d.removed !== true);

      logIssue(`Collection: "${collName}" | Total: ${allDocs.length} | Active: ${activeDocs.length} | Removed: ${removedDocs.length}`);

      let missingCompanyCount = 0;
      let invalidCompanyCount = 0;

      for (const doc of allDocs) {
        const compId = doc.companyId;
        if (!compId) {
          missingCompanyCount++;
          // Only print first few details to avoid spamming
          if (missingCompanyCount <= 5) {
            logIssue(`  - [MISSING COMPANY] ID: ${doc._id} | Name/Num: ${doc.name || doc.number || doc.villaNumber || doc.title || 'N/A'}`);
          }
        } else {
          const comp = await db.collection('companies').findOne({ _id: compId });
          if (!comp) {
            invalidCompanyCount++;
            if (invalidCompanyCount <= 5) {
              logIssue(`  - [INVALID COMPANY REFERENCE] ID: ${doc._id} | companyId: ${compId}`);
            }
          }
        }
      }

      if (missingCompanyCount > 0) {
        logIssue(`  - ERROR: ${missingCompanyCount} documents have missing/undefined companyId!`);
      }
      if (invalidCompanyCount > 0) {
        logIssue(`  - ERROR: ${invalidCompanyCount} documents reference a non-existent companyId!`);
      }
      logIssue('');
    }

    // 3. Entity-specific Relationship Checks
    logIssue('--- Relationship Consistency Checks ---');

    // A. Booking -> Villa & Client
    if (collectionNames.includes('bookings')) {
      const bookings = await db.collection('bookings').find({ removed: false }).toArray();
      for (const b of bookings) {
        // Villa check
        if (b.villa) {
          const v = await db.collection('villas').findOne({ _id: b.villa });
          if (!v) {
            logIssue(`ERROR: Booking ${b._id} references non-existent Villa ${b.villa}`);
          } else {
            if (v.removed) {
              logIssue(`WARNING: Active Booking ${b._id} references a REMOVED Villa ${v.name || v.villaNumber}`);
            }
            if (v.companyId && b.companyId && v.companyId.toString() !== b.companyId.toString()) {
              logIssue(`ERROR: Company Mismatch! Booking ${b._id} (company: ${b.companyId}) references Villa ${v._id} (company: ${v.companyId})`);
            }
          }
        } else {
          logIssue(`ERROR: Booking ${b._id} has NO villa field!`);
        }

        // Client check
        if (b.client) {
          const c = await db.collection('clients').findOne({ _id: b.client });
          if (!c) {
            logIssue(`ERROR: Booking ${b._id} references non-existent Client ${b.client}`);
          } else if (c.removed) {
            logIssue(`WARNING: Booking ${b._id} references a REMOVED Client ${c.name}`);
          }
        } else {
          logIssue(`ERROR: Booking ${b._id} has NO client field!`);
        }
      }
    }

    // B. Payment -> Booking & Villa
    if (collectionNames.includes('payments')) {
      const payments = await db.collection('payments').find({ removed: false }).toArray();
      for (const p of payments) {
        if (p.booking) {
          const b = await db.collection('bookings').findOne({ _id: p.booking });
          if (!b) {
            logIssue(`ERROR: Payment ${p._id} (amount: ${p.amount}) references non-existent Booking ${p.booking}`);
          } else {
            if (b.removed) {
              logIssue(`WARNING: Active Payment ${p._id} references a REMOVED Booking ${b._id}`);
            }
            if (p.companyId && b.companyId && p.companyId.toString() !== b.companyId.toString()) {
              logIssue(`ERROR: Company Mismatch! Payment ${p._id} (company: ${p.companyId}) references Booking ${b._id} (company: ${b.companyId})`);
            }
          }
        }
        if (p.villa) {
          const v = await db.collection('villas').findOne({ _id: p.villa });
          if (!v) {
            logIssue(`ERROR: Payment ${p._id} references non-existent Villa ${p.villa}`);
          } else {
            if (v.removed) {
              logIssue(`WARNING: Payment ${p._id} references a REMOVED Villa ${v.name || v.villaNumber}`);
            }
            if (p.companyId && v.companyId && p.companyId.toString() !== v.companyId.toString()) {
              logIssue(`ERROR: Company Mismatch! Payment ${p._id} (company: ${p.companyId}) references Villa ${v._id} (company: ${v.companyId})`);
            }
          }
        }
      }
    }

    // C. LabourContract -> Villa & Labour
    if (collectionNames.includes('labourcontracts')) {
      const contracts = await db.collection('labourcontracts').find({ removed: false }).toArray();
      for (const lc of contracts) {
        if (lc.villa) {
          const v = await db.collection('villas').findOne({ _id: lc.villa });
          if (!v) {
            logIssue(`ERROR: LabourContract ${lc._id} references non-existent Villa ${lc.villa}`);
          }
        }
        if (lc.labour) {
          const l = await db.collection('labours').findOne({ _id: lc.labour });
          if (!l) {
            logIssue(`ERROR: LabourContract ${lc._id} references non-existent Labour ${lc.labour}`);
          }
        }
      }
    }

    logIssue('\n==================================================');
    logIssue('Audit complete.');

    fs.writeFileSync(path.join(__dirname, '../audit_result.txt'), report.join('\n'));

    await mongoose.disconnect();
  } catch (err) {
    console.error('Audit Error:', err);
    process.exit(1);
  }
}

audit();
