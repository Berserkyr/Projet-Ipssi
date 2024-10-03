import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Route, Routes, Navigate } from 'react-router-dom';
import Header from './components/Header';
import Footer from './components/Footer';
<<<<<<< HEAD
import UserDashboard from './pages/UserDashboard';  // Import du Dashboard
import LoginPage from './pages/LoginPage';  // Import de la page de connexion
import SignupPage from './pages/SignupPage';  // Import de la page d'inscription
import AccountManagement from './pages/AccountManagement';  // Import de la page de gestion du compte
import MentionsLegales from './pages/MentionsLegales';  // Importez la page Mentions légales
import SettingsPage from './pages/SettingsPage';  // Assurez-vous que le chemin est correct
import OTPVerificationPage from './pages/OTPVerificationPage';  // Import the OTP verification page
=======
import UserDashboard from './pages/UserDashboard';
import LoginPage from './pages/LoginPage';
import SignupPage from './pages/SignupPage';
import AccountManagement from './pages/AccountManagement';
import MentionsLegales from './pages/MentionsLegales';
import SettingsPage from './pages/SettingsPage';
import AdminPage from './pages/AdminPage';
import Contact from './pages/Contact';  // Import de la page de contact
import Aide from './pages/Aide';  // Import de la page d'aide
>>>>>>> main

const App = () => {
    // État pour suivre l'authentification de l'utilisateur
    const [isAuthenticated, setIsAuthenticated] = useState(!!localStorage.getItem('token'));
<<<<<<< HEAD
    const [isOTPVerified, setIsOTPVerified] = useState(false);  // New state for OTP verification

    // Fonction pour gérer la déconnexion
    const handleLogout = () => {
        localStorage.removeItem('token');  // Supprimer le token
        setIsAuthenticated(false);  // Mettre à jour l'état d'authentification
        setIsOTPVerified(false);  // Reset OTP verification state
        window.location.href = '/login';  // Rediriger vers la page de connexion
=======
    // État pour suivre le rôle de l'utilisateur (utilisateur standard ou administrateur)
    const [userRole, setUserRole] = useState(localStorage.getItem('role'));

    // Fonction pour gérer la déconnexion
    const handleLogout = () => {
        localStorage.removeItem('token');
        localStorage.removeItem('role');
        setIsAuthenticated(false);
        setUserRole(null);
        window.location.href = '/login';
>>>>>>> main
    };

    // Utilisation de useEffect pour vérifier l'authentification à chaque chargement de composant
    useEffect(() => {
        const token = localStorage.getItem('token');
        const role = localStorage.getItem('role');
        setIsAuthenticated(!!token);
        setUserRole(role);
    }, []);

    return (
        <Router>
            <div className="app">
                <Header onLogout={handleLogout} />
                <Routes>
                    {/* Route pour la page de connexion */}
<<<<<<< HEAD
                    <Route path="/login" element={isAuthenticated ? <Navigate to={isOTPVerified ? "/dashboard" : "/verify-otp"} /> : <LoginPage setIsAuthenticated={setIsAuthenticated} />} />

                    {/* Route pour la page d'inscription */}
                    <Route path="/signup" element={isAuthenticated ? <Navigate to={isOTPVerified ? "/dashboard" : "/verify-otp"} /> : <SignupPage />} />

                    {/* Route pour le Dashboard, accessible seulement si l'utilisateur est authentifié et OTP vérifié */}
                    <Route path="/dashboard" element={isAuthenticated && isOTPVerified ? <UserDashboard /> : <Navigate to="/login" />} />

                    {/* Route pour la gestion du compte, accessible seulement si l'utilisateur est authentifié et OTP vérifié */}
                    <Route path="/account" element={isAuthenticated && isOTPVerified ? <AccountManagement /> : <Navigate to="/login" />} />
=======
                    <Route 
                        path="/login" 
                        element={isAuthenticated ? <Navigate to={userRole === 'admin' ? '/admin' : '/dashboard'} /> : <LoginPage setIsAuthenticated={setIsAuthenticated} />}
                    />

                    {/* Route pour la page d'inscription */}
                    <Route 
                        path="/signup" 
                        element={isAuthenticated ? <Navigate to={userRole === 'admin' ? '/admin' : '/dashboard'} /> : <SignupPage />}
                    />

                    {/* Route pour le Dashboard utilisateur standard */}
                    <Route 
                        path="/dashboard" 
                        element={isAuthenticated && userRole !== 'admin' ? <UserDashboard /> : <Navigate to="/login" />}
                    />

                    {/* Route pour la page d'administration */}
                    <Route 
                        path="/admin" 
                        element={isAuthenticated && userRole === 'admin' ? <AdminPage /> : <Navigate to="/login" />}
                    />

                    {/* Route pour la gestion du compte */}
                    <Route 
                        path="/account" 
                        element={isAuthenticated ? <AccountManagement /> : <Navigate to="/login" />}
                    />
>>>>>>> main

                    {/* Route pour les mentions légales */}
                    <Route 
                        path="/mentions-legales" 
                        element={<MentionsLegales />}
                    />

                    {/* Route pour les paramètres */}
                    <Route 
                        path="/settings" 
                        element={isAuthenticated ? <SettingsPage /> : <Navigate to="/login" />}
                    />

<<<<<<< HEAD
                    {/* Route pour la vérification OTP */}
                    <Route path="/verify-otp" element={isAuthenticated && !isOTPVerified ? <OTPVerificationPage setIsOTPVerified={setIsOTPVerified} /> : <Navigate to="/dashboard" />} />
                    <Route path="/verify-otp" element={<OTPVerificationPage />} />
                    {/* Redirection de la route "/" vers le Dashboard si l'utilisateur est authentifié et OTP vérifié, sinon vers /login */}
                    <Route path="/" element={isAuthenticated ? (isOTPVerified ? <Navigate to="/dashboard" /> : <Navigate to="/verify-otp" />) : <Navigate to="/login" />} />
=======
                    {/* Route pour la page de contact */}
                    <Route 
                        path="/contact" 
                        element={<Contact />}
                    />

                    {/* Route pour la page d'aide */}
                    <Route 
                        path="/aide" 
                        element={<Aide />}
                    />

                    {/* Redirection par défaut selon le rôle de l'utilisateur */}
                    <Route 
                        path="/" 
                        element={isAuthenticated ? <Navigate to={userRole === 'admin' ? '/admin' : '/dashboard'} /> : <Navigate to="/login" />}
                    />
>>>>>>> main
                </Routes>
                <Footer />
            </div>
        </Router>
    );
};

export default App;
