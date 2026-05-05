const express = require('express');
const router = express.Router();

const userFraudController = require('../controllers/userFraud.controller');
const postFraudController = require('../controllers/postFraud.controller');
const marketplaceItemFraudController = require('../controllers/marketplaceItemFraud.controller');
const eventFraudController = require('../controllers/eventFraud.controller');
const alertFraudController = require('../controllers/alertFraud.controller');
const reviewFraudController = require('../controllers/reviewFraud.controller');
const commentFraudController = require('../controllers/commentFraud.controller');
const serviceFraudController = require('../controllers/serviceFraud.controller');
const messageFraudController = require('../controllers/messageFraud.controller');

// POST /api/fraud/check/user
router.post('/user', userFraudController.check);

// POST /api/fraud/check/post
router.post('/post', postFraudController.check);

// POST /api/fraud/check/marketplace-item
router.post('/marketplace-item', marketplaceItemFraudController.check);

// POST /api/fraud/check/event
router.post('/event', eventFraudController.check);

// POST /api/fraud/check/alert
router.post('/alert', alertFraudController.check);

// POST /api/fraud/check/review
router.post('/review', reviewFraudController.check);

// POST /api/fraud/check/comment
router.post('/comment', commentFraudController.check);

// POST /api/fraud/check/service
router.post('/service', serviceFraudController.check);

// POST /api/fraud/check/message
router.post('/message', messageFraudController.check);

module.exports = router;
