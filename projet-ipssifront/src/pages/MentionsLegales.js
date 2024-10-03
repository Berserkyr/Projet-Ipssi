import React from 'react';
import '../assets/css/MentionsLegales.css';

const MentionsLegales = () => {
    return (
        <div className="mentions-legales">
            <h1>Mentions légales</h1>

            <section>
                <h2>Éditeur du site</h2>
                <p>
                    <strong>Nom de l'entreprise :</strong> ArchiCloud<br />
                    <strong>Adresse :</strong> 456 Avenue des Champs-Élysées, Paris<br />
                    <strong>Téléphone :</strong> +33 1 23 45 67 89<br />
                    <strong>Email :</strong> contact@archicloud.com<br />
                    <strong>SIRET :</strong> 123 456 789 00010
                </p>
            </section>

            <section>
                <h2>Hébergement</h2>
                <p>
                    <strong>Hébergeur :</strong> OVH SAS<br />
                    <strong>Adresse :</strong> 2 rue Kellermann, 59100 Roubaix, France<br />
                    <strong>Téléphone :</strong> +33 9 72 10 10 07
                </p>
            </section>

            <section>
                <h2>Propriété intellectuelle</h2>
                <p>
                    Tous les contenus présents sur ce site, incluant, de façon non limitative, les graphismes, images, textes, vidéos, animations, sons, logos, gifs et icônes ainsi que leur mise en forme sont la propriété exclusive de ArchiCloud, à l'exception des marques, logos ou contenus appartenant à d'autres sociétés partenaires ou auteurs.
                </p>
            </section>

            <section>
                <h2>Données personnelles</h2>
                <p>
                    Les informations recueillies sur ce site sont enregistrées dans un fichier informatisé par ArchiCloud pour la gestion des utilisateurs. Elles sont conservées pendant une durée de 3 ans et sont destinées à l’équipe de ArchiCloud.
                    <br />
                    Conformément à la loi « informatique et libertés », vous pouvez exercer votre droit d'accès aux données vous concernant et les faire rectifier en contactant : <strong>contact@archicloud.com</strong>
                </p>
            </section>

            <section>
                <h2>Conditions d’utilisation</h2>
                <p>
                    L’utilisation de ce site implique l’acceptation pleine et entière des conditions générales d’utilisation ci-après décrites. Ces conditions d’utilisation sont susceptibles d’être modifiées ou complétées à tout moment.
                </p>
            </section>

            <section>
                <h2>Limitation de responsabilité</h2>
                <p>
                    ArchiCloud ne pourra être tenue responsable des dommages directs et indirects causés au matériel de l’utilisateur, lors de l’accès au site <strong>archicloud.com</strong>.
                </p>
            </section>

            <section>
                <h2>Litiges</h2>
                <p>
                    Les présentes conditions du site <strong>archicloud.com</strong> sont régies par les lois françaises. En cas de litige, et à défaut d'accord amiable, les tribunaux français seront seuls compétents.
                </p>
            </section>
        </div>
    );
};

export default MentionsLegales;
