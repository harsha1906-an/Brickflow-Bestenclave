require('module-alias/register');
const adminAuth = require('./src/controllers/coreControllers/adminAuth');

console.log('Keys of adminAuth:', Object.keys(adminAuth));
console.log('Type of adminAuth.register:', typeof adminAuth.register);
