const express = require('express');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const cors = require('cors');
const sequelize = require('./config/database'); // Connexion Sequelize à MySQL
const multer = require('multer'); // Pour l'upload de fichiers
const path = require('path');
const fs = require('fs'); // Pour la gestion des fichiers (suppression)
const { isAuthenticated, isAdmin } = require('./middleware/authMiddleware');
const bodyParser = require('body-parser');
const PDFDocument = require('pdfkit');
const paypal = require('paypal-rest-sdk');
const nodemailer = require('nodemailer');
const { User, Invoice } = require('./models');
const File = require('./models/File');
//const fileRoutes = require('./routes/fileRoutes');

// Importer les routes
const userRoutes = require('./routes/userRoutes');  // Chemin vers les routes utilisateur
const adminRoutes = require('./routes/adminRoutes'); // Chemin vers les routes admin
//app.use('/api/files', fileRoutes);

//Config Paypal
paypal.configure({
    'mode': 'sandbox', 
    'client_id': process.env.PAYPAL_CLIENT_ID,
    'client_secret': process.env.PAYPAL_CLIENT_SECRET
}); 

//Config Mail

const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.MAIL, 
        pass: process.env.MDP_GG   
    }
});

// Importer le middleware de vérification du token
const verifyToken = require('./middleware/verifyToken');

const app = express();
app.use(express.json()); // Middleware pour gérer les requêtes avec du JSON

// Configuration CORS (autorisation de toutes les origines)
app.use(cors({
    origin: '*', 
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true
}));

// Middleware pour rendre le dossier des fichiers accessible publiquement
app.use('/uploads', express.static('uploads'));

// Synchroniser Sequelize avec la base de données
sequelize.sync({ alter: true })
.then(() => console.log('Base de données synchronisée avec Sequelize.'))
.catch(err => console.error('Erreur lors de la synchronisation de la base de données:', err));
// Utiliser les routes utilisateur et admin
app.use('/api', userRoutes);
app.use('/api', adminRoutes); 
// ----------------------------
// ROUTES D'INSCRIPTION ET CONNEXION
// ----------------------------

// Route pour gérer l'inscription et rediriger vers PayPal


app.post('/api/register', async (req, res) => {
    const { email, password, firstName, lastName, address } = req.body;

    try {
        // Vérifier si l'utilisateur existe déjà
        const userExists = await User.findOne({ where: { Email: email } });
        if (userExists) {
            return res.status(400).json({ message: 'Utilisateur déjà inscrit.' });
        }

        // Hasher le mot de passe
        const hashedPassword = bcrypt.hashSync(password, 10);

        const newUser = await User.create({
            Nom: firstName,
            Prenom: lastName,
            Email: email,
            Mot_de_passe: hashedPassword,
            Adresse: address,
            Capacite_stockage: 20  // Ajouter 20 Go de stockage à l'inscription
        });

        const userMailOptions = {
            from: process.env.MAIL,
            to: newUser.Email,
            subject: 'Confirmation d\'inscription',
            text: `Bienvenue ${newUser.Prenom} ${newUser.Nom}, votre compte a été créé avec succès et vous disposez de 20 Go de stockage.`
        };
        await transporter.sendMail(userMailOptions);

        const adminMailOptions = {
            from: process.env.MAIL,
            to: process.env.MAIL,  
            subject: 'Nouvelle inscription utilisateur',
            text: `Un nouvel utilisateur s'est inscrit : ${newUser.Email} (Nom : ${newUser.Prenom} ${newUser.Nom}, Adresse : ${newUser.Adresse}). Il dispose de 20 Go de stockage.`
        };
        await transporter.sendMail(adminMailOptions);


        res.status(201).json({
            message: 'Inscription réussie avec 20 Go de stockage ajoutés. Un email de confirmation a été envoyé.',
            user: newUser
        });

    } catch (error) {
        console.error('Erreur lors de l\'inscription :', error);
        res.status(500).json({ message: 'Erreur lors de l\'inscription.' });
    }
});



