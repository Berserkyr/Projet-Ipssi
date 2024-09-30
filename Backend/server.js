require('dotenv').config();
const express = require('express');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const cors = require('cors');
const sequelize = require('./config/database'); // Connexion Sequelize à MySQL
const User = require('./models/User'); // Modèle Sequelize pour les utilisateurs
const multer = require('multer'); // Pour l'upload de fichiers
const path = require('path');
const fs = require('fs'); // Pour la gestion des fichiers (suppression)
const File = require('./models/File');
const userRoutes = require('./routes/userRoutes');  // Chemin vers ton fichier userRoutes.js
const bodyParser = require('body-parser');
const { verifyToken, isAuthenticated, isAdmin, isOTPVerified } = require('./middleware/authMiddleware'); // Ensure this line includes verifyTokenconst nodemailer = require('nodemailer'); 
const nodemailer = require('nodemailer');

const app = express();

app.use(express.json());

// Nodemailer setup
const transporter = nodemailer.createTransport({
    host: process.env.EMAIL_HOST,
    port: process.env.EMAIL_PORT,
    secure: false,  // true for 465, false for other ports
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASSWORD
    },
    tls: {
        rejectUnauthorized: false  // Add this if you're getting TLS errors
    }
});

// Middleware pour rendre le dossier des fichiers accessible publiquement
app.use('/uploads', express.static('uploads'));

// Synchroniser Sequelize avec la base de données
sequelize.sync({ alter: true })
    .then(() => console.log('Base de données synchronisée avec Sequelize.'))
    .catch(err => console.error('Erreur lors de la synchronisation de la base de données:', err));
app.use('/api', userRoutes);

// ----------------------------
// ROUTES D'INSCRIPTION ET CONNEXION
// ----------------------------

function generateOTP() {
    return Math.floor(100000 + Math.random() * 900000).toString(); // Generates a 6-digit OTP
}

// Route pour gérer l'inscription
app.post('/api/register', async (req, res) => {
    const { Nom, Prenom, Email, Mot_de_passe, Adresse, Ville } = req.body;

    if (!Nom || !Prenom || !Email || !Mot_de_passe) { // Adjusted the validation
        return res.status(400).json({ message: 'Veuillez fournir toutes les informations requises.' });
    }

    try {
        const hashedPassword = await bcrypt.hash(Mot_de_passe, 10);
        const user = await User.create({
            Nom,
            Prenom,
            Email,
            Mot_de_passe: hashedPassword,
            Adresse,
            Ville,
        });

        // Generate OTP
        const otp = Math.floor(100000 + Math.random() * 900000).toString(); // Generate a 6-digit OTP
        user.OTP = otp;
        user.OTP_expiration = new Date(Date.now() + 10 * 60000); // OTP valid for 10 minutes
        await user.save();

        // Send OTP via email
        const mailOptions = {
            from: process.env.EMAIL_USER,
            to: Email,
            subject: 'Your OTP Code',
            text: `Your OTP code is ${otp}. It is valid for 10 minutes.`,
        };

        transporter.sendMail(mailOptions, (error, info) => {
            if (error) {
                console.error('Error sending OTP email:', error);
                return res.status(500).json({ message: 'Error sending OTP email.' });
            }
            console.log('Email sent: ' + info.response);
            return res.status(201).json({ message: 'User registered successfully. OTP sent to email.' });
        });
    } catch (error) {
        console.error('Erreur lors de la création de l\'utilisateur:', error);
        return res.status(500).json({ message: 'Erreur serveur lors de la création de l\'utilisateur.' });
    }
});


// Route pour vérifier l'OTP
app.post('/api/verify-otp', async (req, res) => {
    const { email, otp } = req.body;

    // Log incoming request body
    console.log('Received email:', email);
    console.log('Received OTP:', otp);

    if (!email || !otp) {
        return res.status(400).json({ message: 'Veuillez fournir l\'email et l\'OTP.' });
    }

    try {
        const user = await User.findOne({ where: { Email: email } });
        if (!user) {
            return res.status(404).json({ message: 'Utilisateur non trouvé' });
        }

        // Vérifier si l'OTP est valide
        if (user.OTP !== otp) {
            return res.status(401).json({ message: 'OTP incorrect' });
        }

        // Vérifier si l'OTP a expiré
        if (user.OTP_expiration < new Date()) {
            return res.status(401).json({ message: 'OTP expiré, veuillez vous réinscrire.' });
        }

        // Réinitialiser l'OTP et l'expiration
        user.OTP = null;
        user.OTP_expiration = null;
        await user.save();

        return res.json({ message: 'OTP vérifié avec succès. Vous pouvez maintenant vous connecter.' });
    } catch (error) {
        console.error('Erreur lors de la vérification de l\'OTP:', error);
        return res.status(500).json({ message: 'Erreur serveur lors de la vérification de l\'OTP.' });
    }
});




