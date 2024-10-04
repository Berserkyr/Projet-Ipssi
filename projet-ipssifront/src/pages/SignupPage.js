import React, { useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

const SignupPage = () => {
    const [firstName, setFirstName] = useState('');
    const [lastName, setLastName] = useState('');
    const [address, setAddress] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [isProcessing, setIsProcessing] = useState(false);  // Pour le traitement en cours
    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsProcessing(true);
        try {
            const response = await axios.post('http://localhost:5000/api/register', {
                firstName,
                lastName,
                address,
                email,
                password
            });

            // Si le paiement PayPal est initié, rediriger l'utilisateur
            if (response.data.redirectUrl) {
                window.location.href = response.data.redirectUrl;
            } else {
                setError('Erreur lors de la redirection vers PayPal.');
                setIsProcessing(false);
            }
        } catch (err) {
            setError(err.response?.data?.message || 'Erreur lors de l\'inscription.');
            setSuccess('');
            setIsProcessing(false);
        }
    };

    return (
        <div className="auth-page">
            <h2>Créer un compte</h2>
            <form onSubmit={handleSubmit}>
                <div className="input-group">
                    <label>Prénom :</label>
                    <input 
                        type="text" 
                        value={firstName} 
                        onChange={(e) => setFirstName(e.target.value)} 
                        required 
                    />
                </div>
                <div className="input-group">
                    <label>Nom :</label>
                    <input 
                        type="text" 
                        value={lastName} 
                        onChange={(e) => setLastName(e.target.value)} 
                        required 
                    />
                </div>
                <div className="input-group">
                    <label>Adresse :</label>
                    <input 
                        type="text" 
                        value={address} 
                        onChange={(e) => setAddress(e.target.value)} 
                        required 
                    />
                </div>
                <div className="input-group">
                    <label>Email :</label>
                    <input 
                        type="email" 
                        value={email} 
                        onChange={(e) => setEmail(e.target.value)} 
                        required 
                    />
                </div>
                <div className="input-group">
                    <label>Mot de passe :</label>
                    <input 
                        type="password" 
                        value={password} 
                        onChange={(e) => setPassword(e.target.value)} 
                        required 
                    />
                </div>
                {error && <p style={{ color: 'red' }}>{error}</p>}
                {isProcessing ? (
                    <button disabled>Traitement...</button>
                ) : (
                    <button type="submit">S'inscrire et payer</button>
                )}
            </form>
        </div>
    );
};

export default SignupPage;
