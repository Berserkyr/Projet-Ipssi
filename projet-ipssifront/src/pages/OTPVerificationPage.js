import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import OTP from '../components/OTP';

const OTPVerificationPage = () => {
    const [isOTPVerified, setIsOTPVerified] = useState(false);
    const [email, setEmail] = useState('');  // To store the user's email
    const navigate = useNavigate();

    useEffect(() => {
        // Retrieve email from localStorage or other storage (assuming the email was saved during signup or login)
        const storedEmail = localStorage.getItem('email');
        if (storedEmail) {
            setEmail(storedEmail);
        } else {
            // Redirect to login if no email is found
            navigate('/login');
        }
    }, [navigate]);

    useEffect(() => {
        if (isOTPVerified) {
            // Redirect to the dashboard if OTP is verified
            navigate('/dashboard');
        }
    }, [isOTPVerified, navigate]);

    return (
        <div>
            <h2>Vérification OTP</h2>
            {email ? (
                <OTP email={email} setIsOTPVerified={setIsOTPVerified} />
            ) : (
                <p>Aucun email trouvé. Redirection vers la page de connexion...</p>
            )}
        </div>
    );
};

export default OTPVerificationPage;
