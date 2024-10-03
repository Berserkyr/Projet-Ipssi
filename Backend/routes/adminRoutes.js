const express = require('express');
const { isAdmin, isAuthenticated, isOTPVerified } = require('../middleware/authMiddleware'); // Import necessary middlewares
const verifyToken = require('../middleware/verifyToken');
const adminController = require('../controllers/adminController');

const router = express.Router();

router.get('/admin/users', verifyToken, isAuthenticated, isOTPVerified, isAdmin, adminController.getUsers);
router.delete('/admin/users/:userId', verifyToken, isAuthenticated, isOTPVerified, isAdmin, adminController.deleteUser);
router.get('/admin/stats', verifyToken, isAuthenticated, isOTPVerified, isAdmin, adminController.getStats);
router.get('/admin/invoices/:userId', verifyToken, isAuthenticated, isOTPVerified, isAdmin, adminController.getInvoicesByUser);

router.post('/admin/change-role', verifyToken, isAuthenticated, isOTPVerified, isAdmin, adminController.changeUserRole);

module.exports = router;