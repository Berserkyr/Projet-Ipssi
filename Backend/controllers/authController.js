const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const twilio = require('twilio');

// Twilio setup (use environment variables in a .env file for security)
const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const client = twilio(accountSid, authToken);

// Function to generate a random OTP (6-digit code)
const generateOTP = () => Math.floor(100000 + Math.random() * 900000);

// Inscription
exports.register = async (req, res) => {
    const { email, password, firstName, lastName, address, phoneNumber, role } = req.body;

    try {
        // Vérifier si l'utilisateur existe déjà
        const userExists = await User.findOne({ where: { email } });
        if (userExists) {
            return res.status(400).json({ message: 'Utilisateur déjà inscrit.' });
        }

        // Hasher le mot de passe
        const hashedPassword = await bcrypt.hash(password, 10);

        // Générer un OTP pour la confirmation de l'inscription
        const otp = generateOTP();

        // Créer un nouvel utilisateur
        const newUser = await User.create({
            email,
            Mot_de_passe: hashedPassword,
            Nom: firstName,
            Prenom: lastName,
            Adresse: address,
            Date_inscription: new Date(),
            role: role || 'user',
            phoneNumber,  // Nouveau numéro de téléphone
            otp,  // Sauvegarder l'OTP
            otpExpiration: Date.now() + 10 * 60 * 1000  // Expire dans 10 minutes
        });

        // Envoyer l'OTP via SMS
        client.messages.create({
            body: `Votre code OTP pour l'inscription est ${otp}`,
            from: '+Your_Twilio_Number',  // Numéro Twilio
            to: phoneNumber
        }).then(message => {
            console.log(`OTP envoyé: ${message.sid}`);
            res.status(201).json({ message: 'Inscription réussie, OTP envoyé.', user: newUser });
        }).catch(error => {
            console.error(error);
            res.status(500).json({ message: 'Erreur lors de l\'envoi du SMS.', error });
        });
    } catch (error) {
        res.status(500).json({ message: 'Erreur lors de l\'inscription.', error });
    }
};


// Connexion avec 2FA (OTP)
exports.login = async (req, res) => {
    const { email, password } = req.body;

    try {
        // Trouver l'utilisateur
        const user = await User.findOne({ where: { email } });
        if (!user) {
            return res.status(404).json({ message: 'Utilisateur non trouvé.' });
        }

        // Vérifier le mot de passe
        const isPasswordValid = await bcrypt.compare(password, user.Mot_de_passe);
        if (!isPasswordValid) {
            return res.status(401).json({ message: 'Mot de passe incorrect.' });
        }

        // Générer un OTP et l'envoyer par SMS
        const otp = generateOTP();
        user.otp = otp;
        user.otpExpiration = Date.now() + 10 * 60 * 1000;  // Expire dans 10 minutes
        await user.save();

        // Envoyer OTP via SMS
        client.messages.create({
            body: `Votre code OTP pour la connexion est ${otp}`,
            from: '+Your_Twilio_Number',  // Numéro Twilio
            to: user.phoneNumber
        }).then(message => {
            console.log(`OTP envoyé: ${message.sid}`);
            res.status(200).json({ message: 'Mot de passe valide, OTP envoyé.', user: { email: user.email, id: user.ID_Utilisateur } });
        }).catch(error => {
            console.error(error);
            res.status(500).json({ message: 'Erreur lors de l\'envoi du SMS.', error });
        });

    } catch (error) {
        res.status(500).json({ message: 'Erreur lors de la connexion.', error });
    }
};

// Vérification de l'OTP (2FA)
exports.verifyOTP = async (req, res) => {
    const { email, otp } = req.body;

    try {
        const user = await User.findOne({ where: { email } });
        if (!user) {
            return res.status(404).json({ message: 'Utilisateur non trouvé.' });
        }

        // Vérifier si l'OTP est correct et s'il est encore valide
        if (user.otp !== otp || Date.now() > user.otpExpiration) {
            return res.status(400).json({ message: 'OTP invalide ou expiré.' });
        }

        // Connexion réussie, générer le token JWT
        const token = jwt.sign({ id: user.ID_Utilisateur, email: user.email, role: user.role }, 'secret_key', { expiresIn: '1h' });

        // Effacer l'OTP après utilisation
        user.otp = null;
        user.otpExpiration = null;
        await user.save();

        res.json({
            message: 'Connexion réussie.',
            token,
        });
    } catch (error) {
        res.status(500).json({ message: 'Erreur lors de la vérification de l\'OTP.', error });
    }
};


// Middleware d'authentification avec JWT
exports.authenticate = (req, res, next) => {
    const token = req.headers['authorization'];
    if (!token) {
        return res.status(401).json({ message: 'Token non fourni.' });
    }

    jwt.verify(token.split(' ')[1], 'secret_key', (err, decoded) => {
        if (err) {
            return res.status(403).json({ message: 'Token invalide.' });
        }

        req.user = decoded;  // Stocker les informations décodées dans req.user
        next();
    });
};

// Middleware pour vérifier si l'utilisateur est admin
exports.isAdmin = (req, res, next) => {
    if (req.user.role !== 'admin') {
        return res.status(403).json({ message: 'Accès interdit : Administrateur requis.' });
    }
    next();
};
