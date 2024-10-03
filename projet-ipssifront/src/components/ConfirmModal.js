import React from 'react';
import '../assets/css/ConfirmModal.css';

const ConfirmModal = ({ show, onConfirm, onCancel }) => {
    if (!show) return null; // Si show est faux, ne pas afficher la modal

    return (
        <div className="modal-backdrop" aria-modal="true" role="dialog" aria-labelledby="modal-title">
            <div className="modal">
                <h3 id="modal-title">Confirmation de Suppression</h3>
                <p>Es-tu sûr de vouloir supprimer ce fichier ? Cette action est irréversible.</p>
                <div className="modal-actions">
                    <button className="confirm-btn" onClick={onConfirm}>Oui, Supprimer</button>
                    <button className="cancel-btn" onClick={onCancel}>Annuler</button>
                </div>
            </div>
        </div>
    );
};

export default ConfirmModal;
