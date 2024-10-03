import React, { useState, useEffect } from 'react';
import axios from 'axios';
import '../assets/css/Invoices.css'; // Assurez-vous que le fichier CSS est bien importé

const Invoices = () => {
    // États pour gérer les factures, le chargement, les erreurs et le succès
    const [invoices, setInvoices] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [successMessage, setSuccessMessage] = useState(''); // Nouveau état pour le message de succès

    // Utiliser useEffect pour récupérer les factures une seule fois au chargement du composant
    useEffect(() => {
        const fetchInvoices = async () => {
            try {
                const token = localStorage.getItem('token');
                if (!token) {
                    throw new Error("Vous devez être connecté pour voir vos factures.");
                }

                // Appel à l'API pour récupérer les factures de l'utilisateur
                const response = await axios.get('http://localhost:5000/api/user-invoices', {
                    headers: {
                        Authorization: `Bearer ${token}`
                    }
                });
                setInvoices(response.data);
            } catch (err) {
                setError('Erreur lors de la récupération des factures.');
            } finally {
                setLoading(false);
            }
        };
        fetchInvoices();
    }, []);

    // Fonction pour gérer le téléchargement d'une facture
    const handleDownloadInvoice = async (invoiceId) => {
        const token = localStorage.getItem('token');
        try {
            if (!invoiceId) {
                console.error("Erreur: invoiceId est undefined ou null.");
                alert("Impossible de télécharger la facture. ID de facture manquant.");
                return;
            }

            // Envoi de la requête POST à '/api/download-invoice' avec l'ID de la facture dans le corps de la requête
            const response = await axios.post(
                'http://localhost:5000/api/download-invoice',
                JSON.stringify({ invoiceId }), // Le corps de la requête contient l'ID de la facture
                {
                    headers: {
                        Authorization: `Bearer ${token}`,
                        'Content-Type': 'application/json', // Spécifiez le type de contenu pour le backend
                    },
                    responseType: 'blob', // Pour indiquer que la réponse est un fichier PDF
                }
            );

            // Créer un lien pour télécharger le fichier
            const url = window.URL.createObjectURL(new Blob([response.data]));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', `facture_${invoiceId}.pdf`); // Nom du fichier téléchargé
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link); // Nettoyage du DOM

            // Afficher un message de succès après le téléchargement
            setSuccessMessage('Facture téléchargée avec succès !');
            
            // Masquer le message de succès après 5 secondes
            setTimeout(() => {
                setSuccessMessage('');
            }, 5000);

        } catch (err) {
            console.error('Erreur lors du téléchargement de la facture', err);
            alert('Erreur lors du téléchargement de la facture.');
        }
    };

    // Affichage pendant le chargement
    if (loading) {
        return <p>Chargement des factures...</p>;
    }

    // Affichage en cas d'erreur
    if (error) {
        return <p>{error}</p>;
    }

    // Rendu du composant
    return (
        <div>
            <h2>Vos Factures</h2>
            {successMessage && <p className="success-message">{successMessage}</p>} {/* Affichage du message de succès */}
            <ul>
                {invoices.length === 0 ? (
                    <p>Aucune facture disponible.</p>
                ) : (
                    invoices.map((invoice, index) => {
                        return (
                            <li key={invoice.id || `${invoice.clientName}-${invoice.purchaseDate}-${index}`}>
                                <strong>Client :</strong> {invoice.clientName} - 
                                <strong> Montant :</strong> {invoice.priceTTC} - 
                                <strong> Date :</strong> {invoice.purchaseDate} - 
                                <strong> Description :</strong> {invoice.description}
                                <button onClick={() => handleDownloadInvoice(invoice.id)}>Télécharger la facture</button>
                            </li>
                        );
                    })
                )}
            </ul>
        </div>
    );
};

export default Invoices;
