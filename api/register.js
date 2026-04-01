import admin from 'firebase-admin';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { readFileSync } from 'fs';

// Initialize Firebase Admin SDK for Vercel serverless
let db;
try {
  const __filename = fileURLToPath(import.meta.url);
  const __dirname = dirname(__filename);
  
  const serviceAccount = JSON.parse(
    readFileSync(join(__dirname, '..', 'plant-care-assistant-5037d-firebase-adminsdk-fbsvc-23d12bdb1b.json'), 'utf8')
  );

  if (!admin.apps.length) {
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount)
    });
  }
  db = admin.firestore();
} catch (error) {
  console.error('Error initializing Firebase:', error);
}

export default async function handler(req, res) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ error: 'Name, email, and password are required' });
    }

    if (password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters' });
    }

    // Validate email format
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
      count: 0,
      identifications: 0,
      disease: 0,
      healthy: 0,
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
}
