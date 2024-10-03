import React from 'react';

const PurchaseStorage = () => {
    const handlePurchase = async () => {
        try {
            // Envoyer une requête au back-end pour commencer l'achat via PayPal
            const response = await fetch('http://localhost:5000/api/purchase-storage', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('token')}` // Utilisez le token JWT si nécessaire
                },
                body: JSON.stringify({})
            });

            // Vérifier si la requête est réussie
            if (response.ok) {
                const data = await response.json();
                if (data.redirectUrl) {
                    // Ouvrir l'URL PayPal dans un nouvel onglet
                    window.open(data.redirectUrl, '_blank');
                } else {
                    alert('Erreur: URL de redirection manquante.');
                }
            } else {
                alert('Erreur lors de la tentative d\'achat.');
            }
        } catch (error) {
            console.error('Erreur lors de la requête d\'achat:', error);
            alert('Une erreur est survenue lors de la connexion au serveur.');
        }
    };

    return (
        <div>
            <h2>Acheter de l'espace de stockage</h2>
            <p>Vous pouvez acheter 20 Go d'espace de stockage pour 20 €.</p>
            <button onClick={handlePurchase}>Acheter</button>
        </div>
    );
};

export default PurchaseStorage;
