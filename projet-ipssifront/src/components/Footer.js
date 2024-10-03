import React from 'react';
import { Link } from 'react-router-dom';
import '../assets/css/Footer.css';

const Footer = () => {
    return (
        <footer className="footer">
            {/* Conteneur des liens du footer */}
            <div className="footer-links">
                <Link to="/contact">Contact</Link>
                <Link to="/aide">Aide</Link>
                <Link to="/mentions-legales">Mentions Légales</Link>
            </div>

            {/* Texte de copyright */}
            <p>© {new Date().getFullYear()} ArchiCloud. Tous droits réservés.</p>
        </footer>
    );
};

export default Footer;
