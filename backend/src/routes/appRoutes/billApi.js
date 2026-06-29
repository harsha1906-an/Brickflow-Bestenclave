const express = require('express');
const { catchErrors } = require('@/handlers/errorHandlers');
const { singleStorageUpload } = require('@/middlewares/uploadMiddleware');
const billController = require('@/controllers/appControllers/billController');

const router = express.Router();

router.route('/bill/scan').post(
    singleStorageUpload({ entity: 'admin', fieldName: 'file', fileType: 'image' }),
    catchErrors(billController.scanBill)
);

module.exports = router;
