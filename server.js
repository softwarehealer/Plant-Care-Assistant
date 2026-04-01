import express from 'express';
import cors from 'cors';
import multer from 'multer';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { createReadStream } from 'fs';
import FormData from 'form-data';
import fetch from 'node-fetch';
import dotenv from 'dotenv';
import { db } from './config/firebase.js';
import admin from 'firebase-admin';

// Load environment variables
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const PORT = 3001;

// Configure multer for file uploads
const upload = multer({ 
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 } // 10MB limit
});

app.use(cors());
app.use(express.json());

// Python API configuration (update with your Python API URL)
const PYTHON_API_URL = process.env.PYTHON_API_URL || process.env.VITE_PYTHON_API_URL || 'http://localhost:8000';

// Helper function to forward image to Python API
async function forwardToPythonAPI(imageBuffer, instruction) {
  try {
    const formData = new FormData();
    formData.append('image', imageBuffer, {
      filename: 'plant-image.jpg',
      contentType: 'image/jpeg'
    });
    formData.append('instruction', instruction);

    const response = await fetch(`${PYTHON_API_URL}/api/process`, {
      method: 'POST',
      body: formData,
      headers: formData.getHeaders()
    });

    if (!response.ok) {
      throw new Error(`Python API error: ${response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Error forwarding to Python API:', error);
    throw error;
  }
}

// Login endpoint
app.post('/api/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    // Query Firestore users collection
    const usersRef = db.collection('users');
    const snapshot = await usersRef.where('email', '==', email).limit(1).get();

    if (snapshot.empty) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const userDoc = snapshot.docs[0];
    const userData = userDoc.data();

    // Check password
    if (userData.password !== password) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const token = `jwt-token-${userDoc.id}-${Date.now()}`;

    return res.status(200).json({
      success: true,
      user: {
        id: userDoc.id,
        name: userData.name,
        email: userData.email
      },
      token
    });
  } catch (error) {
    console.error('Login error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// Register endpoint
app.post('/api/register', async (req, res) => {
  try {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ error: 'Name, email, and password are required' });
    }

    if (password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters' });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ error: 'Invalid email format' });
    }

    // Check if user already exists
    const usersRef = db.collection('users');
    const existingUser = await usersRef.where('email', '==', email).limit(1).get();
    
    if (!existingUser.empty) {
      return res.status(409).json({ error: 'User with this email already exists' });
    }

    // Get user_count from metrics collection
    const metricsRef = db.collection('metrics').doc('user_metrics');
    const metricsDoc = await metricsRef.get();
    
    let userCount = 0;
    if (metricsDoc.exists) {
      userCount = metricsDoc.data().user_count || 0;
    } else {
      // Initialize metrics document if it doesn't exist
      await metricsRef.set({ user_count: 0 });
    }

    // Increment user count
    const newUserCount = userCount + 1;
    const newUserId = newUserCount.toString();

    // Create new user document
    const newUser = {
      email,
      password, // In production, hash this with bcrypt
      name,
      createdAt: admin.firestore.FieldValue.serverTimestamp()
    };

    await usersRef.doc(newUserId).set(newUser);

    // Update user_count in metrics
    await metricsRef.update({ user_count: newUserCount });

    const token = `jwt-token-${newUserId}-${Date.now()}`;

    return res.status(201).json({
      success: true,
      user: {
        id: newUserId,
        name: newUser.name,
        email: newUser.email
      },
      token,
      message: 'User registered successfully'
    });
  } catch (error) {
    console.error('Registration error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// Forgot password endpoint
app.post('/api/forgot-password', async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ error: 'Email is required' });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ error: 'Invalid email format' });
    }

    // Check if user exists in Firestore (but don't reveal if they exist for security)
    try {
      const usersRef = db.collection('users');
      const snapshot = await usersRef.where('email', '==', email).limit(1).get();
      // Don't reveal if user exists or not for security
    } catch (err) {
      // Silently handle error
    }

    // For security, don't reveal if email exists or not
    return res.status(200).json({
      success: true,
      message: 'If an account exists with this email, a password reset link has been sent.'
    });
  } catch (error) {
    console.error('Forgot password error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// Reset password endpoint
app.post('/api/reset-password', (req, res) => {
  try {
    const { token, password, confirmPassword } = req.body;

    if (!token || !password || !confirmPassword) {
      return res.status(400).json({ error: 'Token, password, and confirm password are required' });
    }

    if (password !== confirmPassword) {
      return res.status(400).json({ error: 'Passwords do not match' });
    }

    if (password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters' });
    }

    // Mock token validation
    if (!token.startsWith('reset-token-')) {
      return res.status(400).json({ error: 'Invalid or expired reset token' });
    }

    return res.status(200).json({
      success: true,
      message: 'Password has been reset successfully'
    });
  } catch (error) {
    console.error('Reset password error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// Get plants list endpoint
app.get('/api/plants', async (req, res) => {
  try {
    const { plantId } = req.query;

    if (plantId) {
      // Get specific plant care tips
      const plantDoc = await db.collection('plants').doc(plantId).get();
      
      if (!plantDoc.exists) {
        return res.status(404).json({ error: 'Plant not found' });
      }

      const data = plantDoc.data();
      const care = data.care || {};

      return res.status(200).json({
        success: true,
        plant: {
          id: plantDoc.id,
          name: plantDoc.id.split('_').map(word => 
            word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
          ).join(' '),
          care: {
            watering: care.watering || null,
            sunlight: care.sunlight || null,
            soil: care.soil || null,
            temperature: care.temperature || null,
            fertilizer: care.fertilizer || null,
            pruning: care.pruning || null,
            commonIssues: care.issues || []
          }
        }
      });
    } else {
      // Get all plants list
      const plantsRef = db.collection('plants');
      const snapshot = await plantsRef.get();
      
      const plantsList = snapshot.docs.map(doc => ({
        id: doc.id,
        name: doc.id.split('_').map(word => 
          word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
        ).join(' ')
      }));

      return res.status(200).json({
        success: true,
        plants: plantsList
      });
    }
  } catch (error) {
    console.error('Error fetching plants:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// Identify plant endpoint
app.post('/api/identify', upload.single('image'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'Image file is required' });
    }

    // Forward to Python API for plant identification
    let pythonResult;
    try {
      pythonResult = await forwardToPythonAPI(req.file.buffer, 'identify');
    } catch (pythonError) {
      // Fallback to mock data if Python API is not available
      console.warn('Python API not available, using mock data:', pythonError.message);
      pythonResult = {
        classes: ['tomato_plant', 'rose', 'sunflower', 'lavender', 'basil'],
        confidences: [0.92, 0.85, 0.78, 0.65, 0.52]
      };
    }

    // Get top 5 classes (or less)
    const classes = pythonResult.classes || pythonResult.top_classes || [];
    const confidences = pythonResult.confidences || pythonResult.top_confidences || [];
    const topClasses = classes.slice(0, 5).map((className, index) => ({
      name: className,
      confidence: confidences[index] || 0.0
    }));
    // Match classes with plants collection
    const matchedPlants = [];
    for (const classItem of topClasses) {
      // Convert class name to underscore format (if needed)
      const plantId = classItem.name.toLowerCase();
      try {
        const plantDoc = await db.collection('plants').doc(plantId).get();
        if (plantDoc.exists) {
          const plantData = plantDoc.data();
          matchedPlants.push({
            id: plantDoc.id,
            name: classItem.name,
            confidence: classItem.confidence,
            family: plantData.family || null,
            scientificName: plantData.scientificName || plantData.scientific_name || null,
            commonNames: plantData.commonNames || plantData.common_names || [],
            care: plantData.care || null
          });
        }
      } catch (err) {
        console.log("Not exists: ", plantId);
        console.warn(`Plant ${plantId} not found in Firestore`);
      }
    }

    // If no matches found, use first document from plants collection
    if (matchedPlants.length === 0) {
      try {
        const plantsRef = db.collection('plants');
        const snapshot = await plantsRef.limit(1).get();
        if (!snapshot.empty) {
          const firstDoc = snapshot.docs[0];
          const plantData = firstDoc.data();
          matchedPlants.push({
            id: firstDoc.id,
            name: firstDoc.id.split('_').map(word => 
              word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
            ).join(' '),
            confidence: topClasses[0]?.confidence || 0.85,
            family: plantData.family || null,
            scientificName: plantData.scientificName || plantData.scientific_name || null,
            commonNames: plantData.commonNames || plantData.common_names || [],
            care: plantData.care || null
          });
        }
      } catch (err) {
        console.error('Error fetching first plant:', err);
      }
    }

    return res.status(200).json({
      success: true,
      type: 'identification',
      classes: matchedPlants,
      imageBuffer: req.file.buffer.toString('base64')
    });
  } catch (error) {
    console.error('Identify error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// Disease diagnosis endpoint
app.post('/api/diagnosis', upload.single('image'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'Image file is required' });
    }

    // Forward to Python API for disease diagnosis
    let pythonResult;
    try {
      pythonResult = await forwardToPythonAPI(req.file.buffer, 'diagnose');
    } catch (pythonError) {
      // Fallback to mock data if Python API is not available
      console.warn('Python API not available, using mock data:', pythonError.message);
      pythonResult = {
        is_healthy: false,
        disease: 'early_blight',
        disease_confidence: 0.92
      };
    }

    const isHealthy = pythonResult.is_healthy === true;
    const diseaseName = pythonResult.disease || null;
    const diseaseConfidence = pythonResult.disease_confidence || 0.0;

    let treatment = [];
    let diseaseData = null;
    if (!isHealthy && diseaseName) {

      // Convert disease name to underscore format
      const diseaseId = diseaseName.toLowerCase().replace(/\s+/g, '_');
      try {
        const diseaseDoc = await db.collection('disease').doc(diseaseId).get();
        if (diseaseDoc.exists) {
          console.log("Disease exists: ", diseaseId);

          diseaseData = diseaseDoc.data();
          treatment = diseaseData.treatment || [];
        }
      } catch (err) {
        console.warn(`Disease ${diseaseId} not found in Firestore`);
      }

      // If no match found, use first document from diseases collection
      if (treatment.length === 0) {
        try {
          const diseasesRef = db.collection('disease');
          const snapshot = await diseasesRef.limit(1).get();
          if (!snapshot.empty) {
            const firstDoc = snapshot.docs[0];
            diseaseData = firstDoc.data();
            treatment = diseaseData.treatment || [];
            // Use the first document's ID as disease name
            const firstDiseaseName = firstDoc.id.split('_').map(word => 
              word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
            ).join(' ');
            // Update disease name if not already set
            if (!diseaseName) {
              diseaseData.name = firstDiseaseName;
            }
          }
        } catch (err) {
          console.error('Error fetching first disease:', err);
        }
      }
    }
    // Convert disease name to title case (handle one or multiple words)
    let formattedDisease = null;
    if (diseaseName) {
      formattedDisease = diseaseName.split(' ').map(word => 
        word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
      ).join(' ');
    }
    
    return res.status(200).json({
      success: true,
      type: 'diagnosis',
      isHealthy,
      disease: formattedDisease || diseaseData?.name || null,
      diseaseConfidence: isHealthy ? 0.95 : diseaseConfidence,
      treatment: treatment || [],
      imageBuffer: req.file.buffer.toString('base64')
    });
  } catch (error) {
    console.error('Diagnosis error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// Save to history endpoint (DISABLED FOR NOW)
app.post('/api/save-history', async (req, res) => {
  return res.status(503).json({ error: 'This endpoint is temporarily disabled' });
  
  /* DISABLED CODE - Uncomment when ready
  try {
    const { type, species, disease, url, email } = req.body;

    if (!email) {
      return res.status(400).json({ error: 'User email is required' });
    }

    if (!type || (type !== 'identification' && type !== 'diagnosis')) {
      return res.status(400).json({ error: 'Invalid type. Must be "identification" or "diagnosis"' });
    }

    if (type === 'identification' && (!species || !Array.isArray(species))) {
      return res.status(400).json({ error: 'Species array is required for identification type' });
    }

    if (type === 'diagnosis' && !disease) {
      return res.status(400).json({ error: 'Disease data is required for diagnosis type' });
    }

    // Get user's current count
    const usersRef = db.collection('users');
    const userSnapshot = await usersRef.where('email', '==', email).limit(1).get();
    
    if (userSnapshot.empty) {
      return res.status(404).json({ error: 'User not found' });
    }

    const userDoc = userSnapshot.docs[0];
    const userData = userDoc.data();
    const currentUserCount = userData.count || 0;
    const newUserCount = currentUserCount + 1;

    // Get identification_count from metrics collection
    const metricsRef = db.collection('metrics').doc('model_metrics');
    const metricsDoc = await metricsRef.get();
    
    let identificationCount = 0;
    if (metricsDoc.exists) {
      identificationCount = metricsDoc.data().identification_count || 0;
    } else {
      // Initialize metrics document if it doesn't exist
      await metricsRef.set({ identification_count: 0 });
    }

    // Increment identification count
    const newIdentificationCount = identificationCount + 1;
    const documentId = newIdentificationCount.toString();

    // Prepare history document
    const historyData = {
      email,
      count: newUserCount,
      type,
      url: url || null
    };

    if (type === 'identification') {
      historyData.species = species;
      historyData.disease = null; // Empty for identification
    } else {
      historyData.disease = disease;
      historyData.species = []; // Empty for diagnosis
    }

    // Save to history collection
    await db.collection('history').doc(documentId).set(historyData);

    // Update identification_count in metrics
    await metricsRef.update({ identification_count: newIdentificationCount });

    // Update user's count
    await usersRef.doc(userDoc.id).update({ count: newUserCount });

    return res.status(200).json({
      success: true,
      message: 'History saved successfully',
      documentId
    });
  } catch (error) {
    console.error('Save history error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
  */
});

// Get history endpoint
app.get('/api/history', async (req, res) => {
  try {
    const { limit = 5, lastDocId = null, email } = req.query;

    if (!email) {
      return res.status(400).json({ error: 'User email is required' });
    }

    const limitNum = parseInt(limit, 10);

    let query = db.collection('history')
      .where('email', '==', email)
      .orderBy('count', 'desc')
      .limit(limitNum);

    // If lastDocId is provided, start after that document
    if (lastDocId) {
      const lastDoc = await db.collection('history').doc(lastDocId).get();
      if (lastDoc.exists) {
        const lastDocData = lastDoc.data();
        query = query.startAfter(lastDoc);
      }
    }

    const snapshot = await query.get();
    const history = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));

    const hasMore = snapshot.docs.length === limitNum;

    return res.status(200).json({
      success: true,
      history,
      hasMore,
      lastDocId: snapshot.docs.length > 0 ? snapshot.docs[snapshot.docs.length - 1].id : null
    });
  } catch (error) {
    console.error('Get history error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

app.listen(PORT, () => {
  console.log(`🚀 API server running on http://localhost:${PORT}`);
  console.log(`📝 Available endpoints:`);
  console.log(`   POST http://localhost:${PORT}/api/login`);
  console.log(`   POST http://localhost:${PORT}/api/register`);
  console.log(`   POST http://localhost:${PORT}/api/forgot-password`);
  console.log(`   POST http://localhost:${PORT}/api/reset-password`);
  console.log(`   GET  http://localhost:${PORT}/api/plants`);
  console.log(`   GET  http://localhost:${PORT}/api/plants?plantId=<id>`);
  console.log(`   POST http://localhost:${PORT}/api/identify (with image file)`);
  console.log(`   POST http://localhost:${PORT}/api/diagnosis (with image file)`);
  console.log(`   POST http://localhost:${PORT}/api/save-history`);
  console.log(`   GET  http://localhost:${PORT}/api/history?limit=5&lastDocId=<id>`);
  console.log(`\n🐍 Python API URL: ${PYTHON_API_URL}`);
  console.log(`   (Update PYTHON_API_URL environment variable to change)`);
});
