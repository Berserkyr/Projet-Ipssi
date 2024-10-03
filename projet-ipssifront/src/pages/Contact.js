import React from 'react';
import '../assets/css/Contact.css';

const Contact = () => {
    return (
        <div className="contact-page">
            <h1>Contactez-nous</h1>
            
            <p>Vous avez des questions ou besoin d'assistance ? Remplissez le formulaire ci-dessous pour nous contacter.</p>
            
            <form className="contact-form">
                <label htmlFor="name">Nom</label>
                <input type="text" id="name" name="name" placeholder="Votre nom" required />

                <label htmlFor="email">Email</label>
                <input type="email" id="email" name="email" placeholder="Votre email" required />

                <label htmlFor="message">Message</label>
                <textarea id="message" name="message" rows="5" placeholder="Votre message" required></textarea>

                <button type="submit">Envoyer</button>
            </form>
        </div>
    );
};

export default Contact;
