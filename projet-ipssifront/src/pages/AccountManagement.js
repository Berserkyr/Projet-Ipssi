import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import '../assets/css/AccountManagement.css';  // Fichier CSS
import StorageStats from '../components/StorageStats';

const AccountManagement = () => {
    const [user, setUser] = useState(null);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const navigate = useNavigate();

    // Charger les informations utilisateur
    useEffect(() => {
        const fetchUserData = async () => {
            try {
                const response = await axios.get('http://localhost:5000/api/user', {
                    headers: {
                        Authorization: `Bearer ${localStorage.getItem('token')}`,
                    },
                });
                setUser(response.data);
            } catch (err) {
                setError('Erreur lors du chargement des informations utilisateur.');
            }
        };

        fetchUserData();
    }, []);

    // Fonction pour supprimer le compte utilisateur
    const handleDeleteAccount = async () => {
        const confirmDelete = window.confirm("Êtes-vous sûr de vouloir supprimer votre compte ?");
        if (!confirmDelete) return;

        try {
            await axios.delete('http://localhost:5000/api/user', {
                headers: {
                    Authorization: `Bearer ${localStorage.getItem('token')}`,
                },
            });
            setSuccess('Votre compte a été supprimé.');
            localStorage.removeItem('token');
            navigate('/');  // Redirection après suppression du compte
        } catch (err) {
            setError('Erreur lors de la suppression de votre compte.');
        }
    };
    

    return (
        <div className="account-management">
            <h2>Gestion de votre compte</h2>
            {error && <p className="error">{error}</p>}
            {success && <p className="success">{success}</p>}
            
            {user ? (
                <div className="user-info">
                    <p><strong>Nom :</strong> {user.Nom}</p>
                    <p><strong>Prénom :</strong> {user.Prenom}</p>
                    <p><strong>Email :</strong> {user.Email}</p>
                    <p><strong>Adresse :</strong> {user.Adresse}</p>
                    <p><strong>Ville :</strong> {user.Ville}</p>
                                        {/* Ajouter les statistiques de stockage */}
                                        <StorageStats />
                </div>
            ) : (
                <p>Chargement des informations...</p>
            )}

            <button className="delete-btn" onClick={handleDeleteAccount}>
                Supprimer mon compte
            </button>
        </div>
    );
};

export default AccountManagement;
