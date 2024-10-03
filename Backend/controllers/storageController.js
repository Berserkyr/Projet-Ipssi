const fs = require('fs');
const path = require('path');

// Fonction récursive pour calculer la taille totale d'un répertoire (inclut les sous-dossiers)
const calculateFolderSize = (folderPath) => {
    let totalSize = 0;

    // Lire le contenu du répertoire
    const files = fs.readdirSync(folderPath);

    files.forEach(file => {
        const filePath = path.join(folderPath, file);
        const stats = fs.statSync(filePath);

        if (stats.isDirectory()) {
            // Appel récursif si c'est un dossier
            totalSize += calculateFolderSize(filePath);
        } else if (stats.isFile()) {
            // Ajouter la taille si c'est un fichier
            totalSize += stats.size;
        }
    });

    return totalSize;
};

// Fonction pour calculer l'usage du stockage
exports.getStorageUsage = (req, res) => {
    try {
        const userId = req.userId; // Récupérer l'ID de l'utilisateur (vérifier si c'est défini correctement par un middleware)
        const storagePath = path.join(__dirname, '../uploads', String(userId));  // Répertoire de stockage pour cet utilisateur

        // Vérifier si le répertoire existe
        if (!fs.existsSync(storagePath)) {
            return res.status(200).json({ usage: 0 }); // Si le répertoire n'existe pas, retourner 0
        }

        // Calculer la taille totale du répertoire
        const totalSize = calculateFolderSize(storagePath);

        // Convertir la taille totale en Mo
        const usageInMB = totalSize / (1024 * 1024);
        res.status(200).json({
            usage: usageInMB.toFixed(2) // Retourner l'usage total en Mo
        });
    } catch (error) {
        console.error('Erreur lors de la récupération de l\'usage du stockage:', error);
        res.status(500).json({ message: 'Erreur lors de la récupération de l\'usage du stockage' });
    }
};
