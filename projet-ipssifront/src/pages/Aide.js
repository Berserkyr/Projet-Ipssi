import React from 'react';
import '../assets/css/Aide.css';

const Aide = () => {
    return (
        <div className="aide-page">
            <h1>Aide et Assistance</h1>

            <section className="faq-section">
                <h2>Questions Fréquentes</h2>

                <div className="faq-item">
                    <h3>Comment puis-je créer un compte ArchiCloud ?</h3>
                    <p>Pour créer un compte, cliquez sur le bouton "Inscription" en haut de la page d'accueil et suivez les instructions.</p>
                </div>

                <div className="faq-item">
                    <h3>Comment récupérer mon mot de passe ?</h3>
                    <p>Cliquez sur "Mot de passe oublié" sur la page de connexion et suivez les étapes pour le réinitialiser.</p>
                </div>

                <div className="faq-item">
                    <h3>Comment puis-je contacter le support technique ?</h3>
                    <p>Vous pouvez nous contacter via le formulaire sur la page Contact.</p>
                </div>
            </section>

            <section className="more-help">
                <h2>Besoin de plus d'aide ?</h2>
                <p>Si vous ne trouvez pas de réponse à votre question, n'hésitez pas à <a href="/contact">nous contacter</a>.</p>
            </section>
        </div>
    );
};

export default Aide;
