import React from 'react';
import { useNavigate } from 'react-router-dom';
import '../App.css';

const Dashboard = ({ stats, history }) => {
    const navigate = useNavigate();
    const statCards = [
        { 
            title: 'Total Scans', 
            value: stats?.totalScans || 0, 
            icon: 'fa-camera', 
            color: 'var(--primary-green)',
            bg: 'var(--light-green)'
        },
        { 
            title: 'Plants Identified', 
            value: stats?.plantsIdentified || 0, 
            icon: 'fa-leaf', 
            color: '#3b82f6',
            bg: '#dbeafe'
        },
        { 
            title: 'Diseases Detected', 
            value: stats?.diseasesDetected || 0, 
            icon: 'fa-exclamation-triangle', 
            color: '#f59e0b',
            bg: '#fef3c7'
        },
        { 
            title: 'Healthy Plants', 
            value: stats?.healthyPlants || 0, 
            icon: 'fa-check-circle', 
            color: '#10b981',
            bg: '#d1fae5'
        }
    ];

    const recentHistory = history?.slice(0, 5) || [];

    return (
        <div>
            <div className="d-flex justify-content-between align-items-center mb-4">
                <h2 className="fw-bold">Dashboard</h2>
                <span className="text-muted">Welcome back!</span>
            </div>

            <div className="row g-4 mb-4 dashboard-stats">
                {statCards.map((stat, index) => (
                    <div key={index} className="col-md-6 col-lg-3">
                        <div className="card stat-card h-100" style={{ borderLeftColor: stat.color }}>
                            <div className="card-body">
                                <div className="d-flex justify-content-between align-items-center">
                                    <div>
                                        <h6 className="text-muted mb-2">{stat.title}</h6>
                                        <h3 className="fw-bold mb-0">{stat.value}</h3>
                                    </div>
                                    <div 
                                        className="rounded-circle d-flex align-items-center justify-content-center"
                                        style={{ 
                                            width: '60px', 
                                            height: '60px', 
                                            background: stat.bg,
                                            color: stat.color
                                        }}
                                    >
                                        <i className={`fas ${stat.icon} fa-2x`}></i>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            <div className="row dashboard-bottom-row">
                <div className="col-lg-8 mb-4">
                    <div className="card">
                        <div className="card-header bg-white">
                            <h5 className="mb-0 fw-bold">Recent Activity</h5>
                        </div>
                        <div className="card-body">
                            {recentHistory.length > 0 ? (
                                <div className="list-group list-group-flush">
                                    {recentHistory.map((item, index) => (
                                        <div key={index} className="list-group-item px-0 history-item">
                                            <div className="d-flex justify-content-between align-items-center">
                                                <div>
                                                    <h6 className="mb-1">{item.plantName || 'Unknown Plant'}</h6>
                                                    <small className="text-muted">
                                                        {item.date || new Date().toLocaleDateString()}
                                                    </small>
                                                </div>
                                                {item.type === 'diagnosis' && item.isHealthy !== null ? (
                                                    <span className={`disease-badge ${item.isHealthy ? 'healthy' : 'diseased'}`}>
                                                        {item.isHealthy ? 'Healthy' : 'Diseased'}
                                                    </span>
                                                ) : (
                                                    <span className="badge bg-info">Identified</span>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="text-center text-muted py-5">
                                    <i className="fas fa-history fa-3x mb-3"></i>
                                    <p>No activity yet. Start by identifying a plant!</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                <div className="col-lg-4">
                    <div className="card">
                        <div className="card-header bg-white">
                            <h5 className="mb-0 fw-bold">Quick Actions</h5>
                        </div>
                        <div className="card-body">
                            <div className="d-grid gap-2">
                                <button 
                                    className="btn btn-primary"
                                    onClick={() => navigate('/identify')}
                                >
                                    <i className="fas fa-camera me-2"></i>Identify New Plant
                                </button>
                                <button 
                                    className="btn btn-outline-success"
                                    onClick={() => navigate('/care-tips')}
                                >
                                    <i className="fas fa-book me-2"></i>View Care Guide
                                </button>
                                <button 
                                    className="btn btn-outline-info"
                                    onClick={() => navigate('/history')}
                                >
                                    <i className="fas fa-chart-line me-2"></i>View History
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Dashboard;

