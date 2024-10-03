const User = require('../models/User');
const File = require('../models/File');
const Invoice = require('../models/invoices');

const fs = require('fs');
const path = require('path');

// =================================
// 1. Récupérer les statistiques générales (nombre d'utilisateurs, fichiers, etc.)
// =================================
exports.getStats = async (req, res) => {
    try {
        const totalUsers = await User.count();  // Compter le nombre total d'utilisateurs
        const totalFiles = await File.count();  // Compter le nombre total de fichiers uploadés
        const filesPerUser = await File.findAll({
            attributes: ['ID_Utilisateur', [sequelize.fn('COUNT', sequelize.col('ID_Fichier')), 'totalFiles']],
            group: ['ID_Utilisateur'],
        });  // Récupérer la répartition des fichiers par utilisateur

        res.status(200).json({ 
            totalUsers, 
            totalFiles, 
            filesPerUser 
        });
    } catch (error) {
        console.error('Erreur lors de la récupération des statistiques', error);
        res.status(500).json({ message: 'Erreur lors de la récupération des statistiques.' });
    }
};

// =================================
// 2. Récupérer la liste des utilisateurs
// =================================
exports.getUsers = async (req, res) => {
    try {
        const users = await User.findAll({
            include: [{
                model: File,
                attributes: ['Taille']  // Inclure les fichiers associés avec leur taille
            }]
        });

        res.status(200).json(users);
    } catch (error) {
        console.error('Erreur lors de la récupération des utilisateurs', error);
        res.status(500).json({ message: 'Erreur lors de la récupération des utilisateurs.' });
    }
};

// =================================
// 3. Supprimer un utilisateur et ses fichiers associés
// =================================
exports.deleteUser = async (req, res) => {
    const { userId } = req.params;

    try {
        const user = await User.findByPk(userId);
        if (!user) {
            return res.status(404).json({ message: 'Utilisateur non trouvé' });
        }

        // Supprimer les fichiers associés à cet utilisateur
        const files = await File.findAll({ where: { ID_Utilisateur: userId } });
        for (const file of files) {
            const filePath = path.join(__dirname, '../uploads', file.Nom_fichier);
            if (fs.existsSync(filePath)) {
                fs.unlinkSync(filePath);  // Supprimer physiquement le fichier
            }
            await file.destroy();  // Supprimer l'entrée du fichier dans la base de données
        }

        // Supprimer l'utilisateur
        await user.destroy();
        res.status(200).json({ message: 'Utilisateur et fichiers supprimés avec succès' });
    } catch (error) {
        console.error('Erreur lors de la suppression de l\'utilisateur', error);
        res.status(500).json({ message: 'Erreur lors de la suppression de l\'utilisateur.' });
    }
};

// =================================
// 4. Récupérer toutes les factures d'un utilisateur
// =================================
exports.getInvoicesByUser = (req, res) => {
    const { userId } = req.params;

    try {
        const userInvoices = invoices.filter(invoice => invoice.userId == userId);
        if (userInvoices.length === 0) {
            return res.status(404).json({ message: 'Aucune facture trouvée pour cet utilisateur.' });
        }
        res.status(200).json(userInvoices);
    } catch (error) {
        console.error('Erreur lors de la récupération des factures', error);
        res.status(500).json({ message: 'Erreur lors de la récupération des factures.' });
    }
};

// =================================
// 5. Générer une nouvelle facture pour un utilisateur (optionnel)
// =================================
exports.generateInvoice = (req, res) => {
    const { userId, amount, description } = req.body;
    
    try {
        const newInvoice = new Invoice(invoices.length + 1, userId, new Date(), amount, description);
        invoices.push(newInvoice);  // Ajouter la facture à la "base de données" simulée

        res.status(200).json({ message: 'Facture générée avec succès', invoice: newInvoice });
    } catch (error) {
        console.error('Erreur lors de la génération de la facture', error);
        res.status(500).json({ message: 'Erreur lors de la génération de la facture.' });
    }
};

// =================================
// 6. Changer le rôle d'un utilisateur (admin only)
// =================================
exports.changeUserRole = async (req, res) => {
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
        console.error('Erreur lors de la mise à jour du rôle', error);
        res.status(500).json({ message: 'Erreur lors de la mise à jour du rôle.', error });
    }
};

// =================================
// 7. Supprimer un utilisateur (admin only)
// =================================

exports.DeleteUser = async (req, res) => {
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
};

// =================================
// 8. Obtenir toutes les statistique (admin only)
// =================================
exports.getStats = async (req, res) => {
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
};