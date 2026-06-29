const allRoles = ['owner', 'manager', 'engineer', 'accountant'];

// Define all base business entities
const entitiesList = [
  'invoice', 'quote', 'payment', 'client', 'booking', 
  'expense', 'pettycashtransaction', 'villa', 'material', 
  'inventorytransaction', 'goodsreceipt', 'project', 
  'labour', 'attendance', 'supplier', 'auditlog'
];

const rbacConfig = {
  entities: {}
};

// Programmatically assign full access to all roles for all entities and actions
for (const entity of entitiesList) {
  rbacConfig.entities[entity] = {
    create: allRoles,
    read: allRoles,
    update: allRoles,
    delete: allRoles,
    list: allRoles,
    listAll: allRoles,
    search: allRoles,
    filter: allRoles,
    summary: allRoles,
    mail: allRoles,
    approveUpdate: allRoles,
    rejectUpdate: allRoles,
    convert: allRoles,
    report: allRoles,
    receipt: allRoles,
    downloadVillaReport: allRoles,
    adjustStock: allRoles,
    history: allRoles,
    recentTransactions: allRoles,
    downloadReport: allRoles
  };
}

module.exports = rbacConfig;
