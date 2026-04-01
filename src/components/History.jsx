import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import '../App.css';

const History = () => {
    const [history, setHistory] = useState([]);
    const [loading, setLoading] = useState(true);
    const [hasMore, setHasMore] = useState(false);
    const [lastDocId, setLastDocId] = useState(null);
    const [loadingMore, setLoadingMore] = useState(false);
    const navigate = useNavigate();
    const { user } = useAuth();

    useEffect(() => {
        if (user?.email) {
            fetchHistory();
        }
    }, [user?.email]);

    const fetchHistory = async (loadMore = false) => {
        if (!user?.email) return;

        try {
            if (loadMore) {
                setLoadingMore(true);
            } else {
                setLoading(true);
            }

            const url = lastDocId && loadMore 
                ? `/api/history?limit=5&lastDocId=${lastDocId}&email=${encodeURIComponent(user.email)}`
                : `/api/history?limit=5&email=${encodeURIComponent(user.email)}`;

            const response = await fetch(url);
            if (!response.ok) {
                throw new Error('Failed to fetch history');
            }

            const data = await response.json();
            
            if (loadMore) {
                setHistory(prev => [...prev, ...data.history]);
            } else {
                setHistory(data.history);
            }
            
            setHasMore(data.hasMore);
            setLastDocId(data.lastDocId);
        } catch (error) {
            console.error('Error fetching history:', error);
            alert('Failed to load history. Please try again.');
        } finally {
            setLoading(false);
            setLoadingMore(false);
        }
    };


    const getDisplayName = (item) => {
        if (item.type === 'identification' && item.species && item.species.length > 0) {
            return item.species[0].name;
        } else if (item.type === 'diagnosis' && item.disease) {
            return item.disease.name;
        }
        return 'Unknown';
    };

    const getConfidence = (item) => {
        if (item.type === 'identification' && item.species && item.species.length > 0) {
            return item.species[0].confidence;
        } else if (item.type === 'diagnosis' && item.disease) {
            return item.disease.confidence;
        }
        return 0;
    };

    if (loading) {
        return (
            <div>
                <div className="d-flex justify-content-between align-items-center mb-4">
                    <h2 className="fw-bold">History</h2>
                </div>
                <div className="card">
                    <div className="card-body text-center py-5">
                        <div className="spinner-border text-primary" role="status">
                            <span className="visually-hidden">Loading...</span>
                        </div>
                        <p className="mt-3 text-muted">Loading history...</p>
                    </div>
                </div>
            </div>
        );
    }

    if (history.length === 0) {
        return (
            <div>
                <div className="d-flex justify-content-between align-items-center mb-4">
                    <h2 className="fw-bold">History</h2>
                </div>
                <div className="card">
                    <div className="card-body text-center text-muted py-5">
                        <i className="fas fa-history fa-3x mb-3"></i>
                        <p>No history yet.</p>
                        <p className="small">Start identifying plants or diagnosing diseases to see your history here.</p>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div>
            <div className="d-flex justify-content-between align-items-center mb-4">
                <h2 className="fw-bold">History</h2>
                <span className="text-muted">{history.length} {history.length === 1 ? 'entry' : 'entries'}</span>
            </div>

            <div className="card">
                <div className="card-body">
                    <div className="list-group list-group-flush">
                        {history.map((item, index) => (
                            <div 
                                key={item.id || index} 
                                className="list-group-item px-3 history-item mb-2"
                                style={{ borderRadius: '0.5rem', border: '1px solid var(--border-color)' }}
                            >
                                <div className="row align-items-center">
                                    <div className="col-md-2">
                                        {item.url && (
                                            <img 
                                                src={item.url} 
                                                alt={getDisplayName(item)}
                                                className="img-fluid rounded"
                                                style={{ maxHeight: '80px', objectFit: 'cover', width: '100%' }}
                                                onError={(e) => {
                                                    e.target.style.display = 'none';
                                                }}
                                            />
                                        )}
                                    </div>
                                    <div className="col-md-6">
                                        <h6 className="mb-1 fw-bold">{getDisplayName(item)}</h6>
                                        <small className={`d-block mb-1 ${item.type === 'diagnosis' && item.disease ? 'text-danger' : 'text-muted'}`}>
                                            <i className={`fas ${item.type === 'identification' ? 'fa-leaf' : 'fa-stethoscope'} me-1`}></i>
                                            {item.type === 'identification' ? 'Plant Identification' : 'Disease Diagnosis'}
                                        </small>
                                    </div>
                                    <div className="col-md-2 text-center">
                                        {item.type === 'diagnosis' && (
                                            <span className={`disease-badge ${!item.disease ? 'healthy' : 'diseased'}`}>
                                                {!item.disease ? (
                                                    <>
                                                        <i className="fas fa-check-circle me-1"></i>
                                                        Healthy
                                                    </>
                                                ) : (
                                                    <>
                                                        <i className="fas fa-exclamation-triangle me-1"></i>
                                                        Diseased
                                                    </>
                                                )}
                                            </span>
                                        )}
                                    </div>
                                    <div className="col-md-2 text-end">
                                        <span className="text-muted small">
                                            {(getConfidence(item) * 100).toFixed(0)}% match
                                        </span>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                    
                    {hasMore && (
                        <div className="text-center mt-4">
                            <button
                                className="btn btn-outline-primary"
                                onClick={() => fetchHistory(true)}
                                disabled={loadingMore}
                            >
                                {loadingMore ? (
                                    <>
                                        <span className="spinner-border spinner-border-sm me-2"></span>
                                        Loading...
                                    </>
                                ) : (
                                    <>
                                        <i className="fas fa-arrow-down me-2"></i>
                                        Load More
                                    </>
                                )}
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default History;
