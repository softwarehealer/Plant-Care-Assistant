import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import '../App.css';

const ForgotPassword = () => {
    const [step, setStep] = useState(1); // 1: email, 2: PIN, 3: reset password
    const [email, setEmail] = useState('');
    const [pin, setPin] = useState(['', '', '', '', '', '']);
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();

    const handleEmailSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setSuccess('');
        setLoading(true);

        if (!email) {
            setError('Please enter your email address');
            setLoading(false);
            return;
        }

        try {
            const response = await fetch('/api/forgot-password', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ email }),
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({ error: 'Something went wrong' }));
                throw new Error(errorData.error || 'Something went wrong');
            }

            const data = await response.json();
            setSuccess(data.message || 'Password reset code has been sent to your email');
            setStep(2); // Move to PIN input step
        } catch (err) {
            setError(err.message || 'Failed to send reset code. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    const handlePinChange = (index, value) => {
        if (!/^\d*$/.test(value)) return; // Only allow digits
        
        const newPin = [...pin];
        newPin[index] = value;
        setPin(newPin);

        // Auto-focus next input
        if (value && index < 5) {
            const nextInput = document.getElementById(`pin-${index + 1}`);
            if (nextInput) nextInput.focus();
        }
    };

    const handlePinKeyDown = (index, e) => {
        if (e.key === 'Backspace' && !pin[index] && index > 0) {
            const prevInput = document.getElementById(`pin-${index - 1}`);
            if (prevInput) prevInput.focus();
        }
    };

    const handlePinPaste = (e) => {
        e.preventDefault();
        const pastedData = e.clipboardData.getData('text').slice(0, 6);
        if (/^\d{1,6}$/.test(pastedData)) {
            const newPin = [...pin];
            for (let i = 0; i < 6; i++) {
                newPin[i] = pastedData[i] || '';
            }
            setPin(newPin);
            // Focus last filled input
            const lastIndex = Math.min(pastedData.length - 1, 5);
            const lastInput = document.getElementById(`pin-${lastIndex}`);
            if (lastInput) lastInput.focus();
        }
    };

    const handlePinVerify = async () => {
        const pinCode = pin.join('');
        if (pinCode.length !== 6) {
            setError('Please enter the complete 6-digit code');
            return;
        }

        setError('');
        setLoading(true);

        try {
            const response = await fetch('/api/verify-pin', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ email, code: pinCode }),
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({ error: 'Invalid code' }));
                throw new Error(errorData.error || 'Invalid code');
            }

            setStep(3); // Move to password reset step
            setSuccess('');
        } catch (err) {
            setError(err.message || 'Invalid code. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    const handlePasswordReset = async (e) => {
        e.preventDefault();
        setError('');
        setSuccess('');

        if (!password || !confirmPassword) {
            setError('Please fill in all fields');
            return;
        }

        if (password !== confirmPassword) {
            setError('Passwords do not match');
            return;
        }

        if (password.length < 6) {
            setError('Password must be at least 6 characters');
            return;
        }

        setLoading(true);

        try {
            const pinCode = pin.join('');
            const response = await fetch('/api/reset-password', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ 
                    email, 
                    code: pinCode,
                    password,
                    confirmPassword 
                }),
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({ error: 'Failed to reset password' }));
                throw new Error(errorData.error || 'Failed to reset password');
            }

            setSuccess('Password has been reset successfully! Redirecting to login...');
            setTimeout(() => {
                navigate('/login');
            }, 2000);
        } catch (err) {
            setError(err.message || 'Failed to reset password. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="auth-page">
            <div className="container">
                <div className="auth-card">
                    <div className="card shadow-lg border-0">
                        <div className="card-body p-5">
                            <div className="brand-icon">
                                <i className="fas fa-leaf fa-3x text-success"></i>
                            </div>

                            {/* Step 1: Email Input */}
                            {step === 1 && (
                                <>
                                    <h2 className="text-center fw-bold mb-2">Forgot Password</h2>
                                    <p className="text-center text-muted mb-4">Enter your email to receive a reset code</p>

                                    {error && (
                                        <div className="alert alert-danger" role="alert">
                                            {error}
                                        </div>
                                    )}

                                    {success && (
                                        <div className="alert alert-success" role="alert">
                                            {success}
                                        </div>
                                    )}

                                    <form onSubmit={handleEmailSubmit}>
                                        <div className="mb-4">
                                            <label className="form-label fw-semibold">Email</label>
                                            <input 
                                                type="email" 
                                                className="form-control form-control-lg" 
                                                placeholder="your@email.com"
                                                value={email}
                                                onChange={(e) => setEmail(e.target.value)}
                                                required
                                                disabled={loading}
                                            />
                                        </div>
                                        
                                        <button 
                                            type="submit" 
                                            className="btn btn-primary btn-lg w-100 mb-3"
                                            disabled={loading}
                                        >
                                            {loading ? (
                                                <>
                                                    <span className="spinner-border spinner-border-sm me-2" role="status"></span>
                                                    Sending...
                                                </>
                                            ) : (
                                                'Send Reset Code'
                                            )}
                                        </button>
                                    </form>
                                    
                                    <div className="text-center">
                                        <Link to="/login" className="text-success fw-semibold text-decoration-none">
                                            <i className="fas fa-arrow-left me-2"></i>Back to Login
                                        </Link>
                                    </div>
                                </>
                            )}

                            {/* Step 2: PIN Input */}
                            {step === 2 && (
                                <>
                                    <h2 className="text-center fw-bold mb-2">Enter Verification Code</h2>
                                    <p className="text-center text-muted mb-4">
                                        We've sent a 6-digit code to <strong>{email}</strong>
                                    </p>

                                    {error && (
                                        <div className="alert alert-danger" role="alert">
                                            {error}
                                        </div>
                                    )}

                                    <div className="mb-4">
                                        <label className="form-label fw-semibold text-center d-block mb-3">
                                            Enter 6-digit code
                                        </label>
                                        <div className="d-flex justify-content-center gap-2 mb-3">
                                            {pin.map((digit, index) => (
                                                <input
                                                    key={index}
                                                    id={`pin-${index}`}
                                                    type="text"
                                                    inputMode="numeric"
                                                    maxLength="1"
                                                    className="form-control form-control-lg text-center"
                                                    style={{ width: '50px', fontSize: '1.5rem' }}
                                                    value={digit}
                                                    onChange={(e) => handlePinChange(index, e.target.value)}
                                                    onKeyDown={(e) => handlePinKeyDown(index, e)}
                                                    onPaste={handlePinPaste}
                                                    disabled={loading}
                                                    autoFocus={index === 0}
                                                />
                                            ))}
                                        </div>
                                    </div>

                                    <button 
                                        type="button"
                                        className="btn btn-primary btn-lg w-100 mb-3"
                                        onClick={handlePinVerify}
                                        disabled={loading || pin.join('').length !== 6}
                                    >
                                        {loading ? (
                                            <>
                                                <span className="spinner-border spinner-border-sm me-2" role="status"></span>
                                                Verifying...
                                            </>
                                        ) : (
                                            'Verify Code'
                                        )}
                                    </button>

                                    <div className="text-center mb-3">
                                        <button
                                            type="button"
                                            className="btn btn-link text-muted text-decoration-none"
                                            onClick={() => {
                                                setStep(1);
                                                setPin(['', '', '', '', '', '']);
                                                setError('');
                                            }}
                                            disabled={loading}
                                        >
                                            <i className="fas fa-arrow-left me-2"></i>Change Email
                                        </button>
                                    </div>

                                    <div className="text-center">
                                        <Link to="/login" className="text-success fw-semibold text-decoration-none">
                                            <i className="fas fa-arrow-left me-2"></i>Back to Login
                                        </Link>
                                    </div>
                                </>
                            )}

                            {/* Step 3: Password Reset */}
                            {step === 3 && (
                                <>
                                    <h2 className="text-center fw-bold mb-2">Reset Password</h2>
                                    <p className="text-center text-muted mb-4">Enter your new password</p>

                                    {error && (
                                        <div className="alert alert-danger" role="alert">
                                            {error}
                                        </div>
                                    )}

                                    {success && (
                                        <div className="alert alert-success" role="alert">
                                            {success}
                                        </div>
                                    )}

                                    <form onSubmit={handlePasswordReset}>
                                        <div className="mb-3">
                                            <label className="form-label fw-semibold">New Password</label>
                                            <input 
                                                type="password" 
                                                className="form-control form-control-lg" 
                                                placeholder="Enter new password"
                                                value={password}
                                                onChange={(e) => setPassword(e.target.value)}
                                                required
                                                disabled={loading}
                                                minLength="6"
                                            />
                                        </div>

                                        <div className="mb-4">
                                            <label className="form-label fw-semibold">Confirm Password</label>
                                            <input 
                                                type="password" 
                                                className="form-control form-control-lg" 
                                                placeholder="Confirm new password"
                                                value={confirmPassword}
                                                onChange={(e) => setConfirmPassword(e.target.value)}
                                                required
                                                disabled={loading}
                                                minLength="6"
                                            />
                                        </div>
                                        
                                        <button 
                                            type="submit" 
                                            className="btn btn-primary btn-lg w-100 mb-3"
                                            disabled={loading}
                                        >
                                            {loading ? (
                                                <>
                                                    <span className="spinner-border spinner-border-sm me-2" role="status"></span>
                                                    Resetting...
                                                </>
                                            ) : (
                                                'Reset Password'
                                            )}
                                        </button>
                                    </form>

                                    <div className="text-center">
                                        <Link to="/login" className="text-success fw-semibold text-decoration-none">
                                            <i className="fas fa-arrow-left me-2"></i>Back to Login
                                        </Link>
                                    </div>
                                </>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ForgotPassword;