// Route pour gérer la connexion
app.post('/api/login', async (req, res) => {
    const { email, password } = req.body;
    
    try {
        const user = await User.findOne({ 
            where: { 
                [Op.or]: [
                    { Email: email },
                ]
            }
        });

        if (!user) {
            return res.status(404).json({ message: 'Utilisateur non trouvé' });
        }

        const isPasswordValid = bcrypt.compareSync(password, user.Mot_de_passe);
        if (!isPasswordValid) {
            return res.status(401).json({ message: 'Mot de passe incorrect' });
        }

        // Generate OTP and set expiration
        const otp = Math.floor(100000 + Math.random() * 900000).toString(); // Generates a 6-digit OTP
        const expirationTime = new Date();
        expirationTime.setMinutes(expirationTime.getMinutes() + 10); // OTP expires in 10 minutes

        // Save OTP and expiration to the user
        user.OTP = otp;
        user.OTP_expiration = expirationTime;
        await user.save();

        return res.json({
            message: 'Connexion réussie. Un OTP a été envoyé à votre email.',
            userId: user.ID_Utilisateur, // You might want to return userId for further verification
        });
    } catch (error) {
        return res.status(500).json({ message: 'Erreur serveur lors de la connexion.' });
    }
});




// ----------------------------
// ROUTES DE GESTION DES FICHIERS
// ----------------------------

// Configuration de multer pour gérer les fichiers uploadés
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        // Récupère l'ID utilisateur depuis le token JWT
        const userId = req.userId;  // Stocké par le middleware `verifyToken`
        const userDirectoryPath = path.join(__dirname, 'uploads', String(userId));
        
        // Crée le dossier utilisateur s'il n'existe pas encore
        if (!fs.existsSync(userDirectoryPath)) {
            fs.mkdirSync(userDirectoryPath, { recursive: true });
        }
        
        cb(null, userDirectoryPath);  // Enregistre les fichiers dans le dossier de l'utilisateur
    },
    filename: (req, file, cb) => {
        cb(null, Date.now() + '-' + file.originalname);  // Ajoute un horodatage au nom du fichier
    }
});


const fileFilter = (req, file, cb) => {
    const allowedTypes = ['image/jpeg', 'image/png', 'application/pdf'];
    if (allowedTypes.includes(file.mimetype)) {
        cb(null, true); // Accepte le fichier
    } else {
        cb(new Error('Type de fichier non autorisé'), false); // Rejette le fichier
    }
};

const upload = multer({
    storage: storage,
    fileFilter: fileFilter,
    limits: { fileSize: 5 * 1024 * 1024 } // Limite à 5 Mo
});

// Route pour uploader un fichier et l'enregistrer dans la base de données
app.post('/api/files/upload', verifyToken, upload.single('file'), async (req, res) => {
    console.log('Requête d\'upload reçue');
    
    if (!req.file) {
        console.log('Aucun fichier reçu ou type de fichier non valide');
        return res.status(400).json({ message: 'Aucun fichier sélectionné ou type de fichier non valide.' });
    }

    console.log('Fichier uploadé avec succès :', req.file);

    try {
        // Enregistrer le fichier dans la base de données
        const newFile = await File.create({
            Nom_fichier: req.file.filename,
            Taille: req.file.size,
            ID_Utilisateur: req.userId, // Assurez-vous que verifyToken définit bien req.userId
            Date_upload: new Date()
        });

        // Répondre avec succès et les informations sur le fichier enregistré
        res.json({ message: 'Fichier uploadé et enregistré avec succès.', file: newFile });
    } catch (error) {
        console.error('Erreur lors de l\'enregistrement du fichier dans la base de données :', error);
        res.status(500).json({ message: 'Erreur lors de l\'enregistrement du fichier dans la base de données.' });
    }
});

