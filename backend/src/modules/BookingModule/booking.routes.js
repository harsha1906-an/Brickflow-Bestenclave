const express = require('express');
const router = express.Router();
const bookingController = require('./booking.controller');
const checkRbac = require('@/middlewares/rbacMiddleware');

// Matches appApi.js patterns
router.post('/create', checkRbac('booking', 'create'), bookingController.create);
router.get('/list', checkRbac('booking', 'list'), bookingController.list);
router.get('/listAll', checkRbac('booking', 'listAll'), bookingController.listAll);
router.get('/read/:id', checkRbac('booking', 'read'), bookingController.read);
router.patch('/update/:id', checkRbac('booking', 'update'), bookingController.update);
router.get('/search', checkRbac('booking', 'search'), bookingController.search);
router.get('/filter', checkRbac('booking', 'filter'), bookingController.filter);
router.get('/summary', checkRbac('booking', 'summary'), bookingController.summary);
// router.delete('/delete/:id', bookingController.delete);

module.exports = router;

