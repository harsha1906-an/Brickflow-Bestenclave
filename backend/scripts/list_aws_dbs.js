const mongoose = require('mongoose');
const path = require('path');

require('dotenv').config({ path: path.join(__dirname, '../.env') });
const dbUri = process.env.DATABASE || 'mongodb://127.0.0.1:27017/erp';

async function listDbs() {
  try {
    await mongoose.connect(dbUri);
    console.log('Connected to:', dbUri);
    
    const adminDb = mongoose.connection.client.db().admin();
    const dbsList = await adminDb.listDatabases();
    console.log('ALL DATABASES:');
    console.log(JSON.stringify(dbsList, null, 2));

    for (const dbInfo of dbsList.databases) {
      const dbName = dbInfo.name;
      if (['admin', 'config', 'local'].includes(dbName)) continue;
      
      const db = mongoose.connection.client.db(dbName);
      const collections = await db.listCollections().toArray();
      console.log(`\nDatabase: ${dbName}`);
      for (const coll of collections) {
        const count = await db.collection(coll.name).countDocuments({});
        console.log(`  - Collection: ${coll.name} | Count: ${count}`);
      }
    }
    
    await mongoose.disconnect();
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

listDbs();
