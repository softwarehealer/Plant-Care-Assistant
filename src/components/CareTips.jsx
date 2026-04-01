import React, { useState, useMemo, useEffect } from 'react';
import '../App.css';

const CareTips = () => {
    const [selectedPlant, setSelectedPlant] = useState(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [plants, setPlants] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [isMobilePlantCardOpen, setIsMobilePlantCardOpen] = useState(false);

    // Fetch plants from API
    useEffect(() => {
        const fetchPlants = async () => {
            try {
                setLoading(true);
                const response = await fetch('/api/plants');
                
                if (!response.ok) {
                    throw new Error('Failed to fetch plants');
                }

                const data = await response.json();
                setPlants(data.plants || []);
                setError('');
            } catch (err) {
                console.error('Error fetching plants:', err);
                setError('Failed to load plants. Please try again.');
            } finally {
                setLoading(false);
            }
        };

        fetchPlants();
    }, []);

    // Fetch care tips for selected plant
    useEffect(() => {
        const fetchCareTips = async () => {
            if (!selectedPlant) return;

            try {
                setLoading(true);
                const response = await fetch(`/api/plants?plantId=${selectedPlant.id}`);
                
                if (!response.ok) {
                    throw new Error('Failed to fetch care tips');
                }

                const data = await response.json();
                
                if (data.success && data.plant) {
                    setSelectedPlant({
                        ...selectedPlant,
                        tips: {
                            watering: data.plant.care.watering || 'Information not available',
                            sunlight: data.plant.care.sunlight || 'Information not available',
                            soil: data.plant.care.soil || 'Information not available',
                            temperature: data.plant.care.temperature || 'Information not available',
                            fertilizer: data.plant.care.fertilizer || 'Information not available',
                            pruning: data.plant.care.pruning || 'Information not available',
                            commonIssues: data.plant.care.commonIssues || []
                        }
                    });
                } else {
                    setError('Plant care information not found');
                }
            } catch (err) {
                console.error('Error fetching care tips:', err);
                setError('Failed to load care tips. Please try again.');
            } finally {
                setLoading(false);
            }
        };

        fetchCareTips();
    }, [selectedPlant?.id]);

    // Filter plants based on search query
    const filteredPlants = useMemo(() => {
        if (!searchQuery.trim()) {
            return plants;
        }
        return plants.filter(plant =>
            plant.name.toLowerCase().includes(searchQuery.toLowerCase())
        );
    }, [searchQuery, plants]);

    const handlePlantSelect = (plant) => {
        setSelectedPlant(plant);
        setError('');
        // Scroll to care tips section
        setTimeout(() => {
            const tipsSection = document.getElementById('care-tips-section');
            if (tipsSection) {
                tipsSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }
        }, 100);
    };

    return (
        <div>
            <div className="d-flex justify-content-between align-items-center mb-4">
                <h2 className="fw-bold">Plant Care Tips</h2>
                <span className="text-muted">Expert advice for healthy plants</span>
            </div>

            {error && (
                <div className="alert alert-danger mb-4" role="alert">
                    {error}
                </div>
            )}

            <div className="row">
                <div className="col-lg-4 mb-4">
                    <div className="card plant-selector-card">
                        <div 
                            className="card-header bg-white plant-selector-header"
                            onClick={() => {
                                const isMobile = window.innerWidth < 768;
                                if (isMobile) {
                                    setIsMobilePlantCardOpen(!isMobilePlantCardOpen);
                                }
                            }}
                        >
                            <div className="d-flex justify-content-between align-items-center">
                                <h5 className="mb-0 fw-bold">Select a Plant</h5>
                                <i className={`fas fa-chevron-${isMobilePlantCardOpen ? 'up' : 'down'} mobile-chevron`}></i>
                            </div>
                        </div>
                        <div className={`card-body plant-selector-body ${isMobilePlantCardOpen ? 'mobile-open' : ''}`}>
                            {loading && !selectedPlant ? (
                                <div className="text-center py-4">
                                    <div className="spinner-border text-success" role="status">
                                        <span className="visually-hidden">Loading...</span>
                                    </div>
                                </div>
                            ) : (
                                <>
                                    {/* Mobile: Search only */}
                                    <div className="mobile-plant-selector mb-3">
                                        <div className="input-group">
                                            <span className="input-group-text">
                                                <i className="fas fa-search"></i>
                                            </span>
                                            <input
                                                type="text"
                                                className="form-control"
                                                placeholder="Search plants..."
                                                value={searchQuery}
                                                onChange={(e) => setSearchQuery(e.target.value)}
                                                disabled={loading}
                                            />
                                        </div>
                                        <div className="list-group mt-3" style={{ maxHeight: '300px', overflowY: 'auto' }}>
                                            {filteredPlants.length > 0 ? (
                                                filteredPlants.map((plant) => (
                                                    <button
                                                        key={plant.id}
                                                        className={`list-group-item list-group-item-action ${
                                                            selectedPlant?.id === plant.id ? 'active' : ''
                                                        }`}
                                                        onClick={() => handlePlantSelect(plant)}
                                                    >
                                                        <i className="fas fa-leaf me-2"></i>
                                                        {plant.name}
                                                    </button>
                                                ))
                                            ) : (
                                                <div className="list-group-item text-center text-muted">
                                                    <i className="fas fa-search me-2"></i>
                                                    No plants found
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    {/* Desktop: List View */}
                                    <div className="desktop-plant-selector">
                                        <div className="mb-3">
                                            <div className="input-group">
                                                <span className="input-group-text">
                                                    <i className="fas fa-search"></i>
                                                </span>
                                                <input
                                                    type="text"
                                                    className="form-control"
                                                    placeholder="Search plants..."
                                                    value={searchQuery}
                                                    onChange={(e) => setSearchQuery(e.target.value)}
                                                    disabled={loading}
                                                />
                                            </div>
                                        </div>
                                        <div className="list-group" style={{ maxHeight: '400px', overflowY: 'auto' }}>
                                            {filteredPlants.length > 0 ? (
                                                filteredPlants.map((plant) => (
                                                    <button
                                                        key={plant.id}
                                                        className={`list-group-item list-group-item-action ${
                                                            selectedPlant?.id === plant.id ? 'active' : ''
                                                        }`}
                                                        onClick={() => handlePlantSelect(plant)}
                                                    >
                                                        <i className="fas fa-leaf me-2"></i>
                                                        {plant.name}
                                                    </button>
                                                ))
                                            ) : (
                                                <div className="list-group-item text-center text-muted">
                                                    <i className="fas fa-search me-2"></i>
                                                    No plants found
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </>
                            )}
                        </div>
                    </div>
                </div>

                <div className="col-lg-8" id="care-tips-section">
                    {loading && selectedPlant ? (
                        <div className="card">
                            <div className="card-body text-center py-5">
                                <div className="spinner-border text-success" role="status">
                                    <span className="visually-hidden">Loading...</span>
                                </div>
                                <p className="mt-3 text-muted">Loading care tips...</p>
                            </div>
                        </div>
                    ) : selectedPlant && selectedPlant.tips ? (
                        <div className="card">
                            <div className="card-header bg-white">
                                <h4 className="mb-0 fw-bold">
                                    <i className="fas fa-leaf me-2 text-success"></i>
                                    {selectedPlant.name} Care Guide
                                </h4>
                            </div>
                            <div className="card-body">
                                <div className="row g-3">
                                    <div className="col-md-6">
                                        <div className="care-tip-card card border-0">
                                            <div className="card-body">
                                                <h6 className="fw-bold">
                                                    <i className="fas fa-tint me-2 text-primary"></i>
                                                    Watering
                                                </h6>
                                                <p className="mb-0 small">{selectedPlant.tips.watering}</p>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="col-md-6">
                                        <div className="care-tip-card card border-0">
                                            <div className="card-body">
                                                <h6 className="fw-bold">
                                                    <i className="fas fa-sun me-2 text-warning"></i>
                                                    Sunlight
                                                </h6>
                                                <p className="mb-0 small">{selectedPlant.tips.sunlight}</p>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="col-md-6">
                                        <div className="care-tip-card card border-0">
                                            <div className="card-body">
                                                <h6 className="fw-bold">
                                                    <i className="fas fa-seedling me-2 text-success"></i>
                                                    Soil
                                                </h6>
                                                <p className="mb-0 small">{selectedPlant.tips.soil}</p>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="col-md-6">
                                        <div className="care-tip-card card border-0">
                                            <div className="card-body">
                                                <h6 className="fw-bold">
                                                    <i className="fas fa-thermometer-half me-2 text-info"></i>
                                                    Temperature
                                                </h6>
                                                <p className="mb-0 small">{selectedPlant.tips.temperature}</p>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="col-md-6">
                                        <div className="care-tip-card card border-0">
                                            <div className="card-body">
                                                <h6 className="fw-bold">
                                                    <i className="fas fa-flask me-2 text-secondary"></i>
                                                    Fertilizer
                                                </h6>
                                                <p className="mb-0 small">{selectedPlant.tips.fertilizer}</p>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="col-md-6">
                                        <div className="care-tip-card card border-0">
                                            <div className="card-body">
                                                <h6 className="fw-bold">
                                                    <i className="fas fa-cut me-2 text-danger"></i>
                                                    Pruning
                                                </h6>
                                                <p className="mb-0 small">{selectedPlant.tips.pruning}</p>
                                            </div>
                                        </div>
                                    </div>

                                    {selectedPlant.tips.commonIssues && selectedPlant.tips.commonIssues.length > 0 && (
                                        <div className="col-12">
                                            <div className="care-tip-card card border-0">
                                                <div className="card-body">
                                                    <h6 className="fw-bold mb-3">
                                                        <i className="fas fa-exclamation-triangle me-2 text-warning"></i>
                                                        Common Issues
                                                    </h6>
                                                    <div className="d-flex flex-wrap gap-2">
                                                        {selectedPlant.tips.commonIssues.map((issue, index) => (
                                                            <span key={index} className="badge bg-warning text-dark">
                                                                {issue}
                                                            </span>
                                                        ))}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="card">
                            <div className="card-body text-center text-muted py-5">
                                <i className="fas fa-hand-pointer fa-3x mb-3"></i>
                                <p>Select a plant from the list to view care tips</p>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default CareTips;
