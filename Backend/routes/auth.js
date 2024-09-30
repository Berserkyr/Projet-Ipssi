const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');

// Inscription
router.post('/register', authController.register);

// Connexion (Étape 1 : Connexion avec envoi d'OTP)
router.post('/login', authController.login);

// Vérification de l'OTP (Étape 2 : Vérification de l'OTP pour 2FA)
router.post('/verify-otp', authController.verifyOTP);

module.exports = router;
