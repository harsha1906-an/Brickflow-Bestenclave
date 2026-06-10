const express = require('express');
const { catchErrors } = require('@/handlers/errorHandlers');
const router = express.Router();

const auditLogController = require('@/controllers/appControllers/auditLogController');
const checkRbac = require('@/middlewares/rbacMiddleware');

// Mount routes for auditLog
const entity = 'auditlog';

router.route(`/${entity}/read/:id`).get(checkRbac(entity, 'read'), catchErrors(auditLogController.read));
router.route(`/${entity}/search`).get(checkRbac(entity, 'search'), catchErrors(auditLogController.search));
router.route(`/${entity}/list`).get(checkRbac(entity, 'list'), catchErrors(auditLogController.list));
router.route(`/${entity}/listAll`).get(checkRbac(entity, 'listAll'), catchErrors(auditLogController.listAll));
router.route(`/${entity}/filter`).get(checkRbac(entity, 'filter'), catchErrors(auditLogController.filter));
router.route(`/${entity}/summary`).get(checkRbac(entity, 'summary'), catchErrors(auditLogController.summary));

module.exports = router;
