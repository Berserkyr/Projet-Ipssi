import React, { useState, useEffect } from 'react';
import Files from '../components/FileList';  
import FileUpload from '../components/FileUpload';
import PurchaseStorage from '../components/PurchaseStorage';
import Invoices from '../components/Invoices';
import { CircularProgressbar, buildStyles } from 'react-circular-progressbar';
import 'react-circular-progressbar/dist/styles.css';
import '../assets/css/Dashboard.css';
import axios from 'axios';  // Import d'axios
import { filesize } from 'filesize'; // Assurez-vous d'utiliser les accolades

const UserDashboard = () => {
    const [activeTab, setActiveTab] = useState('files');
    const [usage, setUsage] = useState(0);  // Stockage utilisé en octets
    const [totalStorageInBytes, setTotalStorageInBytes] = useState(20 * 1024 * 1024 * 1024);  // Total de stockage en octets, initialisé à 20 Go par défaut

    // Fonction globale pour récupérer les données d'usage et de capacité de l'API
    const fetchUsageAndStorage = async () => {
        try {
            const response = await axios.get('http://localhost:5000/api/storage-usage', {
                headers: {
                    Authorization: `Bearer ${localStorage.getItem('token')}`,
                },
            });
            // Assurez-vous que l'API renvoie usage et totalStorageInBytes
            const { usage: usageInBytes, totalStorageInBytes: totalStorage } = response.data;
            setUsage(usageInBytes);  // Mettre à jour l'usage actuel
            setTotalStorageInBytes(totalStorage);  // Mettre à jour la capacité totale de stockage
        } catch (error) {
            console.error("Erreur lors de la récupération de l'usage du stockage", error);
        }
    };

    // Utilisation de useEffect pour récupérer les données d'usage lors du montage
    useEffect(() => {
        fetchUsageAndStorage();
    }, []);

    // Fonction qui est appelée après un upload réussi
    const handleUploadSuccess = () => {
        fetchUsageAndStorage(); // Mise à jour de l'usage après l'upload
    };

    // Fonction pour afficher le contenu de l'onglet actif
    const renderTabContent = () => {
        switch (activeTab) {
            case 'files':
                return <Files />;
            case 'upload':
                return <FileUpload onUploadSuccess={handleUploadSuccess} />;
            case 'subscription':
                return <PurchaseStorage />;
            case 'invoices':
                return <Invoices />;
            default:
                return <Files />;
        }
    };

    // Utilisation de `filesize` pour afficher les unités lisibles
    const options = {
        base: 2,  // Utilisation de la base binaire (2^10)
        round: 2,
        locale: 'fr', // Localisation française
        symbols: {
            B: 'o',
            KB: 'Ko',
            MB: 'Mo',
            GB: 'Go',
            TB: 'To'
        },
        standard: 'jedec'  // Utilisation de Go au lieu de GiB
    };

    // Calculer les valeurs à afficher
    const usageDisplay = filesize(usage, options); // Affichage lisible de l'usage
    const totalStorageDisplay = filesize(totalStorageInBytes, options);
    const remainingStorage = totalStorageInBytes - usage;
    const remainingStorageDisplay = filesize(remainingStorage, options);
    const percentage = (usage / totalStorageInBytes) * 100;

    // Assurer que le pourcentage reste entre 0 et 100%
    const percentageDisplay = Math.min(100, Math.max(0, percentage));

    return (
        <div className="dashboard">
            <h2>Tableau de bord</h2>

            {/* Onglets de navigation */}
            <nav className="dashboard-nav">
                <button className={activeTab === 'files' ? 'active' : ''} onClick={() => setActiveTab('files')}>Mes fichiers</button>
                <button className={activeTab === 'upload' ? 'active' : ''} onClick={() => setActiveTab('upload')}>Uploader</button>
                <button className={activeTab === 'subscription' ? 'active' : ''} onClick={() => setActiveTab('subscription')}>Acheter de l'espace</button>
                <button className={activeTab === 'invoices' ? 'active' : ''} onClick={() => setActiveTab('invoices')}>Mes factures</button>
            </nav>

            {/* Statistiques d'utilisation du stockage avec CircularProgressbar */}
            <div className="storage-stats">
                <h3>Espace de stockage utilisé</h3>
                <div style={{ width: '150px', margin: '0 auto' }}>
                    <CircularProgressbar
                        value={percentageDisplay}
                        text={`${percentageDisplay.toFixed(1)}%`}
                        styles={buildStyles({
                            textColor: '#000',
                            pathColor: '#4caf50',
                            trailColor: '#d6d6d6',
                        })}
                    />
                </div>
                <p>{usageDisplay} utilisés sur {totalStorageDisplay} disponibles</p>
                <p>Restant : {remainingStorageDisplay}</p>
            </div>

            {/* Contenu de l'onglet actif */}
            <div className="dashboard-content">
                {renderTabContent()}
            </div>
        </div>
    );
};

export default UserDashboard;
