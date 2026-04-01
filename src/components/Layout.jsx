import React, { useState, useEffect } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import Sidebar from './Sidebar';
import ThemeToggle from './ThemeToggle';
import { useAuth } from '../context/AuthContext';
import { ThemeProvider } from '../context/ThemeContext';

const Layout = () => {
    const [history, setHistory] = useState([]);
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const location = useLocation();
    const navigate = useNavigate();
    const { user, logout } = useAuth();

    // Get current page from location
    const currentPage = location.pathname.split('/').pop() || 'dashboard';

    // Load history from localStorage on mount
    useEffect(() => {
        const savedHistory = localStorage.getItem('vpca_history');
        if (savedHistory) {
            try {
                setHistory(JSON.parse(savedHistory));
            } catch (error) {
                console.error('Error loading history:', error);
            }
        }
    }, []);

    // Save history to localStorage whenever it changes
    useEffect(() => {
        if (history.length > 0) {
            localStorage.setItem('vpca_history', JSON.stringify(history));
        }
    }, [history]);

    const handlePageChange = (page) => {
        navigate(`/${page}`);
    };

    const handleLogout = () => {
        logout();
        navigate('/login', { replace: true });
    };

    return (
        <ThemeProvider>
            <div className="container-fluid p-0">
                <div className="row g-0">
                    <Sidebar 
                        activePage={currentPage}
                        onPageChange={handlePageChange}
                        user={user}
                        onLogout={handleLogout}
                        onMobileMenuToggle={setIsMobileMenuOpen}
                    />
                    <div className="col-12 col-md-9 col-lg-10">
                        <div className="main-content">
                            <div className="d-flex justify-content-end mb-3">
                                <ThemeToggle />
                            </div>
                            <Outlet context={{ history, setHistory }} />
                        </div>
                    </div>
                </div>
            </div>
        </ThemeProvider>
    );
};

export default Layout;
