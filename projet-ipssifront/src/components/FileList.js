import React, { useState, useEffect } from 'react';
import axios from 'axios';
import ConfirmModal from './ConfirmModal'; // Importer la modal personnalisée
import '../assets/css/FileList.css';  // Fichier CSS amélioré

const FileList = () => {
    const [files, setFiles] = useState([]);
    const [error, setError] = useState('');
    const [page, setPage] = useState(1);  // Pagination - Page actuelle
    const [totalPages, setTotalPages] = useState(1);  // Nombre total de pages
    const [showModal, setShowModal] = useState(false); // État pour la modal de confirmation
    const [fileToDelete, setFileToDelete] = useState(null); // Stocker le fichier à supprimer
    const [sortOption, setSortOption] = useState('name'); // Option de tri
    const [searchTerm, setSearchTerm] = useState(''); // Terme de recherche pour les fichiers
    const [fileTypeFilter, setFileTypeFilter] = useState('all'); // Filtre pour le type de fichier

    // Fonction pour récupérer les fichiers - Déplacée en dehors de useEffect
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

    // Utilisation de useEffect pour charger les fichiers lors du montage du composant ou changement de page
    useEffect(() => {
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
            setFileToDelete(null); // Réinitialiser l'état du fichier à supprimer
            fetchFiles(); // Rafraîchir la liste des fichiers après la suppression
            setShowModal(false); // Fermer la modal après suppression
        } catch (error) {
            setError('Erreur lors de la suppression du fichier.');
        }
    };

    // Ouvre la modal et passe l'ID du fichier à supprimer
    const openConfirmModal = (fileId) => {
        setFileToDelete(fileId);
        setShowModal(true);
    };

    const isImageFile = (fileName) => /\.(jpeg|jpg|png|gif)$/i.test(fileName);
    const isPdfFile = (fileName) => /\.pdf$/i.test(fileName);

    // Fonction pour obtenir la prévisualisation d'un fichier
    const getFilePreview = (file) => {
        if (isImageFile(file.name)) {
            return <img src={file.url} alt={file.name} className="file-image" />;
        } else if (isPdfFile(file.name)) {
            return (
                <a href={file.url} target="_blank" rel="noopener noreferrer" className="file-view-btn">
                    <i className="fa fa-file-pdf"></i> Visualiser le PDF
                </a>
            );
        } else {
            return (
                <a href={file.url} target="_blank" rel="noopener noreferrer" className="file-view-btn">
                    <i className="fa fa-download"></i> Télécharger le fichier
                </a>
            );
        }
    };

// Fonction pour trier les fichiers
const sortFiles = (files, sortOption, sortOrder) => {
    return [...files].sort((a, b) => {
        let comparison = 0;
        switch (sortOption) {
            case 'name':
                comparison = a.name.localeCompare(b.name);
                break;
            case 'size':
                comparison = a.size - b.size;
                break;
            case 'date':
                comparison = new Date(a.uploadDate) - new Date(b.uploadDate);
                break;
            default:
                return 0;
        }
        return sortOrder === 'asc' ? comparison : -comparison;
    });
};


    // Fonction pour filtrer les fichiers en fonction du terme de recherche et du type de fichier
    const filterFiles = (files) => {
        return files.filter((file) => {
            const matchesSearchTerm = file.name.toLowerCase().includes(searchTerm.toLowerCase());
            const matchesFileType = fileTypeFilter === 'all' ||
                (fileTypeFilter === 'images' && isImageFile(file.name)) ||
                (fileTypeFilter === 'pdf' && isPdfFile(file.name));
            return matchesSearchTerm && matchesFileType;
        });
    };

    // Appliquer tri et filtres aux fichiers
    const sortedAndFilteredFiles = sortFiles(filterFiles(files), sortOption);

    return (
        <div className="file-list-container">
            <h2 className="file-list-title">Mes Fichiers</h2>
            {error && <p className="error-message">{error}</p>}

            {/* Menu de recherche et de tri */}
            <div className="file-controls">
                <input
                    type="text"
                    placeholder="Rechercher par nom"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                />
                <select value={fileTypeFilter} onChange={(e) => setFileTypeFilter(e.target.value)}>
                    <option value="all">Tous les formats</option>
                    <option value="images">Images</option>
                    <option value="pdf">PDF</option>
                </select>
                <select id="sort" value={sortOption} onChange={(e) => setSortOption(e.target.value)}>
                    <option value="name">Nom</option>
                    <option value="size">Taille</option>
                    <option value="date">Date de téléchargement</option>
                </select>
            </div>

            <div className="file-list">
                {sortedAndFilteredFiles.length > 0 ? (
                    sortedAndFilteredFiles.map((file, index) => {
                        const uniqueKey = file.id || index;  // Utiliser l'ID du fichier comme clé unique
                        return (
                            <div key={uniqueKey} className="file-card">
                                <div className="file-info">
                                    <h3 className="file-name">{file.name}</h3>
                                    <p className="file-size">Taille: {(file.size / 1024 / 1024).toFixed(2)} Mo</p>
                                    <p className="file-date">Date de téléchargement : {new Date(file.uploadDate).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' })}</p>
                                </div>

                                <div className="file-preview">
                                    {getFilePreview(file)}
                                </div>

                                {/* Passer l'ID du fichier au lieu du nom */}
                                <button className="delete-btn" onClick={() => openConfirmModal(file.id)}>
                                    <i className="fa fa-trash"></i> Supprimer
                                </button>
                            </div>
                        );
                    })
                ) : (
                    <p className="no-files">Aucun fichier disponible.</p>
                )}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
                <div className="pagination">
                    <button
                        className="pagination-btn"
                        onClick={() => setPage(page - 1)}
                        disabled={page === 1}
                    >
                        Précédent
                    </button>
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
                    <button
                        className="pagination-btn"
                        onClick={() => setPage(page + 1)}
                        disabled={page === totalPages}
                    >
                        Suivant
                    </button>
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
