const jwt = require('jsonwebtoken');
const User = require('../models/User'); // Import the User model

// Middleware pour vérifier si l'utilisateur est authentifié
exports.isAuthenticated = (req, res, next) => {
    const token = req.headers['authorization'];
    if (!token) {
        return res.status(401).json({ message: 'Token non fourni.' });
    }

    const tokenPart = token.split(' ')[1]; // Assumes Bearer token format

    jwt.verify(tokenPart, process.env.JWT_SECRET, (err, decoded) => {
        if (err) {
            return res.status(403).json({ message: 'Token invalide.' });
        }

        req.user = decoded;  
        next();  
    });
};

// Middleware pour vérifier si l'utilisateur est admin
exports.isAdmin = (req, res, next) => {
    if (req.user.role !== 'admin') {
        return res.status(403).json({ message: 'Accès réservé aux administrateurs' });
    }
    next();
};

// Middleware pour vérifier si l'utilisateur a validé l'OTP
exports.isOTPVerified = async (req, res, next) => {
    try {
        // Rechercher l'utilisateur dans la base de données
        const user = await User.findByPk(req.user.id);

        // Vérifier si l'OTP est présent et n'a pas expiré
        if (!user.OTP || user.OTP_expiration < new Date()) {
            return res.status(403).json({ message: 'OTP non validé ou expiré.' });
        }

        next(); // Passer à l'étape suivante si l'OTP est valide
    } catch (error) {
        res.status(500).json({ message: 'Erreur lors de la vérification de l\'OTP.', error });
    }
};

// Middleware pour vérifier le token (ajouté ici)
exports.verifyToken = (req, res, next) => {
    const token = req.headers['authorization'];
    if (!token) {
        return res.status(403).json({ message: 'Token non fourni.' });
    }

    const tokenPart = token.split(' ')[1]; // Assumes Bearer token format

    jwt.verify(tokenPart, process.env.JWT_SECRET, (err, decoded) => {
        if (err) {
            return res.status(403).json({ message: 'Token invalide.' });
        }

        req.userId = decoded.id; // Save user ID in request for further use
        next();
    });
};
