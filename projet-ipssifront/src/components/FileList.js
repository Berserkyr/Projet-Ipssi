import React, { useState, useEffect } from 'react';
import axios from 'axios';
import ConfirmModal from './ConfirmModal'; // Importer la modal personnalisée
import '../assets/css/FileList.css';  // Import du fichier CSS

const FileList = () => {
    const [files, setFiles] = useState([]);
    const [error, setError] = useState('');
    const [page, setPage] = useState(1);  // Pagination - Page actuelle
    const [totalPages, setTotalPages] = useState(1);  // Nombre total de pages
    const [showModal, setShowModal] = useState(false); // État pour la modal de confirmation
    const [fileToDelete, setFileToDelete] = useState(null); // Stocker le fichier à supprimer

    // Fonction pour récupérer les fichiers
    useEffect(() => {
        const fetchFiles = async () => {
            try {
                const response = await axios.get(`http://localhost:5000/api/files?page=${page}`, {
                    headers: {
                        Authorization: `Bearer ${localStorage.getItem('token')}`
                    }
                });
                setFiles(response.data.files);
                setTotalPages(response.data.totalPages); // Nombre total de pages
            } catch (error) {
                if (error.response) {
                    setError(`Erreur : ${error.response.data.message}`);
                } else {
                    setError('Erreur lors du chargement des fichiers.');
                }
            }
        };

        fetchFiles();
    }, [page]);

    // Fonction pour gérer la suppression après confirmation
    const handleDelete = async () => {
        if (!fileToDelete) return;

        try {
            await axios.delete(`http://localhost:5000/api/files/${fileToDelete}`, {
                headers: {
                    Authorization: `Bearer ${localStorage.getItem('token')}`
                }
            });
            // Mise à jour locale de la liste des fichiers après suppression
            setFiles(files.filter(file => file.name !== fileToDelete));
            setShowModal(false); // Fermer la modal après suppression
            setFileToDelete(null);
        } catch (error) {
            setError('Erreur lors de la suppression du fichier.');
        }
    };

    // Fonction pour ouvrir la modal de confirmation de suppression
    const openConfirmModal = (fileName) => {
        setFileToDelete(fileName); // Définir le nom du fichier à supprimer
        setShowModal(true); // Ouvrir la modal
    };

    // Fonction pour déterminer si un fichier est une image
    const isImageFile = (fileName) => {
        return /\.(jpeg|jpg|png|gif)$/i.test(fileName);
    };

    // Fonction pour déterminer si un fichier est un PDF
    const isPdfFile = (fileName) => {
        return /\.pdf$/i.test(fileName);
    };

    // Fonction pour obtenir la prévisualisation d'un fichier
    const getFilePreview = (file) => {
        if (isImageFile(file.name)) {
            return <img src={file.url} alt={file.name} className="file-image" />;
        } else if (isPdfFile(file.name)) {
            return <a href={file.url} target="_blank" rel="noopener noreferrer" className="file-view-btn">Visualiser le PDF</a>;
        } else {
            return <a href={file.url} target="_blank" rel="noopener noreferrer" className="file-view-btn">Télécharger le fichier</a>;
        }
    };

    return (
        <div className="file-list-container">
            <h3>Mes fichiers</h3>
            {error && <p className="error-message">{error}</p>}

            <ul className="file-list">
                {files.length > 0 ? (
                    files.map((file, index) => {
                        const uniqueKey = file.name || index;
                        return (
                            <li key={uniqueKey} className="file-item">
                                <div className="file-info">
                                    <strong>{file.name}</strong> - {(file.size / 1024 / 1024).toFixed(2)} Mo
                                    <p>Date de téléchargement : {new Date(file.uploadDate).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' })}</p>
                                </div>

                                <div className="file-preview">
                                    {getFilePreview(file)}
                                </div>

                                <button className="delete-btn" onClick={() => openConfirmModal(file.name)}>Supprimer</button>
                            </li>
                        );
                    })
                ) : (
                    <p>Aucun fichier disponible.</p>
                )}
            </ul>

            {/* Pagination */}
            {totalPages > 1 && (
                <div className="pagination">
                    {Array.from({ length: totalPages }, (_, index) => (
                        <button
                            key={index}
                            className={`pagination-btn ${page === index + 1 ? 'active' : ''}`}
                            onClick={() => setPage(index + 1)}
                            disabled={page === index + 1}
                        >
                            {index + 1}
                        </button>
                    ))}
                </div>
            )}

            {/* Modal de confirmation */}
            <ConfirmModal 
                show={showModal} 
                onConfirm={handleDelete} 
                onCancel={() => setShowModal(false)} 
            />
        </div>
    );
};

export default FileList;
