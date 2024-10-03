// Importation des modules nécessaires
const File = require('../models/File');  // Modèle Sequelize pour les fichiers
const fs = require('fs');  // Module pour la gestion des fichiers
const path = require('path');  // Module pour les chemins de fichiers

// ===============================
// 1. Fonction pour uploader un fichier
// ===============================
exports.uploadFile = async (req, res) => {
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
    };
    
    
// ===============================
// 2. Récupérer tous les fichiers pour un utilisateur (avec informations complètes)
// ===============================
exports.getFiles = async (req, res) => {
    const { userId } = req.params;  // Récupérer l'ID de l'utilisateur à partir des paramètres de la requête

    try {
        // Log de l'ID utilisateur reçu
        console.log(`Récupération des fichiers pour l'utilisateur avec ID : ${userId}`);

        // Utiliser Sequelize pour récupérer les fichiers associés à cet utilisateur
        const userFiles = await File.findAll({ where: { ID_Utilisateur: userId } });

        // Log des fichiers récupérés avant tout traitement
        console.log(`Fichiers récupérés pour l'utilisateur ${userId}: `, userFiles);

        // Si aucun fichier n'est trouvé, renvoyer un message 404
        if (userFiles.length === 0) {
            console.log(`Aucun fichier trouvé pour l'utilisateur ${userId}`);
            return res.status(404).json({ message: "Aucun fichier trouvé pour cet utilisateur." });
        }
        console.log(file.ID_Fichier);  // Vérifiez que l'ID est bien défini

        // Construire la réponse avec les informations complètes pour chaque fichier
        const filesData = userFiles.map(file => {
            const fileData = {
                id: file.ID_Fichier,
                name: file.Nom_fichier,
                size: file.Taille,
                Date_upload: file.Date_upload,
                url: `http://localhost:5000/uploads/${file.Nom_fichier}`  // Assure-toi que c'est l'URL correcte
            };
            console.log(`Données du fichier traité: `, fileData);  // Log des données de chaque fichier après le traitement
            return fileData;
        });

        // Log des données finales envoyées au frontend
        console.log(`Données des fichiers envoyées au client :`, filesData);

        // Répondre avec la liste des fichiers et leurs informations
        res.status(200).json({ files: filesData });
    } catch (error) {
        // Log de l'erreur en cas de problème
        console.error('Erreur lors de la récupération des fichiers', error);
        res.status(500).json({ message: "Erreur lors de la récupération des fichiers." });
    }
};


// ===============================
// 3. Supprimer un fichier
// ===============================
exports.deleteFile = async (req, res) => {
    const { fileId } = req.params;  // Récupérer l'ID du fichier à partir des paramètres de la requête

    try {
        console.log(`Suppression du fichier avec ID : ${fileId}`);
        // Utiliser Sequelize pour trouver le fichier par son ID
        const file = await File.findByPk(fileId);

        // Si le fichier n'existe pas, renvoyer une erreur 404
        if (!file) {
            console.log('Fichier non trouvé:', fileId);
            return res.status(404).json({ message: "Fichier non trouvé." });
        }

        // Supprimer le fichier du système de fichiers
        const filePath = path.join(__dirname, '../uploads', file.Nom_fichier);
        console.log('Chemin du fichier à supprimer:', filePath)
        fs.unlink(filePath, (err) => {
            if (err) {
                console.error('Erreur lors de la suppression du fichier physique', err);
                return res.status(500).json({ message: 'Erreur lors de la suppression du fichier.' });
            }
            console.log('Fichier physique supprimé:', filePath);
        });

        // Supprimer le fichier de la base de données avec Sequelize
        await file.destroy();
        console.log('Fichier supprimé de la base de données:', fileId);

        // Répondre avec succès et renvoyer les informations sur le fichier supprimé
        res.status(200).json({ message: "Fichier supprimé avec succès", file: file });
    } catch (error) {
        console.error('Erreur lors de la suppression du fichier', error);
        res.status(500).json({ message: "Erreur lors de la suppression du fichier." });
    }
};
