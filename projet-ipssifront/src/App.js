import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Route, Routes, Navigate } from 'react-router-dom';
import Header from './components/Header';
import Footer from './components/Footer';
import UserDashboard from './pages/UserDashboard';  // Import du Dashboard
import LoginPage from './pages/LoginPage';  // Import de la page de connexion
import SignupPage from './pages/SignupPage';  // Import de la page d'inscription
import AccountManagement from './pages/AccountManagement';  // Import de la page de gestion du compte
import MentionsLegales from './pages/MentionsLegales';  // Importez la page Mentions légales
import SettingsPage from './pages/SettingsPage';  // Assurez-vous que le chemin est correct
import OTPVerificationPage from './pages/OTPVerificationPage';  // Import the OTP verification page

const App = () => {
    const [isAuthenticated, setIsAuthenticated] = useState(!!localStorage.getItem('token'));
    const [isOTPVerified, setIsOTPVerified] = useState(false);  // New state for OTP verification

    // Fonction pour gérer la déconnexion
    const handleLogout = () => {
        localStorage.removeItem('token');  // Supprimer le token
        setIsAuthenticated(false);  // Mettre à jour l'état d'authentification
        setIsOTPVerified(false);  // Reset OTP verification state
        window.location.href = '/login';  // Rediriger vers la page de connexion
    };

    useEffect(() => {
        const token = localStorage.getItem('token');
        setIsAuthenticated(!!token);  // Met à jour l'état en fonction du token
    }, []);

    return (
        <Router>
            <div className="app">
                <Header onLogout={handleLogout} /> {/* On passe la fonction de déconnexion au Header */}
                <Routes>
                    {/* Route pour la page de connexion */}
                    <Route path="/login" element={isAuthenticated ? <Navigate to={isOTPVerified ? "/dashboard" : "/verify-otp"} /> : <LoginPage setIsAuthenticated={setIsAuthenticated} />} />

                    {/* Route pour la page d'inscription */}
                    <Route path="/signup" element={isAuthenticated ? <Navigate to={isOTPVerified ? "/dashboard" : "/verify-otp"} /> : <SignupPage />} />

                    {/* Route pour le Dashboard, accessible seulement si l'utilisateur est authentifié et OTP vérifié */}
                    <Route path="/dashboard" element={isAuthenticated && isOTPVerified ? <UserDashboard /> : <Navigate to="/login" />} />

                    {/* Route pour la gestion du compte, accessible seulement si l'utilisateur est authentifié et OTP vérifié */}
                    <Route path="/account" element={isAuthenticated && isOTPVerified ? <AccountManagement /> : <Navigate to="/login" />} />

                    {/* Route pour les mentions légales */}
                    <Route path="/mentions-legales" element={<MentionsLegales />} />

                    <Route path="/settings" element={<SettingsPage />} /> {/* Associez SettingsPage à la route */}

                    {/* Route pour la vérification OTP */}
                    <Route path="/verify-otp" element={isAuthenticated && !isOTPVerified ? <OTPVerificationPage setIsOTPVerified={setIsOTPVerified} /> : <Navigate to="/dashboard" />} />
                    <Route path="/verify-otp" element={<OTPVerificationPage />} />
                    {/* Redirection de la route "/" vers le Dashboard si l'utilisateur est authentifié et OTP vérifié, sinon vers /login */}
                    <Route path="/" element={isAuthenticated ? (isOTPVerified ? <Navigate to="/dashboard" /> : <Navigate to="/verify-otp" />) : <Navigate to="/login" />} />
                </Routes>
                <Footer />
            </div>
        </Router>
    );
};

export default App;
