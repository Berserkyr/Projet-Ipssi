import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import authService from '../services/authService'; // Assuming you have authService for API calls

const OTP = ({ email, setIsOTPVerified }) => {
    const [otp, setOtp] = useState('');
    const [message, setMessage] = useState('');
    const navigate = useNavigate();  // To programmatically navigate to the dashboard

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            const response = await authService.verifyOTP({ email, otp });
            setMessage(response.data.message);

            if (response.data.message === 'OTP vérifié avec succès. Vous pouvez maintenant vous connecter.') {
                setIsOTPVerified(true);  // Update OTP verification state
                navigate('/dashboard');  // Redirect to the dashboard
            }
        } catch (error) {
            setMessage(error.response?.data?.message || 'Erreur lors de la vérification OTP');
        }
    };

    return (
        <div>
            <h2>Vérifiez votre OTP</h2>
            <form onSubmit={handleSubmit}>
                <label>
                    Entrer votre OTP:
                    <input
                        type="text"
                        value={otp}
                        onChange={(e) => setOtp(e.target.value)}
                        required
                    />
                </label>
                <button type="submit">Vérifier OTP</button>
            </form>
            {message && <p>{message}</p>}
        </div>
    );
};

export default OTP;
