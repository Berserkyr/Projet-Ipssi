import React, { useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

const SignupPage = () => {
    const [Prenom, setPrenom] = useState('');  
    const [Nom, setNom] = useState('');        
    const [Adresse, setAdresse] = useState(''); 
    const [Email, setEmail] = useState('');
    const [Mot_de_passe, setMot_de_passe] = useState(''); 
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();
        console.log({
            Prenom,
            Nom,
            Adresse,
            Email,
            Mot_de_passe
        });  
    
        try {
            const response = await axios.post('http://localhost:5000/api/register', { 
                Prenom, 
                Nom, 
                Adresse, 
                Email, 
                Mot_de_passe 
            });
    
            // Vérifier le statut de la réponse
            if (response.status === 201) {  // Si le statut est 201 (inscription réussie)
                setSuccess('Inscription réussie, vous pouvez vous connecter.');
                setError('');
                // Rediriger vers la page de connexion après 2 secondes
                setTimeout(() => navigate('/login'), 2000);
            } else {
                setError('Erreur lors de l\'inscription.');
            }
        } catch (err) {
            // Use a more detailed error message
            const errorMessage = err.response?.data?.message || err.message || 'Erreur lors de l\'inscription.';
            console.log(errorMessage);  
            setError(errorMessage);
            setSuccess('');
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
                        value={Prenom} 
                        onChange={(e) => setPrenom(e.target.value)} 
                        required 
                    />
                </div>
                <div className="input-group">
                    <label>Nom :</label>
                    <input 
                        type="text" 
                        value={Nom} 
                        onChange={(e) => setNom(e.target.value)} 
                        required 
                    />
                </div>
                <div className="input-group">
                    <label>Adresse :</label>
                    <input 
                        type="text" 
                        value={Adresse} 
                        onChange={(e) => setAdresse(e.target.value)} 
                        required 
                    />
                </div>
                <div className="input-group">
                    <label>Email :</label>
                    <input 
                        type="email" 
                        value={Email} 
                        onChange={(e) => setEmail(e.target.value)} 
                        required 
                    />
                </div>
                <div className="input-group">
                    <label>Mot de passe :</label>
                    <input 
                        type="password" 
                        value={Mot_de_passe} 
                        onChange={(e) => setMot_de_passe(e.target.value)} 
                        required 
                    />
                </div>
                {error && <p style={{ color: 'red' }}>{error}</p>}
                {success && <p style={{ color: 'green' }}>{success}</p>}
                <button type="submit">S'inscrire</button>
            </form>
        </div>
    );
};

export default SignupPage;
