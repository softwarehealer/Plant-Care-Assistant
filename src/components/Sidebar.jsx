import React, { useState, useEffect } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import '../App.css';

const Sidebar = ({ activePage, onPageChange, user, onLogout, onMobileMenuToggle }) => {
    const navigate = useNavigate();
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    
    const menuItems = [
        { id: 'dashboard', path: '/dashboard', icon: 'fa-home', label: 'Dashboard' },
        { id: 'identify', path: '/identify', icon: 'fa-camera', label: 'Identify Plant' },
        { id: 'diagnosis', path: '/diagnosis', icon: 'fa-stethoscope', label: 'Disease Diagnosis' },
        { id: 'care-tips', path: '/care-tips', icon: 'fa-lightbulb', label: 'Care Tips' },
        { id: 'history', path: '/history', icon: 'fa-history', label: 'History' }
    ];

    const handleNavClick = (path) => {
        navigate(path);
        if (onPageChange) {
            onPageChange(path.split('/').pop());
        }
        // Close mobile menu after navigation
        setIsMobileMenuOpen(false);
        if (onMobileMenuToggle) {
            onMobileMenuToggle(false);
        }
    };

    const handleLogoClick = (e) => {
        // On mobile, toggle menu; on desktop, navigate
        const isMobile = window.innerWidth < 768;
        if (isMobile) {
            e.stopPropagation();
            const newState = !isMobileMenuOpen;
            setIsMobileMenuOpen(newState);
            if (onMobileMenuToggle) {
                onMobileMenuToggle(newState);
            }
        } else {
            navigate('/dashboard');
            if (onPageChange) {
                onPageChange('dashboard');
            }
        }
    };

    // Close menu when clicking outside on mobile
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (window.innerWidth < 768 && isMobileMenuOpen) {
                const sidebar = document.querySelector('.sidebar');
                if (sidebar && !sidebar.contains(event.target)) {
                    setIsMobileMenuOpen(false);
                    if (onMobileMenuToggle) {
                        onMobileMenuToggle(false);
                    }
                }
            }
        };

        if (isMobileMenuOpen) {
            document.addEventListener('mousedown', handleClickOutside);
        }

        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [isMobileMenuOpen, onMobileMenuToggle]);

    return (
        <>
            <div className="sidebar col-12 col-md-3 col-lg-2 p-3">
                <div 
                    className="d-flex align-items-center mb-4 logo-container" 
                    style={{ cursor: 'pointer' }}
                    onClick={handleLogoClick}
                >
                    <div className="brand-icon" style={{ width: '50px', height: '50px', margin: '0' }}>
                        <i className="fas fa-leaf fa-2x text-success"></i>
                    </div>
                    <h5 className="ms-2 mb-0 fw-bold sidebar-title">PlantCare AI</h5>
                </div>

                <nav className={`nav flex-column sidebar-nav ${isMobileMenuOpen ? 'mobile-menu-open' : ''}`}>
                    {menuItems.map(item => (
                        <NavLink
                            key={item.id}
                            to={item.path}
                            className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
                            onClick={() => handleNavClick(item.path)}
                        >
                            <i className={`fas ${item.icon} me-2`}></i>
                            {item.label}
                        </NavLink>
                    ))}
                    
                    {/* User info and logout in mobile menu */}
                    <div className={`mt-3 pt-3 border-top sidebar-user-info-mobile ${isMobileMenuOpen ? 'mobile-menu-open' : ''}`}>
                        <div className="d-flex align-items-center mb-3">
                            <div className="bg-light rounded-circle d-flex align-items-center justify-content-center" 
                                 style={{ width: '40px', height: '40px' }}>
                                <i className="fas fa-user text-success"></i>
                            </div>
                            <div className="ms-2">
                                <div className="fw-semibold small">{user?.name || 'User'}</div>
                                <div className="text-muted small">{user?.email || ''}</div>
                            </div>
                        </div>
                        <button 
                            className="btn btn-outline-danger btn-sm w-100"
                            onClick={onLogout}
                        >
                            <i className="fas fa-sign-out-alt me-2"></i>Logout
                        </button>
                    </div>
                </nav>

                <div className="mt-auto pt-4 border-top sidebar-user-info">
                    <div className="d-flex align-items-center mb-3">
                        <div className="bg-light rounded-circle d-flex align-items-center justify-content-center" 
                             style={{ width: '40px', height: '40px' }}>
                            <i className="fas fa-user text-success"></i>
                        </div>
                        <div className="ms-2">
                            <div className="fw-semibold small">{user?.name || 'User'}</div>
                            <div className="text-muted small">{user?.email || ''}</div>
                        </div>
                    </div>
                    <button 
                        className="btn btn-outline-danger btn-sm w-100"
                        onClick={onLogout}
                    >
                        <i className="fas fa-sign-out-alt me-2"></i>Logout
                    </button>
                </div>
            </div>
        </>
    );
};

export default Sidebar;
