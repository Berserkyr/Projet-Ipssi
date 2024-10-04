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


        const hashedPassword = bcrypt.hashSync(password, 10);

        const montantHT = 20.00;
        const montantTTC = montantHT * 1.20;

        const create_payment_json = {
            "intent": "sale",
            "payer": {
                "payment_method": "paypal"
            },
            "redirect_urls": {
                "return_url": `http://localhost:5000/api/register-success?email=${encodeURIComponent(email)}&password=${encodeURIComponent(hashedPassword)}&firstName=${encodeURIComponent(firstName)}&lastName=${encodeURIComponent(lastName)}&address=${encodeURIComponent(address)}`,
                "cancel_url": "http://localhost:3000/cancel"
            },
            "transactions": [{
                "item_list": {
                    "items": [{
                        "name": "Inscription avec 20 Go de stockage",
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
                "description": "Paiement pour l'inscription avec 20 Go de stockage"
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
    } catch (error) {
        console.error('Erreur lors du processus d\'inscription :', error);
        res.status(500).json({ message: 'Erreur lors du processus d\'inscription.' });
    }
});

// Route de succès pour créer l'utilisateur après paiement
app.get('/api/register-success', async (req, res) => {
    const payerId = req.query.PayerID;
    const paymentId = req.query.paymentId;
    const { email, password, firstName, lastName, address } = req.query;

    const execute_payment_json = {
        "payer_id": payerId,
        "transactions": [{
            "amount": {
                "currency": "EUR",
                "total": "24.00" // Montant total TTC
            }
        }]
    };

    paypal.payment.execute(paymentId, execute_payment_json, async function (error, payment) {
        if (error) {
            console.log(error.response);
            throw error;
        } else {
            try {
                // Créer l'utilisateur après validation du paiement
                const newUser = await User.create({
                    Nom: firstName,
                    Prenom: lastName,
                    Email: email,
                    Mot_de_passe: password,
                    Adresse: address,
                    Capacite_stockage: 20 // Ajouter 20 Go de stockage à l'inscription
                });
                console.log(newUser)
                const invoice = await Invoice.create({
                    userId: newUser.ID_Utilisateur,
                    clientType: 'particulier', 
                    date: new Date(),
                    amount: 24.00, 
                    description: 'Achat de 20 Go d\'espace de stockage',
                    status: 'paid', 
                    companyName: newUser.companyName || null,  
                    siret: newUser.siret || null,              
                    vatNumber: newUser.vatNumber || null      
                });

                // Envoi d'emails après création de l'utilisateur
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

                res.send(`
                    <html>
                        <body>
                            <script>
                                window.location.href = 'http://localhost:3000/login ';  // Redirection vers la page de login
                            </script>
                            <p>Inscription réussie et paiement validé. Vous allez être redirigé vers la page de connexion.</p>
                        </body>
                    </html>
                `);
                
            } catch (err) {
                console.error('Erreur lors de la création de l\'utilisateur après paiement :', err);
                res.status(500).json({ message: 'Erreur lors de la création de l\'utilisateur après paiement.' });
            }
        }
    });
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
app.delete('/api/files/:fileId', verifyToken, async (req, res) => {
    const userId = req.userId; // ID de l'utilisateur authentifié
    const fileId = req.params.fileId; // ID du fichier à supprimer

    try {
        // Rechercher le fichier dans la base de données par son ID et vérifier qu'il appartient à l'utilisateur
        const file = await File.findOne({ where: { ID_Fichier: fileId, ID_Utilisateur: userId } });
        if (!file) {
            return res.status(404).json({ message: 'Fichier non trouvé dans la base de données.' });
        }

        const filePath = path.join(__dirname, 'uploads', String(userId), file.Nom_fichier);

        // Supprimer le fichier du système de fichiers
        fs.unlink(filePath, async (err) => {
            if (err) {
                console.error('Erreur lors de la suppression du fichier du système de fichiers:', err);
                return res.status(500).json({ message: 'Erreur lors de la suppression du fichier.' });
            }

            // Supprimer le fichier de la base de données
            await file.destroy();

            res.json({ message: 'Fichier supprimé avec succès du système et de la base de données.' });
        });
    } catch (error) {
        console.error('Erreur lors de la suppression du fichier :', error);
        res.status(500).json({ message: 'Erreur lors de la suppression du fichier.' });
    }
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
        // Récupérer les fichiers de l'utilisateur
        const files = await File.findAll({
            where: { ID_Utilisateur: userId }
        });

        // Calculer la taille totale des fichiers
        const totalUsage = files.reduce((acc, file) => {
            const fileSize = Number(file.Taille);
            if (isNaN(fileSize) || fileSize < 0) {
                console.warn(`Taille incorrecte pour le fichier avec ID: ${file.ID_Fichier}`);
                return acc; // Ignorer les fichiers avec des tailles invalides
            }
            return acc + fileSize;
        }, 0);

        // Récupérer les informations de l'utilisateur, notamment la capacité de stockage
        const user = await User.findByPk(userId);

        if (!user) {
            return res.status(404).json({ message: 'Utilisateur non trouvé.' });
        }

        // Convertir la capacité de stockage en octets (Go -> octets)
        const totalStorageInBytes = user.Capacite_stockage * 1024 * 1024 * 1024;

        // Envoyer à la fois l'usage total et la capacité totale de stockage
        res.json({
            usage: totalUsage,
            totalStorageInBytes: totalStorageInBytes
        });
    } catch (error) {
        console.error('Erreur lors de la récupération de l\'usage du stockage:', error);
        res.status(500).json({ message: 'Erreur lors de la récupération de l\'usage du stockage' });
    }
});


app.post('/api/download-invoice', isAuthenticated, async (req, res) => {
    const { invoiceId } = req.body;
    console.log("Corps de la requête reçu:", req.body);
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
 
        const user = invoice.user;
        const amountTTC = parseFloat(invoice.amount) || 0;
        const amountHT = (amountTTC / 1.20).toFixed(2);
 
        const doc = new PDFDocument({
            size: 'A4',
            margins: {
                top: 50,
                bottom: 50,
                left: 72,
                right: 72
            }
        });
 
        res.setHeader('Content-Disposition', `attachment; filename=facture_${invoice.id}.pdf`);
        res.setHeader('Content-Type', 'application/pdf');
        doc.pipe(res);
 
        doc
            .image(path.join(__dirname, 'assets', 'logo.png'), 50, 45, { width: 100 }) 
            .fontSize(20)
            .font('Helvetica-Bold')
            .text('ArchiCloud', 200, 50, { align: 'right' })
            .fontSize(10)
            .text('456 Avenue des Champs-Élysées', 200, 75, { align: 'right' })
            .text('75008 Paris, France', 200, 90, { align: 'right' })
            .text('Téléphone : +33 1 23 45 67 89', 200, 105, { align: 'right' })
            .text('Email : contact@archicloud.com', 200, 120, { align: 'right' })
            .text('SIRET : 123 456 789 00010', 200, 135, { align: 'right' });
 
        doc.moveTo(50, 150).lineTo(550, 150).stroke();
 
        doc
            .fontSize(16)
            .text('Facture', 50, 170, { align: 'center' })
            .moveDown(1.5);

        doc
            .fontSize(12)
            .font('Helvetica-Bold')
            .text('Informations du Client', 50, 220)
            .font('Helvetica')
            .text(`Nom: ${user.Nom} ${user.Prenom}`, { indent: 20 })
            .text(`Email: ${user.Email}`, { indent: 20 })
            .text(`Adresse: ${user.Adresse}`, { indent: 20 })
            .moveDown(1.5);

        doc
            .font('Helvetica-Bold')
            .text('Détails de la Facture', 50)
            .font('Helvetica')
            .text(`Numéro de Facture: ${invoice.id}`, { indent: 20 })
            .text(`Date: ${invoice.date.toISOString().split('T')[0]}`, { indent: 20 })
            .text(`Statut: ${invoice.status}`, { indent: 20 })
            .moveDown(1.5);
 
        doc
            .font('Helvetica-Bold')
            .text('Montant de la Facture', 50)
            .font('Helvetica')
            .text(`Montant HT: ${amountHT} €`, { indent: 20 })
            .text(`Montant TTC: ${amountTTC.toFixed(2)} €`, { indent: 20 })
            .text(`Description: ${invoice.description}`, { indent: 20 })
            .moveDown(1.5);

        if (invoice.companyName) {
            doc.text(`Nom de la Compagnie: ${invoice.companyName}`, { indent: 20 });
        }
        if (invoice.siret) {
            doc.text(`SIRET: ${invoice.siret}`, { indent: 20 });
        }
        if (invoice.vatNumber) {
            doc.text(`Numéro de TVA: ${invoice.vatNumber}`, { indent: 20 });
        }
 
        doc
            .moveDown(2)
            .fontSize(10)
            .text('Merci pour votre achat.', { align: 'center' })
            .text('Pour toute question concernant cette facture, veuillez nous contacter à l\'adresse ci-dessus.', { align: 'center' });
 
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



