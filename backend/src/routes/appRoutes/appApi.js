const express = require('express');
const { catchErrors } = require('@/handlers/errorHandlers');
const router = express.Router();
const chartDataController = require('@/controllers/appControllers/chartDataController');

const appControllers = require('@/controllers/appControllers');
const { routesList } = require('@/models/utils');
const checkRbac = require('@/middlewares/rbacMiddleware');

const routerApp = (entity, controller) => {
  router.route(`/${entity}/create`).post(checkRbac(entity, 'create'), catchErrors(controller['create']));
  router.route(`/${entity}/read/:id`).get(checkRbac(entity, 'read'), catchErrors(controller['read']));
  router.route(`/${entity}/update/:id`).patch(checkRbac(entity, 'update'), catchErrors(controller['update']));
  router.route(`/${entity}/delete/:id`).delete(checkRbac(entity, 'delete'), catchErrors(controller['delete']));
  router.route(`/${entity}/search`).get(checkRbac(entity, 'search'), catchErrors(controller['search']));
  router.route(`/${entity}/list`).get(checkRbac(entity, 'list'), catchErrors(controller['list']));
  router.route(`/${entity}/listAll`).get(checkRbac(entity, 'listAll'), catchErrors(controller['listAll']));
  router.route(`/${entity}/filter`).get(checkRbac(entity, 'filter'), catchErrors(controller['filter']));
  router.route(`/${entity}/summary`).get(checkRbac(entity, 'summary'), catchErrors(controller['summary']));

  if (entity === 'invoice' || entity === 'quote' || entity === 'payment') {
    router.route(`/${entity}/mail`).post(checkRbac(entity, 'mail'), catchErrors(controller['mail']));
  }

  if (entity === 'payment' || entity === 'invoice') {
    router.route(`/${entity}/approve/:id`).post(checkRbac(entity, 'approveUpdate'), catchErrors(controller['approveUpdate']));
    router.route(`/${entity}/reject/:id`).post(checkRbac(entity, 'rejectUpdate'), catchErrors(controller['rejectUpdate']));
  }

  if (entity === 'quote') {
    router.route(`/${entity}/convert/:id`).get(checkRbac(entity, 'convert'), catchErrors(controller['convert']));
  }

  if (entity === 'lead') {
    router.route(`/${entity}/convert/:id`).post(checkRbac(entity, 'convert'), catchErrors(controller['convert']));
  }

  if (entity === 'material') {
    router.route(`/${entity}/adjust/:id`).post(checkRbac(entity, 'adjustStock'), catchErrors(controller['adjustStock']));
    router.route(`/${entity}/history/:id`).get(checkRbac(entity, 'history'), catchErrors(controller['history']));
    router.route(`/${entity}/transactions`).get(checkRbac(entity, 'recentTransactions'), catchErrors(controller['recentTransactions']));
    router.route(`/${entity}/downloadReport`).get(checkRbac(entity, 'downloadReport'), catchErrors(controller['downloadReport']));
    router.route(`/${entity}/transaction/delete/:id`).delete(checkRbac(entity, 'adjustStock'), catchErrors(controller['deleteTransaction']));
  }

  if (entity === 'client') {
    router.route(`/${entity}/report`).get(checkRbac(entity, 'report'), catchErrors(controller['report']));
  }

  if (entity === 'purchaseorder') {
    router.route(`/${entity}/submit/:id`).patch(checkRbac(entity, 'submit'), catchErrors(controller['submit']));
    router.route(`/${entity}/approve/:id`).patch(checkRbac(entity, 'approve'), catchErrors(controller['approve']));
    router.route(`/${entity}/reject/:id`).patch(checkRbac(entity, 'reject'), catchErrors(controller['reject']));
  }

  if (entity === 'booking') {
    router.route(`/${entity}/receipt/:id`).get(checkRbac(entity, 'receipt'), catchErrors(controller['receipt']));
  }

  if (entity === 'pettycashtransaction') {
    router.route(`/${entity}/report`).get(checkRbac(entity, 'report'), catchErrors(controller['report']));
  }

  if (entity === 'villa') {
    router.route(`/${entity}/report/:id`).get(checkRbac(entity, 'downloadVillaReport'), catchErrors(controller['downloadVillaReport']));
  }
};

router.route('/dashboard/chart-data').get(catchErrors(chartDataController));
router.route('/global-search').get(catchErrors(appControllers.globalSearchController.search));

routesList.forEach(({ entity, controllerName }) => {
  const controller = appControllers[controllerName];
  routerApp(entity, controller);
});

module.exports = router;
