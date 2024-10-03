import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import LoginPage from './LoginPage';
import { BrowserRouter } from 'react-router-dom';
import axios from 'axios';
import MockAdapter from 'axios-mock-adapter';

const mockAxios = new MockAdapter(axios);

describe('LoginPage Component', () => {
    const setIsAuthenticated = jest.fn();

    beforeEach(() => {
        mockAxios.reset();
    });

    it('should render login form', () => {
        render(
            <BrowserRouter>
                <LoginPage setIsAuthenticated={setIsAuthenticated} />
            </BrowserRouter>
        );

        expect(screen.getByLabelText(/Email/i)).toBeInTheDocument();
        expect(screen.getByLabelText(/Mot de passe/i)).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /Se connecter/i })).toBeInTheDocument();
    });

    it('should display error message on login failure', async () => {
        mockAxios.onPost('http://localhost:5000/api/login').reply(401, { message: 'Erreur lors de la connexion' });

        render(
            <BrowserRouter>
                <LoginPage setIsAuthenticated={setIsAuthenticated} />
            </BrowserRouter>
        );

        fireEvent.change(screen.getByLabelText(/Email/i), { target: { value: 'test@example.com' } });
        fireEvent.change(screen.getByLabelText(/Mot de passe/i), { target: { value: 'wrongpassword' } });
        fireEvent.click(screen.getByRole('button', { name: /Se connecter/i }));

        await waitFor(() => {
            expect(screen.getByText(/Erreur lors de la connexion/i)).toBeInTheDocument();
        });
    });

    it('should redirect to the appropriate page on login success', async () => {
        const token = 'mock.jwt.token';
        mockAxios.onPost('http://localhost:5000/api/login').reply(200, { token });

        render(
            <BrowserRouter>
                <LoginPage setIsAuthenticated={setIsAuthenticated} />
            </BrowserRouter>
        );

        fireEvent.change(screen.getByLabelText(/Email/i), { target: { value: 'test@example.com' } });
        fireEvent.change(screen.getByLabelText(/Mot de passe/i), { target: { value: 'password' } });
        fireEvent.click(screen.getByRole('button', { name: /Se connecter/i }));

        await waitFor(() => {
            expect(setIsAuthenticated).toHaveBeenCalledWith(true);
        });
    });

    it('should show a success message when login is successful', async () => {
        const token = 'mock.jwt.token';
        mockAxios.onPost('http://localhost:5000/api/login').reply(200, { token });

        render(
            <BrowserRouter>
                <LoginPage setIsAuthenticated={setIsAuthenticated} />
            </BrowserRouter>
        );

        fireEvent.change(screen.getByLabelText(/Email/i), { target: { value: 'test@example.com' } });
        fireEvent.change(screen.getByLabelText(/Mot de passe/i), { target: { value: 'password' } });
        fireEvent.click(screen.getByRole('button', { name: /Se connecter/i }));

        await waitFor(() => {
            expect(screen.getByText(/Connexion réussie !/i)).toBeInTheDocument();
        });
    });
});
