import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import '../App.css';

const PlantDiagnosis = () => {
    const [image, setImage] = useState(null);
    const [preview, setPreview] = useState(null);
    const [isProcessing, setIsProcessing] = useState(false);
    const [dragActive, setDragActive] = useState(false);
    const [error, setError] = useState('');
    const fileInputRef = useRef(null);
    const navigate = useNavigate();
    const { user } = useAuth();

    const handleFileSelect = (file) => {
        if (file && file.type.startsWith('image/')) {
            setImage(file);
            setError('');
            const reader = new FileReader();
            reader.onloadend = () => {
                setPreview(reader.result);
            };
            reader.readAsDataURL(file);
        }
    };

    const handleDrop = (e) => {
        e.preventDefault();
        setDragActive(false);
        const file = e.dataTransfer.files[0];
        handleFileSelect(file);
    };

    const handleDragOver = (e) => {
        e.preventDefault();
        setDragActive(true);
    };

    const handleDragLeave = (e) => {
        e.preventDefault();
        setDragActive(false);
    };

    const handleFileInput = (e) => {
        const file = e.target.files[0];
        handleFileSelect(file);
    };

    const handleDiagnose = async () => {
        if (!image) {
            setError('Please upload an image first');
            return;
        }

        setIsProcessing(true);
        setError('');

        try {
            const formData = new FormData();
            formData.append('image', image);
            if (user?.email) {
                formData.append('email', user.email);
            }

            const response = await fetch('/api/diagnosis', {
                method: 'POST',
                body: formData,
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({ error: 'Diagnosis failed' }));
                throw new Error(errorData.error || 'Diagnosis failed');
            }

            const result = await response.json();
            
            // Store result in sessionStorage and navigate to results
            sessionStorage.setItem('identificationResult', JSON.stringify({
                ...result,
                image: preview,
                imageBuffer: result.imageBuffer,
                timestamp: new Date().toISOString()
            }));
            
            navigate('/results');
        } catch (err) {
            setError(err.message || 'Failed to diagnose plant. Please try again.');
        } finally {
            setIsProcessing(false);
        }
    };

    const handleClear = () => {
        setImage(null);
        setPreview(null);
        setError('');
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    };

    return (
        <div>
            <div className="d-flex justify-content-between align-items-center mb-4">
                <h2 className="fw-bold">Plant Disease Diagnosis</h2>
                <span className="text-muted">Upload a photo to diagnose plant diseases</span>
            </div>

            {error && (
                <div className="alert alert-danger mb-4" role="alert">
                    {error}
                </div>
            )}

            <div className="row">
                <div className="col-lg-8 mb-4">
                    <div className="card">
                        <div className="card-body">
                            <div
                                className={`upload-area ${dragActive ? 'dragover' : ''}`}
                                onDrop={handleDrop}
                                onDragOver={handleDragOver}
                                onDragLeave={handleDragLeave}
                                onClick={() => fileInputRef.current?.click()}
                            >
                                {preview ? (
                                    <div>
                                        <img src={preview} alt="Preview" />
                                        <div className="mt-3">
                                            <button 
                                                className="btn btn-outline-danger me-2"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    handleClear();
                                                }}
                                            >
                                                <i className="fas fa-times me-2"></i>Remove
                                            </button>
                                        </div>
                                    </div>
                                ) : (
                                    <div>
                                        <i className="fas fa-cloud-upload-alt fa-4x text-muted mb-3"></i>
                                        <h5 className="mb-2">Drag & Drop Image Here</h5>
                                        <p className="text-muted mb-3">or click to browse</p>
                                        <p className="text-muted small">
                                            Supported formats: JPG, PNG, WEBP
                                        </p>
                                    </div>
                                )}
                                <input
                                    ref={fileInputRef}
                                    type="file"
                                    accept="image/*"
                                    onChange={handleFileInput}
                                    style={{ display: 'none' }}
                                />
                            </div>

                            {preview && (
                                <div className="mt-3 text-center">
                                    <button
                                        className="btn btn-primary btn-lg"
                                        onClick={handleDiagnose}
                                        disabled={isProcessing}
                                    >
                                        {isProcessing ? (
                                            <>
                                                <span className="loading-spinner me-2"></span>
                                                Diagnosing...
                                            </>
                                        ) : (
                                            <>
                                                <i className="fas fa-stethoscope me-2"></i>
                                                Diagnose Disease
                                            </>
                                        )}
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                <div className="col-lg-4">
                    <div className="card">
                        <div className="card-header bg-white">
                            <h5 className="mb-0 fw-bold">Tips for Best Results</h5>
                        </div>
                        <div className="card-body">
                            <ul className="list-unstyled">
                                <li className="mb-3">
                                    <i className="fas fa-check-circle text-success me-2"></i>
                                    Focus on affected leaves or areas
                                </li>
                                <li className="mb-3">
                                    <i className="fas fa-check-circle text-success me-2"></i>
                                    Ensure good lighting and clarity
                                </li>
                                <li className="mb-3">
                                    <i className="fas fa-check-circle text-success me-2"></i>
                                    Capture symptoms clearly (spots, discoloration, etc.)
                                </li>
                                <li className="mb-3">
                                    <i className="fas fa-check-circle text-success me-2"></i>
                                    Include multiple affected areas if possible
                                </li>
                            </ul>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default PlantDiagnosis;


