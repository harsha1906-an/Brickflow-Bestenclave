const express = require('express');
const router = express.Router();
const whatsappController = require('@/controllers/appControllers/whatsappController');
const { catchErrors } = require('@/handlers/errorHandlers');

router.get('/status', catchErrors(whatsappController.getStatus));
router.post('/reset', catchErrors(whatsappController.reset));
router.post('/send', catchErrors(whatsappController.send));

module.exports = router;
