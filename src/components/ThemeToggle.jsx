import React from 'react';
import { useTheme } from '../context/ThemeContext';
import '../App.css';

const ThemeToggle = () => {
    const { isDarkMode, toggleTheme } = useTheme();

    return (
        <button
            className={`btn btn-outline-secondary btn-sm theme-toggle-btn ${isDarkMode ? 'dark-mode-active' : 'light-mode-active'}`}
            onClick={toggleTheme}
            title={isDarkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
        >
            {isDarkMode ? (
                <>
                    <i className="fas fa-sun me-2"></i>
                    Light Mode
                </>
            ) : (
                <>
                    <i className="fas fa-moon me-2"></i>
                    Dark Mode
                </>
            )}
        </button>
    );
};

export default ThemeToggle;







