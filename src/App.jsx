import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useOutletContext, useNavigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import Layout from './components/Layout';
import Login from './components/Login';
import Register from './components/Register';
import ForgotPassword from './components/ForgotPassword';
import Dashboard from './components/Dashboard';
import PlantIdentification from './components/PlantIdentification';
import PlantDiagnosis from './components/PlantDiagnosis';
import Results from './components/Results';
import CareTips from './components/CareTips';
import History from './components/History';
import './App.css';

// Public route that redirects to dashboard if authenticated
const PublicRoute = ({ children }) => {
  const { isAuthenticated } = useAuth();
  return isAuthenticated ? <Navigate to="/dashboard" replace /> : children;
};

// Dashboard page component
const DashboardPage = () => {
  const context = useOutletContext();
  const { user } = useAuth();
  const [stats, setStats] = useState({
    totalScans: 0,
    plantsIdentified: 0,
    diseasesDetected: 0,
    healthyPlants: 0
  });
  const [historyState, setHistoryState] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDashboardData = async () => {
      if (!user?.email) {
        setLoading(false);
        return;
      }

      try {
        // Fetch user stats
        const statsResponse = await fetch(`/api/user-stats?email=${encodeURIComponent(user.email)}`);
        if (statsResponse.ok) {
          const statsData = await statsResponse.json();
          if (statsData.success) {
            setStats({
              totalScans: statsData.stats.count || 0,
              plantsIdentified: statsData.stats.identifications || 0,
              diseasesDetected: statsData.stats.disease || 0,
              healthyPlants: statsData.stats.healthy || 0
            });
          }
        }

        // Fetch recent history
        const historyResponse = await fetch(`/api/history?email=${encodeURIComponent(user.email)}&limit=5`);
        if (historyResponse.ok) {
          const historyData = await historyResponse.json();
          if (historyData.success) {
            setHistoryState(historyData.history || []);
          }
        }
      } catch (error) {
        console.error('Error fetching dashboard data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, [user]);

  if (loading) {
    return (
      <div className="text-center py-5">
        <div className="spinner-border" role="status">
          <span className="visually-hidden">Loading...</span>
        </div>
      </div>
    );
  }

  return <Dashboard stats={stats} history={historyState} />;
};

// Results page component
const ResultsPage = () => {
  const context = useOutletContext();
  const [result] = useState(() => {
    const saved = sessionStorage.getItem('identificationResult');
    return saved ? JSON.parse(saved) : null;
  });

  const handleSave = (resultData) => {
    // Save is handled in Results component via API
    // This callback is just for notification
  };

  return <Results result={result} onSave={handleSave} />;
};

// History page component
const HistoryPage = () => {
  return <History />;
};

// Plant Identification page component
const IdentifyPage = () => {
  const navigate = useNavigate();
  
  const handleResult = (result) => {
    sessionStorage.setItem('identificationResult', JSON.stringify(result));
    navigate('/results');
  };

  return <PlantIdentification onIdentify={handleResult} onResult={handleResult} />;
};

// Plant Diagnosis page component
const DiagnosisPage = () => {
  return <PlantDiagnosis />;
};

function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<PublicRoute><Login /></PublicRoute>} />
      <Route path="/register" element={<PublicRoute><Register /></PublicRoute>} />
      <Route path="/forgot-password" element={<PublicRoute><ForgotPassword /></PublicRoute>} />
      
      <Route element={<ProtectedRoute><Layout /></ProtectedRoute>}>
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/identify" element={<IdentifyPage />} />
        <Route path="/diagnosis" element={<DiagnosisPage />} />
        <Route path="/results" element={<ResultsPage />} />
        <Route path="/care-tips" element={<CareTips />} />
        <Route path="/history" element={<HistoryPage />} />
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
      </Route>
      
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