// Route pour gérer la connexion
app.post('/api/login', async (req, res) => {
    const { email, password } = req.body;
    
    try {
        const user = await User.findOne({ where: { Email: email } });
        if (!user) {
            return res.status(404).json({ message: 'Utilisateur non trouvé' });
        }
        
        const isPasswordValid = bcrypt.compareSync(password, user.Mot_de_passe);
        if (!isPasswordValid) {
            return res.status(401).json({ message: 'Mot de passe incorrect' });
        }
        
        const token = jwt.sign(
            { id: user.ID_Utilisateur, email: user.Email, role: user.role },  // Inclure le rôle ici
            'secret',  // Remplacez par votre clé secrète
            { expiresIn: '1h' }
        );
        
        return res.json({
            message: 'Connexion réussie',
            token
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

app.post('/api/files/upload', verifyToken, upload.single('file'), async (req, res) => {
    if (!req.file) {
        return res.status(400).json({ message: 'Aucun fichier sélectionné ou type de fichier non valide.' });
    }
    try {
        const user = await User.findByPk(req.userId);
        if (!user) {
            return res.status(404).json({ message: 'Utilisateur non trouvé.' });
        }
        const userFiles = await File.findAll({ where: { ID_Utilisateur: req.userId } });        
        let totalUsedSpace = 0;
        userFiles.forEach(file => {
            const fileSize = parseInt(file.Taille, 10); 
            totalUsedSpace += fileSize; // Ajout de la taille au total
        });
        // Convertir la capacité de stockage en octets
        const availableSpace = user.Capacite_stockage * 1024 * 1024 * 1024; // 1 Go = 1024*1024*1024 octets
        if (totalUsedSpace + req.file.size > availableSpace) {
            return res.status(400).json({ message: 'Capacité de stockage dépassée. Supprimez des fichiers ou achetez plus d\'espace.' });
        }
        const newFile = await File.create({
            Nom_fichier: req.file.filename,
            Taille: req.file.size,
            ID_Utilisateur: req.userId,
            Date_upload: new Date(),
        });
        res.json({ message: 'Fichier uploadé et enregistré avec succès.', file: newFile });
    } catch (error) {
        res.status(500).json({ message: 'Erreur lors de l\'enregistrement du fichier dans la base de données.' });
    }
});


// Route pour récupérer la liste des fichiers d'un utilisateur (avec `userId` comme paramètre)
app.get('/api/files/:userId', verifyToken, async (req, res) => {
    const userId = req.params.userId; // Utilisateur spécifié
    const userDirectoryPath = path.join(__dirname, 'uploads', String(userId));
  
    try {
      // Vérifier si le dossier de l'utilisateur existe
      if (!fs.existsSync(userDirectoryPath)) {
        return res.status(404).json({ message: "Aucun fichier trouvé pour cet utilisateur." });
      }
  
      // Lire les fichiers dans le dossier de l'utilisateur
      const files = fs.readdirSync(userDirectoryPath);
  
      const fileList = files.map(file => {
        const filePath = path.join(userDirectoryPath, file);
        const stats = fs.statSync(filePath);
        return {
          name: file,
          size: stats.size,
          uploadDate: stats.birthtime,
          url: `http://localhost:5000/uploads/${userId}/${file}`,
        };
      });
  
      res.json({ files: fileList });
    } catch (error) {
      console.error("Erreur lors de la récupération des fichiers :", error);
      res.status(500).json({ message: "Erreur lors de la récupération des fichiers." });
    }
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
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

//app.use('/api/files', fileRoutes);

// ----------------------------
// GESTION DES ERREURS
// ----------------------------
app.use((err, req, res, next) => {
    console.error('Erreur non gérée:', err.stack);
    res.status(500).send('Erreur serveur');
});
// definition relations entres les models file et user 
// Définir les relations entre les modèles
// Démarrer le serveur

app.delete('/api/delete-account', isAuthenticated, async (req, res) => {
    const userId = req.user.id; 
    try {
        const user = await User.findByPk(userId, {
            include: [File]
        });

        if (!user) {
            return res.status(404).json({ message: 'Utilisateur non trouvé.' });
        }

        const fileCount = user.Files.length;
        const totalSize = user.Files.reduce((acc, file) => acc + file.Taille, 0);

        for (let file of user.Files) {
            const filePath = path.join(__dirname, 'uploads', String(userId), file.Nom_fichier);
            if (fs.existsSync(filePath)) {
                fs.unlinkSync(filePath);  
            }
            await file.destroy();  
        }

        await user.destroy();

        const userMailOptions = {
            from: process.env.MAIL,
            to: user.Email,
            subject: 'Confirmation de suppression de compte',
            text: `Votre compte et ${fileCount} fichier(s) associé(s) ont été supprimés avec succès.`
        };
        await transporter.sendMail(userMailOptions);

        const adminMailOptions = {
            from: process.env.MAIL,
            to: process.env.MAIL,  
            subject: 'Suppression de compte utilisateur',
            text: `L'utilisateur ${user.Email} (ID: ${userId}) a supprimé son compte, supprimant ${fileCount} fichier(s) pour un total de ${totalSize} octets.`
        };
        await transporter.sendMail(adminMailOptions);

        res.json({ message: 'Compte et fichiers supprimés avec succès.' });
    } catch (error) {
        console.error('Error deleting account:', error);
        res.status(500).json({ message: 'Erreur lors de la suppression du compte.' });
    }
});

app.post('/api/purchase-storage', isAuthenticated, (req, res) => {
    const montantHT = 20.00;
    const montantTTC = montantHT * 1.20; 

    const create_payment_json = {
        "intent": "sale",
        "payer": {
            "payment_method": "paypal"
        },
        "redirect_urls": {
            "return_url": `http://localhost:5000/api/success?userId=${req.user.id}`, 
            "cancel_url": "http://localhost:3000/cancel"
        },
        "transactions": [{
            "item_list": {
                "items": [{
                    "name": "Espace supplémentaire",
                    "sku": "001",
                    "price": montantTTC.toFixed(2),
                    "currency": "EUR",
                    "quantity": 1
                }]
            },
            "amount": {
                "currency": "EUR",
                "total": montantTTC.toFixed(2)
            },
            "description": "Achat de 20 Go d'espace supplémentaire"
        }]
    };

    paypal.payment.create(create_payment_json, function (error, payment) {
        if (error) {
            throw error;
        } else {
            for (let i = 0; i < payment.links.length; i++) {
                if (payment.links[i].rel === 'approval_url') {
                    return res.json({ redirectUrl: payment.links[i].href });
                }
            }
        }
    });
});

app.get('/api/success', async (req, res) => {
    const payerId = req.query.PayerID;
    const paymentId = req.query.paymentId;
    const userId = req.query.userId;

    const execute_payment_json = {
        "payer_id": payerId,
        "transactions": [{
            "amount": {
                "currency": "EUR",
                "total": "24.00"
            }
        }]
    };

    paypal.payment.execute(paymentId, execute_payment_json, async function (error, payment) {
        if (error) {
            console.log(error.response);
            throw error;
        } else {
            try {
                const user = await User.findByPk(userId);
                if (!user) {
                    return res.status(404).json({ message: 'Utilisateur non trouvé.' });
                }

                // Mise à jour de la capacité de stockage
                user.Capacite_stockage += 20;
                await user.save();

                // Création de la facture
                const invoice = await Invoice.create({
                    userId: userId,
                    clientType: 'particulier', 
                    date: new Date(),
                    amount: 24.00, 
                    description: 'Achat de 20 Go d\'espace de stockage',
                    status: 'paid', 
                    companyName: user.companyName || null, 
                    siret: user.siret || null,             
                    vatNumber: user.vatNumber || null      
                });

                // Envoi de l'email à l'utilisateur
                const userMailOptions = {
                    from: process.env.MAIL,
                    to: user.Email,
                    subject: 'Confirmation d\'achat - Espace de stockage',
                    text: `Merci ${user.Prenom} ${user.Nom}, votre achat de 20 Go d'espace de stockage a été validé avec succès.`
                };
                await transporter.sendMail(userMailOptions);

                // Envoi de l'email à l'admin
                const adminMailOptions = {
                    from: process.env.MAIL,
                    to: process.env.MAIL,  // Envoi à l'admin
                    subject: 'Nouvel achat d\'espace de stockage',
                    text: `L'utilisateur ${user.Email} (ID: ${userId}) a acheté 20 Go d'espace de stockage pour un montant de 24.00 EUR.`
                };
                await transporter.sendMail(adminMailOptions);

                // Fermer l'onglet avec un script JS
                res.send(`
                    <html>
                        <body>
                            <script>
                                window.close();
                            </script>
                            <p>Paiement validé. L'onglet va se fermer automatiquement.</p>
                        </body>
                    </html>
                `);
            } catch (err) {
                console.error('Erreur lors de la mise à jour de l\'utilisateur ou de la création de la facture :', err);
                res.status(500).json({ message: 'Erreur lors de la mise à jour ou de la création de la facture.' });
            }
        }
    });    
});



//
app.get('/api/user-invoices', isAuthenticated, async (req, res) => {
    const userId = req.user.id; 

    try {
        // On récup le user pour l'utiliser dans la genération de la de facture
        const user = await User.findByPk(userId, {
            include: [{
                model: Invoice,
                as: 'invoices',
            }]
        });

        if (!user) {
            return res.status(404).json({ message: 'Utilisateur non trouvé.' });
        }
        const formattedInvoices = user.invoices.map(invoice => {
            const amountTTC = parseFloat(invoice.amount) || 0;
            const amountHT = (amountTTC / 1.20).toFixed(2);  

            return {
                id: invoice.id,
                clientName: `${user.Nom} ${user.Prenom}`,
                purchaseDate: invoice.date.toISOString().split('T')[0],  
                priceTTC: amountTTC.toFixed(2) + ' €',  
                priceHT: amountHT + ' €',  
                description: invoice.description,  
                status: invoice.status,  
                companyName: invoice.companyName || 'Non spécifié',  
                siret: invoice.siret || 'Non spécifié',  
                vatNumber: invoice.vatNumber || 'Non spécifié'  
            };
        });
        res.json(formattedInvoices);

    } catch (error) {
        console.error('Erreur lors de la récupération des factures :', error);
        res.status(500).json({ message: 'Erreur lors de la récupération des factures.' });
    }
});
// Route pour récupérer l'usage du stockage pour un utilisateur donné
app.get('/api/storage-usage', verifyToken, async (req, res) => {
    const userId = req.userId;

    try {
        // Récupérer tous les fichiers de l'utilisateur
        const files = await File.findAll({
            where: { ID_Utilisateur: userId }
        });

        // Vérifier et calculer la taille totale
        const totalUsage = files.reduce((acc, file) => {
            // Assurer que file.Taille est bien un nombre
            const fileSize = Number(file.Taille);
            if (isNaN(fileSize) || fileSize < 0) {
                console.warn(`Taille incorrecte pour le fichier avec ID: ${file.ID_Fichier}`);
                return acc; // Si la taille est invalide, l'ignorer
            }
            return acc + fileSize;
        }, 0);

        // Envoyer l'usage total (en octets)
        res.json({ usage: totalUsage });
    } catch (error) {
        console.error('Erreur lors de la récupération de l\'usage du stockage:', error);
        res.status(500).json({ message: 'Erreur lors de la récupération de l\'usage du stockage' });
    }
});


app.post('/api/download-invoice', isAuthenticated, async (req, res) => {
    const { invoiceId } = req.body; 
    console.log("Corps de la requête reçu:", req.body);
    console.log("Invoice ID reçu:", req.body.invoiceId);
    
    if (!invoiceId) {
        console.log("Erreur: ID de facture manquant.");
        return res.status(400).json({ message: 'ID de facture manquant.' });
    }
    try {
        const invoice = await Invoice.findByPk(invoiceId, {
            include: [{ model: User, as: 'user' }]  
        });

        if (!invoice) {
            console.log("Erreur: Facture non trouvée.");
            return res.status(404).json({ message: 'Facture non trouvée.' });
        }
        console.log("Génération du PDF pour l'ID de facture:", invoiceId);
        const user = invoice.user;  // Utilisateur lié à la facture
        const amountTTC = parseFloat(invoice.amount) || 0;
        const amountHT = (amountTTC / 1.20).toFixed(2);  // Prix HT (déduit 20%)

        // Gen du pdf
        const doc = new PDFDocument();
        const filePath = path.join(__dirname, 'factures', `facture_${invoice.id}.pdf`);

        res.setHeader('Content-Disposition', `attachment; filename=facture_${invoice.id}.pdf`);
        res.setHeader('Content-Type', 'application/pdf');

        doc.pipe(res);
        doc.fontSize(25).text('Facture', { align: 'center' });
        doc.moveDown();
        doc.fontSize(14).text(`Nom du client : ${user.Nom} ${user.Prenom}`);
        doc.text(`Date d'achat : ${invoice.date.toISOString().split('T')[0]}`);
        doc.text(`Prix payé TTC : ${amountTTC.toFixed(2)} €`);
        doc.text(`Prix payé HT : ${amountHT} €`);
        doc.text(`Description : ${invoice.description}`);
        doc.text(`Statut : ${invoice.status}`);
        doc.moveDown();

        if (invoice.companyName) {
            doc.text(`Nom de la compagnie : ${invoice.companyName}`);
        }
        if (invoice.siret) {
            doc.text(`SIRET : ${invoice.siret}`);
        }
        if (invoice.vatNumber) {
            doc.text(`Numéro de TVA : ${invoice.vatNumber}`);
        }
        doc.end();
    } catch (error) {
        console.error('Erreur lors de la génération du PDF :', error);
        res.status(500).json({ message: 'Erreur lors de la génération du PDF.' });
    }
});

// Route pour récupérer les statistiques des utilisateurs
app.get('/api/admin/user-stats', isAuthenticated, isAdmin, async (req, res) => {
    try {
        // Récupérer tous les utilisateurs avec le nombre de fichiers et la taille totale des fichiers
        const users = await User.findAll({
            attributes: ['ID_Utilisateur', 'Nom', 'Prenom', 'Email', 'role'],
            include: [
                {
                    model: File,
                    attributes: [
                        [sequelize.fn('COUNT', sequelize.col('Files.ID_Fichier')), 'fileCount'],
                        [sequelize.fn('SUM', sequelize.col('Files.Taille')), 'totalSize']
                    ],
                }
            ],
            group: ['User.ID_Utilisateur']
        });

        // Format des données renvoyées au client
        const userData = users.map(user => {
            const fileData = user.Files && user.Files.length > 0 ? user.Files[0].dataValues : { fileCount: 0, totalSize: 0 };
            return {
                id: user.ID_Utilisateur,
                name: user.Nom,
                surname: user.Prenom,
                email: user.Email,
                role: user.role,
                fileCount: fileData.fileCount || 0,
                totalSize: fileData.totalSize || 0,
            };
        });

        res.json(userData);
    } catch (error) {
        console.error('Erreur lors de la récupération des statistiques des utilisateurs:', error);
        res.status(500).json({ message: 'Erreur lors de la récupération des statistiques des utilisateurs.' });
    }
});

// Attachez les routes admin
app.use('/api', adminRoutes); // Ajoutez ceci pour que le serveur utilise les routes admin

// Nouvelle route GET pour récupérer les fichiers de l'utilisateur avec pagination
app.get('/api/files', verifyToken, async (req, res) => {
    const userId = req.userId;  // Récupérer l'ID utilisateur depuis le token

    try {
        const page = parseInt(req.query.page) || 1; // Récupérer la page, par défaut 1
        const limit = 5;  // Limite à 5 fichiers par page
        const offset = (page - 1) * limit;

        // Récupérer les fichiers avec pagination
        const { rows, count } = await File.findAndCountAll({
            where: { ID_Utilisateur: userId },
            limit: limit,
            offset: offset,
        });

        const totalPages = Math.ceil(count / limit);

        // Renvoyer les fichiers avec la pagination
        res.json({
            files: rows.map(file => ({
                id: file.ID_Fichier,
                name: file.Nom_fichier,
                size: file.Taille,
                uploadDate: file.Date_upload,
                url: `http://localhost:5000/uploads/${userId}/${file.Nom_fichier}`
            })),
            totalPages: totalPages
        });
    } catch (error) {
        console.error("Erreur lors de la récupération des fichiers :", error);
        res.status(500).json({ message: "Erreur lors de la récupération des fichiers." });
    }
});

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



