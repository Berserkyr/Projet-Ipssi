import React, { createContext, useContext } from 'react';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

const NotificationContext = createContext();

export const NotificationProvider = ({ children }) => {
    // Fonction pour déclencher une notification de succès
    const notifySuccess = (message) => {
        toast.success(message, {
            position: "top-right",
            autoClose: 3000,
            hideProgressBar: false,
            closeOnClick: true,
            pauseOnHover: true,
            draggable: true,
            progress: undefined,
        });
    };

    // Fonction pour déclencher une notification d'erreur
    const notifyError = (message) => {
        toast.error(message, {
            position: "top-right",
            autoClose: 3000,
            hideProgressBar: false,
            closeOnClick: true,
            pauseOnHover: true,
            draggable: true,
            progress: undefined,
        });
    };

    return (
        <NotificationContext.Provider value={{ notifySuccess, notifyError }}>
            {children}
            <ToastContainer /> {/* Conteneur unique pour gérer toutes les notifications */}
        </NotificationContext.Provider>
    );
};

// Hook personnalisé pour accéder aux notifications
export const useNotification = () => {
    return useContext(NotificationContext);
};
