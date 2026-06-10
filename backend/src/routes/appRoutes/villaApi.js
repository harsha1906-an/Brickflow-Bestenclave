const express = require('express');
const router = express.Router({ mergeParams: true });
const villaRoutes = require('../../modules/VillaModule/villa.routes');

// Mount at /companies/:companyId/villas
// Note: app.js mounts this at /api
router.use('/companies/:companyId/villas', villaRoutes);

module.exports = router;
