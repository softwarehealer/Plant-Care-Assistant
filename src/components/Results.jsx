import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import '../App.css';


const Results = ({ result, onSave }) => {
    const [selectedPlant, setSelectedPlant] = useState(null);
    const [careTips, setCareTips] = useState(null);
    const [isSaving, setIsSaving] = useState(false);
    const navigate = useNavigate();
    const { user } = useAuth();

    useEffect(() => {
        if (result?.type === 'identification' && result?.classes && result.classes.length > 0) {
            setSelectedPlant(result.classes[0]);
        }
    }, [result]);

    useEffect(() => {
        if (selectedPlant && result?.type === 'identification') {
            fetchCareTips(selectedPlant.id);
        }
    }, [selectedPlant, result]);

    const fetchCareTips = async (plantId) => {
        try {
            const response = await fetch(`/api/plants?plantId=${plantId}`);
            if (response.ok) {
                const data = await response.json();
                setCareTips(data.plant?.care || null);
            }
        } catch (error) {
            console.error('Error fetching care tips:', error);
        }
    };
    const uploadImageToCloudinary = async (result) => {
        if (!result?.image && !result?.imageBuffer) return null;
    
        let blob = null;
    
        if (result.image?.startsWith('data:')) {
            blob = await (await fetch(result.image)).blob();
        } else if (result.imageBuffer) {
            const bytes = Uint8Array.from(atob(result.imageBuffer), c => c.charCodeAt(0));
            blob = new Blob([bytes], { type: 'image/jpeg' });
        }
    
        if (!blob) return null;
    
        const formData = new FormData();
        formData.append('file', blob);
        formData.append('upload_preset', 'plant_images'); // 👈 change this
        formData.append('folder', 'plants');
    
        const response = await fetch(
            'https://api.cloudinary.com/v1_1/djqa3bn8f/upload', // 👈 change this
            {
                method: 'POST',
                body: formData
            }
        );
    
        const data = await response.json();
        return data.secure_url || null;
    };
    
    const handleSave = async () => {
        if (!result || isSaving || !user?.email) return;
      
        setIsSaving(true);
        try {
          const imageUrl = await uploadImageToCloudinary(result);
      
          const payload = {
            type: result.type,
            email: user.email,
            url: imageUrl,
            species: result.type === 'identification'
              ? result.classes.map(p => ({ name: p.name, confidence: p.confidence }))
              : [],
            disease: result.type === 'diagnosis'
              ? { name: result.disease, confidence: result.diseaseConfidence }
              : null
          };
      
          const response = await fetch('/api/save-history', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
          });
      
          if (!response.ok) throw new Error('Save failed');
      
          onSave?.(result);
          alert('Saved to history!');
        } catch (e) {
          console.error(e);
          alert('Failed to save history');
        } finally {
          setIsSaving(false);
        }
      };
      

    const handleBack = () => {
        if (result?.type === 'identification') {
            navigate('/identify');
        } else if (result?.type === 'diagnosis') {
            navigate('/diagnosis');
        } else {
            navigate('/dashboard');
        }
    };

    if (!result) {
        return (
            <div className="text-center text-muted py-5">
                <i className="fas fa-image fa-3x mb-3"></i>
                <p>No results to display. Upload and identify a plant first.</p>
            </div>
        );
    }

    // Diagnosis Results
    if (result.type === 'diagnosis') {
        const imageSrc = result.image || (result.imageBuffer ? `data:image/jpeg;base64,${result.imageBuffer}` : null);

        return (
            <div>
                <div className="d-flex justify-content-between align-items-center mb-4">
                    <div className="d-flex align-items-center gap-3">
                        <button 
                            className="btn btn-outline-secondary" 
                            onClick={handleBack}
                        >
                            <i className="fas fa-arrow-left me-2"></i>Back
                        </button>
                        <h2 className="fw-bold mb-0">Diagnosis Results</h2>
                    </div>
                    {onSave && (
                        <button 
                            className="btn btn-primary" 
                            onClick={handleSave}
                            disabled={isSaving}
                        >
                            {isSaving ? (
                                <>
                                    <span className="spinner-border spinner-border-sm me-2"></span>
                                    Saving...
                                </>
                            ) : (
                                <>
                                    <i className="fas fa-save me-2"></i>Save to History
                                </>
                            )}
                        </button>
                    )}
                </div>

                <div className="row">
                    <div className="col-lg-12">
                        {/* Top div: Image, Status, Disease */}
                        <div className="card mb-4">
                            <div className="card-body">
                                <div className="row align-items-center">
                                    <div className="col-md-4 mb-3 mb-md-0">
                                        {imageSrc && (
                                            <img 
                                                src={imageSrc} 
                                                alt="Diagnosed plant" 
                                                className="img-fluid rounded"
                                            />
                                        )}
                                    </div>
                                    <div className="col-md-8">
                                        <div className="mb-3">
                                            <span className={`disease-badge ${result.isHealthy ? 'healthy' : 'diseased'}`}>
                                                <i className={`fas ${result.isHealthy ? 'fa-check-circle' : 'fa-exclamation-triangle'} me-2`}></i>
                                                {result.isHealthy ? 'Healthy' : 'Diseased'}
                                            </span>
                                        </div>
                                        {result.isHealthy && (
                                            <div className="mb-2">
                                                <span className="text-muted">Confidence: </span>
                                                <span className="fw-bold">
                                                    {((result.diseaseConfidence || 0.95) * 100).toFixed(1)}%
                                                </span>
                                            </div>
                                        )}
                                        {!result.isHealthy && result.disease && (
                                            <>
                                                <div className="mb-2">
                                                    <h5 className="fw-bold text-danger mb-1">Detected Disease:</h5>
                                                    <p className="mb-1 fs-5">{result.disease}</p>
                                                </div>
                                                <div>
                                                    <span className="text-muted">Confidence: </span>
                                                    <span className="fw-bold">
                                                        {(result.diseaseConfidence * 100).toFixed(1)}%
                                                    </span>
                                                </div>
                                            </>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Bottom div: Treatment */}
                        {!result.isHealthy && result.treatment && result.treatment.length > 0 && (
                            <div className="card">
                                <div className="card-header bg-white">
                                    <h5 className="mb-0 fw-bold">
                                        <i className="fas fa-pills me-2 text-danger"></i>
                                        Treatment & Remedies
                                    </h5>
                                </div>
                                <div className="card-body">
                                    <ul className="list-group list-group-flush">
                                        {result.treatment.map((treatment, index) => (
                                            <li key={index} className="list-group-item">
                                                <i className="fas fa-check text-success me-2"></i>
                                                {treatment}
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        );
    }

    // Identification Results
    const imageSrc = result.image || (result.imageBuffer ? `data:image/jpeg;base64,${result.imageBuffer}` : null);
    const plants = result.classes || [];

    return (
        <div>
            <div className="d-flex justify-content-between align-items-center mb-4">
                <div className="d-flex align-items-center gap-3">
                    <button 
                        className="btn btn-outline-secondary" 
                        onClick={handleBack}
                    >
                        <i className="fas fa-arrow-left me-2"></i>Back
                    </button>
                    <h2 className="fw-bold mb-0">Identification Results</h2>
                </div>
                {onSave && (
                    <button 
                        className="btn btn-primary" 
                        onClick={handleSave}
                        disabled={isSaving}
                    >
                        {isSaving ? (
                            <>
                                <span className="spinner-border spinner-border-sm me-2"></span>
                                Saving...
                            </>
                        ) : (
                            <>
                                <i className="fas fa-save me-2"></i>Save to History
                            </>
                        )}
                    </button>
                )}
            </div>

            <div className="row">
                <div className="col-lg-8 mb-4">
                    {/* Top div: Image and Top 5 Class Names */}
                    <div className="card mb-4">
                        <div className="card-body">
                            <div className="row">
                                <div className="col-md-6 mb-3 mb-md-0">
                                    {imageSrc && (
                                        <img 
                                            src={imageSrc} 
                                            alt="Identified plant" 
                                            className="img-fluid rounded"
                                        />
                                    )}
                                </div>
                                <div className="col-md-6">
                                    <h5 className="fw-bold mb-3">Top Matches:</h5>
                                    <div className="list-group">
                                        {plants.map((plant, index) => (
                                            <button
                                                key={index}
                                                type="button"
                                                className={`list-group-item list-group-item-action ${selectedPlant?.id === plant.id ? 'active' : ''}`}
                                                onClick={() => setSelectedPlant(plant)}
                                            >
                                                <div className="d-flex justify-content-between align-items-center">
                                                    <span className="fw-bold">{index + 1}. {plant.name}</span>
                                                    <span className="badge bg-primary rounded-pill">
                                                        {(plant.confidence * 100).toFixed(1)}%
                                                    </span>
                                                </div>
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Bottom div: Plant Details */}
                    {selectedPlant && (
                        <div className="card">
                            <div className="card-header bg-white">
                                <h5 className="mb-0 fw-bold">Plant Details</h5>
                            </div>
                            <div className="card-body">
                                <div className="row">
                                    <div className="col-md-6 mb-3">
                                        <strong>Confidence Score:</strong>
                                        <p className="mb-0">{(selectedPlant.confidence * 100).toFixed(1)}%</p>
                                    </div>
                                    {selectedPlant.family && (
                                        <div className="col-md-6 mb-3">
                                            <strong>Family:</strong>
                                            <p className="mb-0">{selectedPlant.family}</p>
                                        </div>
                                    )}
                                    {selectedPlant.scientificName && (
                                        <div className="col-md-6 mb-3">
                                            <strong>Scientific Name:</strong>
                                            <p className="mb-0"><em>{selectedPlant.scientificName}</em></p>
                                        </div>
                                    )}
                                    {selectedPlant.commonNames && selectedPlant.commonNames.length > 0 && (
                                        <div className="col-md-6 mb-3">
                                            <strong>Common Names:</strong>
                                            <p className="mb-0">{selectedPlant.commonNames.join(', ')}</p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* Right side: Care Tips */}
                <div className="col-lg-4">
                    {careTips && (
                        <div className="card mb-4">
                            <div className="card-header bg-white">
                                <h5 className="mb-0 fw-bold">
                                    <i className="fas fa-lightbulb me-2 text-warning"></i>
                                    Care Tips
                                </h5>
                            </div>
                            <div className="card-body">
                                {careTips.watering && (
                                    <div className="care-tip-card card mb-3 border-0">
                                        <div className="card-body">
                                            <h6 className="fw-bold">
                                                <i className="fas fa-tint me-2 text-primary"></i>
                                                Watering
                                            </h6>
                                            <p className="mb-0 small">{careTips.watering}</p>
                                        </div>
                                    </div>
                                )}

                                {careTips.sunlight && (
                                    <div className="care-tip-card card mb-3 border-0">
                                        <div className="card-body">
                                            <h6 className="fw-bold">
                                                <i className="fas fa-sun me-2 text-warning"></i>
                                                Sunlight
                                            </h6>
                                            <p className="mb-0 small">{careTips.sunlight}</p>
                                        </div>
                                    </div>
                                )}

                                {careTips.soil && (
                                    <div className="care-tip-card card mb-3 border-0">
                                        <div className="card-body">
                                            <h6 className="fw-bold">
                                                <i className="fas fa-seedling me-2 text-success"></i>
                                                Soil
                                            </h6>
                                            <p className="mb-0 small">{careTips.soil}</p>
                                        </div>
                                    </div>
                                )}

                                {careTips.temperature && (
                                    <div className="care-tip-card card mb-3 border-0">
                                        <div className="card-body">
                                            <h6 className="fw-bold">
                                                <i className="fas fa-thermometer-half me-2 text-info"></i>
                                                Temperature
                                            </h6>
                                            <p className="mb-0 small">{careTips.temperature}</p>
                                        </div>
                                    </div>
                                )}

                                {careTips.fertilizer && (
                                    <div className="care-tip-card card mb-3 border-0">
                                        <div className="card-body">
                                            <h6 className="fw-bold">
                                                <i className="fas fa-flask me-2 text-secondary"></i>
                                                Fertilizer
                                            </h6>
                                            <p className="mb-0 small">{careTips.fertilizer}</p>
                                        </div>
                                    </div>
                                )}

                                {careTips.pruning && (
                                    <div className="care-tip-card card mb-3 border-0">
                                        <div className="card-body">
                                            <h6 className="fw-bold">
                                                <i className="fas fa-cut me-2 text-danger"></i>
                                                Pruning
                                            </h6>
                                            <p className="mb-0 small">{careTips.pruning}</p>
                                        </div>
                                    </div>
                                )}

                                {careTips.commonIssues && careTips.commonIssues.length > 0 && (
                                    <div className="care-tip-card card border-0">
                                        <div className="card-body">
                                            <h6 className="fw-bold">
                                                <i className="fas fa-exclamation-triangle me-2 text-warning"></i>
                                                Common Issues
                                            </h6>
                                            <ul className="mb-0 small">
                                                {careTips.commonIssues.map((issue, index) => (
                                                    <li key={index}>{issue}</li>
                                                ))}
                                            </ul>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default Results;
