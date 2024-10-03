// SubscriptionAlert.js
import React from 'react';
import { toast, ToastContainer } from 'react-toastify'; // Optionnel pour `react-toastify`
import 'react-toastify/dist/ReactToastify.css';
import { Modal, Button } from 'react-bootstrap';
import 'bootstrap/dist/css/bootstrap.min.css';

const SubscriptionAlert = ({ type = "toast" }) => {
    const showToastNotification = () => {
        toast.warn('Vous devez souscrire à un abonnement pour accéder à ce service.', {
            position: "top-right",
            autoClose: 5000,
            hideProgressBar: false,
            closeOnClick: true,
            pauseOnHover: true,
            draggable: true,
        });
    };

    const showModalNotification = () => {
        setShowModal(true);
    };

    const handleSubscribe = () => {
        // Rediriger vers une page de souscription
        window.location.href = "/subscribe";
    };

    const handleClose = () => {
        setShowModal(false);
    };

    const [showModal, setShowModal] = React.useState(false);

    React.useEffect(() => {
        // Vérifiez ici si l'utilisateur a un abonnement ou non
        const isSubscribed = false; // Simulé pour l'exemple
        if (!isSubscribed) {
            if (type === "toast") {
                showToastNotification();
            } else if (type === "modal") {
                showModalNotification();
            }
        }
    }, [type]);

    return (
        <>
            {type === "toast" && <ToastContainer />}
            {type === "modal" && (
                <Modal show={showModal} onHide={handleClose} backdrop="static" keyboard={false}>
                    <Modal.Header closeButton>
                        <Modal.Title>Souscrire à un abonnement</Modal.Title>
                    </Modal.Header>
                    <Modal.Body>
                        Pour accéder à ce service, vous devez souscrire à un abonnement. Veuillez choisir un plan qui correspond à vos besoins.
                    </Modal.Body>
                    <Modal.Footer>
                        <Button variant="secondary" onClick={handleClose}>
                            Plus tard
                        </Button>
                        <Button variant="primary" onClick={handleSubscribe}>
                            Souscrire maintenant
                        </Button>
                    </Modal.Footer>
                </Modal>
            )}
        </>
    );
};

export default SubscriptionAlert;