// Route pour récupérer la liste des fichiers de l'utilisateur
app.get('/api/files', verifyToken, (req, res) => {
    const userId = req.userId;  // Utilisateur authentifié
    const userDirectoryPath = path.join(__dirname, 'uploads', String(userId));
    
    // Lire les fichiers dans le dossier de l'utilisateur
    fs.readdir(userDirectoryPath, (err, files) => {
        if (err) {
            return res.status(500).json({ message: 'Erreur lors de la récupération des fichiers.' });
        }

        const fileList = files.map(file => {
            const filePath = path.join(userDirectoryPath, file);
            const stats = fs.statSync(filePath);  // Récupérer les informations sur chaque fichier
            return {
                name: file,
                size: stats.size,  // Taille du fichier
                uploadDate: stats.birthtime,  // Date d'upload du fichier
                url: `http://localhost:5000/uploads/${userId}/${file}`  // URL du fichier
            };
        });

        res.json({ files: fileList });  // Renvoyer les informations des fichiers en tant qu'objets JSON
    });
});

// Route pour supprimer un fichier
app.delete('/api/files/:fileName', verifyToken, (req, res) => {
    const userId = req.userId;
    const filePath = path.join(__dirname, 'uploads', String(userId), req.params.fileName);
    
    fs.unlink(filePath, (err) => {
        if (err) {
            return res.status(500).json({ message: 'Erreur lors de la suppression du fichier.' });
        }
        res.json({ message: 'Fichier supprimé avec succès.' });
    });
});

// ----------------------------
// GESTION DES ERREURS
// ----------------------------
app.use((err, req, res, next) => {
    console.error('Erreur non gérée:', err.stack);
    res.status(500).send('Erreur serveur');
});
// definition relations entres les models file et user 
// Définir les relations entre les modèles
User.hasMany(File, { foreignKey: 'ID_Utilisateur' });
File.belongsTo(User, { foreignKey: 'ID_Utilisateur' });
// Démarrer le serveur


app.post('/api/change-role', isAuthenticated, isAdmin, async (req, res) => {
    const { userId, newRole } = req.body;

    try {
        const user = await User.findByPk(userId);
        if (!user) {
            return res.status(404).json({ message: 'Utilisateur non trouvé.' });
        }

        user.role = newRole;
        await user.save();

        res.json({ message: `Le rôle de l'utilisateur a été mis à jour en ${newRole}.`, user });
    } catch (error) {
        res.status(500).json({ message: 'Erreur lors de la mise à jour du rôle.', error });
    }
});

app.post('/api/delete-user', isAuthenticated, isAdmin, async (req, res) => {
    const { userId } = req.body;

    try {

        const user = await User.findByPk(userId);
        if (!user) {
            return res.status(404).json({ message: 'User non trouvé.' });
        }

        await user.destroy();
        res.json({ message: `User ${userId} has été supprimé.` });
    } catch (error) {
        console.error('Erreur durant la suppression:', error);
        res.status(500).json({ message: 'Erreur durant la suppression:' });
    }
});


app.get('/api/admin/user-stats', isAuthenticated, isAdmin, async (req, res) => {
    try {
        const users = await User.findAll({
            attributes: ['ID_Utilisateur', 'Nom', 'Prenom', 'Email', 'role'],
            include: [{
                model: File,
                attributes: [
                    [sequelize.fn('COUNT', sequelize.col('Files.ID_Fichier')), 'fileCount'],
                    [sequelize.fn('SUM', sequelize.col('Files.Taille')), 'totalSize']
                ]
            }],
            group: ['User.ID_Utilisateur'] 
        });
        const userData = users.map(user => {
            const fileData = user.Files[0] ? user.Files[0].dataValues : { fileCount: 0, totalSize: 0 };
            return {
                id: user.ID_Utilisateur,
                name: user.Nom,
                surname: user.Prenom,
                email: user.Email,
                role: user.role,
                fileCount: fileData.fileCount || 0, 
                totalSize: fileData.totalSize || 0  
            };
        });

        res.json(userData);
    } catch (error) {
        console.error('Error fetching user stats:', error);
        res.status(500).json({ message: 'Erreur lors de la récupération des statistiques des utilisateurs.' });
    }
});


const PORT = 5000;
app.listen(PORT, () => {
    console.log(`Serveur backend démarré sur le port ${PORT}`);
});