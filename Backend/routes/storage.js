const express = require('express');
const router = express.Router();
const storageController = require('../controllers/storageController');

// Endpoint pour récupérer l'usage du stockage
router.get('/storage-usage', storageController.getStorageUsage);

module.exports = router;
