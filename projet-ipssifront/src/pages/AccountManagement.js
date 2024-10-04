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


    const handleDeleteAccount = async () => {
        const confirmDelete = window.confirm("Êtes-vous sûr de vouloir supprimer votre compte ?");
        if (!confirmDelete) return;

        try {
            await axios.delete('http://localhost:5000/api/delete-account', {
                headers: {
                    Authorization: `Bearer ${localStorage.getItem('token')}`,
                },
            });
            setSuccess('Votre compte a été supprimé.');
            localStorage.removeItem('token');
            window.location.reload();
        } catch (err) {
            setError('Erreur lors de la suppression de votre compte.');
        }
    };

    return (
        <div className="account-management">
            <h2>Gestion de votre compte</h2>
            {error && <p className="error">{error}</p>}
            {success && <p className="success">{success}</p>}
            <button className="delete-btn" onClick={handleDeleteAccount}>
                Supprimer mon compte
            </button>
        </div>
    );
};

export default AccountManagement;
