import React, { useEffect, useState, useMemo } from 'react';
import axios from 'axios';
import {
  createColumnHelper,
  useReactTable,
  getCoreRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  flexRender,
} from '@tanstack/react-table';
import '../assets/css/AdminPage.css';

const AdminPage = () => {
  const [users, setUsers] = useState([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [selectedUserFiles, setSelectedUserFiles] = useState([]);
  const [userAction, setUserAction] = useState(null);

  useEffect(() => {
    const fetchUserStats = async () => {
      try {
        const token = localStorage.getItem('token');
        if (!token) {
          setError("Vous n'êtes pas authentifié.");
          setLoading(false);
          return;
        }

        const config = {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        };

       // Correction de l'URL pour correspondre à la route définie sur le serveur
       const response = await axios.get('http://localhost:5000/api/admin/user-stats', config);

       setUsers(response.data);
       setLoading(false);
     } catch (error) {
       console.error('Erreur lors de la récupération des données:', error);
       setError('Erreur lors de la récupération des données. Veuillez réessayer.');
       setLoading(false);
     }
   };

   fetchUserStats();
 }, []);

  // Déclaration des fonctions de gestion des actions
  const handleViewFiles = async (userId) => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        setError("Vous n'êtes pas authentifié.");
        return;
      }

      const config = {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      };

      const response = await axios.get(`http://localhost:5000/api/files/${userId}`, config);
      if (response.data && response.data.files) {
        setSelectedUserFiles(response.data.files);
      } else {
        setError('Aucun fichier trouvé pour cet utilisateur.');
      }
    } catch (error) {
      console.error('Erreur lors de la récupération des fichiers de l\'utilisateur:', error);
      setError('Erreur lors de la récupération des fichiers.');
    }
  };

  const handleDeleteUser = async (userId) => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        setError("Vous n'êtes pas authentifié.");
        return;
      }

      const config = {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      };

      await axios.post('http://localhost:5000/api/delete-user', { userId }, config);
      setUsers(users.filter(user => user.id !== userId));
    } catch (error) {
      console.error('Erreur lors de la suppression de l\'utilisateur:', error);
      setError('Erreur lors de la suppression.');
    }
  };

  const handleChangeRole = async (userId, currentRole) => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        setError("Vous n'êtes pas authentifié.");
        return;
      }

      const newRole = currentRole === 'admin' ? 'user' : 'admin';
      const config = {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      };

      await axios.post('http://localhost:5000/api/change-role', { userId, newRole }, config);
      setUsers(users.map(user => (user.id === userId ? { ...user, role: newRole } : user)));
    } catch (error) {
      console.error('Erreur lors du changement de rôle de l\'utilisateur:', error);
      setError('Erreur lors du changement de rôle.');
    }
  };

  // Utiliser useMemo pour éviter de recréer les colonnes à chaque re-rendu
  const columnHelper = createColumnHelper();

  const columns = useMemo(() => [
    columnHelper.accessor('id', {
      header: 'ID',
      cell: info => info.getValue(),
      sortingFn: 'basic', // Permettre le tri de cette colonne
    }),
    columnHelper.accessor('name', {
      header: 'Nom',
      cell: info => info.getValue(),
      sortingFn: 'alphanumeric',
    }),
    columnHelper.accessor('surname', {
      header: 'Prénom',
      cell: info => info.getValue(),
      sortingFn: 'alphanumeric',
    }),
    columnHelper.accessor('email', {
      header: 'Email',
      cell: info => info.getValue(),
      sortingFn: 'alphanumeric',
    }),
    columnHelper.accessor('role', {
      header: 'Rôle',
      cell: info => info.getValue(),
      sortingFn: 'alphanumeric',
    }),
    columnHelper.accessor('fileCount', {
      header: 'Nombre de fichiers',
      cell: info => info.getValue(),
      sortingFn: 'basic',
    }),
    columnHelper.accessor('totalSize', {
      header: 'Taille totale des fichiers (Mo)',
      cell: info => (info.getValue() / (1024 * 1024)).toFixed(2),
      sortingFn: 'basic',
    }),
    columnHelper.display({
      id: 'actions',
      header: 'Actions',
      cell: ({ row }) => (
        <div>
          <button onClick={() => handleViewFiles(row.original.id)}>Voir les fichiers</button>
          <button onClick={() => handleDeleteUser(row.original.id)}>Supprimer</button>
          <button onClick={() => handleChangeRole(row.original.id, row.original.role)}>
            {row.original.role === 'admin' ? 'Rétrograder' : 'Promouvoir'}
          </button>
        </div>
      ),
    }),
  ], [columnHelper, handleViewFiles, handleDeleteUser, handleChangeRole]);

  const table = useReactTable({
    data: users,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
  });

  if (loading) {
    return <div>Chargement des statistiques...</div>;
  }

  return (
    <div className="admin-page">
      <h2>Tableau de bord Administrateur</h2>
      <p>Gestion des utilisateurs et des fichiers</p>

      {error && <p style={{ color: 'red' }}>{error}</p>}

      <div className="user-list">
        <h3>Liste des utilisateurs</h3>
        <table className="user-table">
          <thead>
            {table.getHeaderGroups().map(headerGroup => (
              <tr key={headerGroup.id}>
                {headerGroup.headers.map(header => (
                  <th key={header.id} onClick={header.column.getToggleSortingHandler()}>
                    {flexRender(header.column.columnDef.header, header.getContext())}
                    {header.column.getIsSorted() ? (
                      header.column.getIsSorted() === 'asc' ? ' 🔼' : ' 🔽'
                    ) : null}
                  </th>
                ))}
              </tr>
            ))}
          </thead>
          <tbody>
            {table.getRowModel().rows.map(row => (
              <tr key={row.id}>
                {row.getVisibleCells().map(cell => (
                  <td key={cell.id}>
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>

        <div className="pagination-controls">
          <button onClick={() => table.previousPage()} disabled={!table.getCanPreviousPage()}>
            Précédent
          </button>
          <button onClick={() => table.nextPage()} disabled={!table.getCanNextPage()}>
            Suivant
          </button>
          <span>
            Page {table.getState().pagination.pageIndex + 1} sur {table.getPageCount()}
          </span>
        </div>
      </div>

      {selectedUserFiles.length > 0 && (
        <div className="user-files">
          <h3>Fichiers de l'utilisateur</h3>
          <ul>
            {selectedUserFiles.map((file, index) => (
              <li key={index}>
                {file.name} - {(file.size / (1024 * 1024)).toFixed(2)} Mo
                <a href={file.url} target="_blank" rel="noopener noreferrer"> Voir</a>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};

export default AdminPage;
