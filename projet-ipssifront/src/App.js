import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Route, Routes, Navigate } from 'react-router-dom';
import Header from './components/Header';
import Footer from './components/Footer';
import UserDashboard from './pages/UserDashboard';
import LoginPage from './pages/LoginPage';
import SignupPage from './pages/SignupPage';
import AccountManagement from './pages/AccountManagement';
import MentionsLegales from './pages/MentionsLegales';
import SettingsPage from './pages/SettingsPage';
import AdminPage from './pages/AdminPage';
import Contact from './pages/Contact';  // Import de la page de contact
import Aide from './pages/Aide';  // Import de la page d'aide

const App = () => {
    // État pour suivre l'authentification de l'utilisateur
    const [isAuthenticated, setIsAuthenticated] = useState(!!localStorage.getItem('token'));
    // État pour suivre le rôle de l'utilisateur (utilisateur standard ou administrateur)
    const [userRole, setUserRole] = useState(localStorage.getItem('role'));

    // Fonction pour gérer la déconnexion
    const handleLogout = () => {
        localStorage.removeItem('token');
        localStorage.removeItem('role');
        setIsAuthenticated(false);
        setUserRole(null);
        window.location.href = '/login';
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
                </Routes>
                <Footer />
            </div>
        </Router>
    );
};

export default App;
