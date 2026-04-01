import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import '../App.css';

const PlantIdentification = ({ onIdentify, onResult }) => {
    const [image, setImage] = useState(null);
    const [preview, setPreview] = useState(null);
    const [isProcessing, setIsProcessing] = useState(false);
    const [dragActive, setDragActive] = useState(false);
    const fileInputRef = useRef(null);
    const navigate = useNavigate();
    const { user } = useAuth();

    const handleFileSelect = (file) => {
        if (file && file.type.startsWith('image/')) {
            setImage(file);
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

    const handleIdentify = async () => {
        if (!image) {
            alert('Please upload an image first');
            return;
        }

        setIsProcessing(true);

        try {
            const formData = new FormData();
            formData.append('image', image);
            if (user?.email) {
                formData.append('email', user.email);
            }

            const response = await fetch('/api/identify', {
                method: 'POST',
                body: formData,
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({ error: 'Identification failed' }));
                throw new Error(errorData.error || 'Identification failed');
            }

            const result = await response.json();
            
            const finalResult = {
                ...result,
                image: preview,
                imageBuffer: result.imageBuffer,
                timestamp: new Date().toISOString()
            };
            
            // Store in sessionStorage and navigate
            sessionStorage.setItem('identificationResult', JSON.stringify(finalResult));
            navigate('/results');
        } catch (err) {
            alert(err.message || 'Failed to identify plant. Please try again.');
        } finally {
            setIsProcessing(false);
        }
    };

    const handleClear = () => {
        setImage(null);
        setPreview(null);
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    };

    return (
        <div>
            <div className="d-flex justify-content-between align-items-center mb-4">
                <h2 className="fw-bold">Plant Identification</h2>
                <span className="text-muted">Upload a photo to identify your plant</span>
            </div>

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
                                        onClick={handleIdentify}
                                        disabled={isProcessing}
                                    >
                                        {isProcessing ? (
                                            <>
                                                <span className="loading-spinner me-2"></span>
                                                Processing...
                                            </>
                                        ) : (
                                            <>
                                                <i className="fas fa-search me-2"></i>
                                                Identify Plant
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
                                    Use clear, well-lit photos
                                </li>
                                <li className="mb-3">
                                    <i className="fas fa-check-circle text-success me-2"></i>
                                    Focus on leaves and stems
                                </li>
                                <li className="mb-3">
                                    <i className="fas fa-check-circle text-success me-2"></i>
                                    Avoid blurry or dark images
                                </li>
                                <li className="mb-3">
                                    <i className="fas fa-check-circle text-success me-2"></i>
                                    Include multiple angles if possible
                                </li>
                            </ul>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default PlantIdentification;


