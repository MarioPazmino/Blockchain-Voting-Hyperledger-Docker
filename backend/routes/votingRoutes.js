const express = require('express');
const router = express.Router();
const votingController = require('../controllers/votingController');

// Endpoints
router.post('/create', votingController.createVoting);
router.post('/vote', votingController.vote);
router.get('/results/:id', votingController.getResults);

module.exports = router;