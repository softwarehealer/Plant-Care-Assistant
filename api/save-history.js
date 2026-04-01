import admin from 'firebase-admin';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { readFileSync } from 'fs';

// Initialize Firebase Admin SDK
let db;

try {
  const __filename = fileURLToPath(import.meta.url);
  const __dirname = dirname(__filename);

  const serviceAccount = JSON.parse(
    readFileSync(
      join(
        __dirname,
        '..',
        'plant-care-assistant-5037d-firebase-adminsdk-fbsvc-23d12bdb1b.json'
      ),
      'utf8'
    )
  );

  if (!admin.apps.length) {
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
    });
  }

  db = admin.firestore();
} catch (error) {
  console.error('Error initializing Firebase:', error);
}

export default async function handler(req, res) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader(
    'Access-Control-Allow-Methods',
    'GET,OPTIONS,POST,PUT,PATCH,DELETE'
  );
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // -------------------- READ JSON BODY --------------------
    const { type, species, disease, email, url } = req.body;

    if (!email) {
      return res.status(400).json({ error: 'User email is required' });
    }

    if (!type || (type !== 'identification' && type !== 'diagnosis')) {
      return res.status(400).json({
        error: 'Invalid type. Must be "identification" or "diagnosis"',
      });
    }

    if (type === 'identification' && (!species || !Array.isArray(species))) {
      return res.status(400).json({
        error: 'Species array is required for identification type',
      });
    }

    if (type === 'diagnosis' && !disease) {
      return res.status(400).json({
        error: 'Disease data is required for diagnosis type',
      });
    }

    // -------------------- USER LOOKUP --------------------
    const usersRef = db.collection('users');
    const userSnapshot = await usersRef
      .where('email', '==', email)
      .limit(1)
      .get();

    if (userSnapshot.empty) {
      return res.status(404).json({ error: 'User not found' });
    }

    const userDoc = userSnapshot.docs[0];
    const userData = userDoc.data();
    const currentUserCount = userData.count || 0;
    const newUserCount = currentUserCount + 1;

    // -------------------- METRICS --------------------
    const metricsRef = db.collection('metrics').doc('model_metrics');
    const metricsDoc = await metricsRef.get();

    let identificationCount = 0;
    if (metricsDoc.exists) {
      identificationCount = metricsDoc.data().identification_count || 0;
    } else {
      await metricsRef.set({ identification_count: 0 });
    }

    const newIdentificationCount = identificationCount + 1;
    const documentId = newIdentificationCount.toString();

    // -------------------- HISTORY DATA --------------------
    const historyData = {
      email,
      count: newUserCount,
      type,
      url: url || null,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    };

    if (type === 'identification') {
      historyData.species = species;
      historyData.disease = null;
    } else {
      historyData.disease = disease;
      historyData.species = [];
      // Add isHealthy flag for diagnosis
      if (disease && disease.name) {
        historyData.isHealthy = disease.name.toLowerCase().includes('healthy');
      }
    }

    // -------------------- FIRESTORE WRITES --------------------
    await db.collection('history').doc(documentId).set(historyData);

    await metricsRef.update({
      identification_count: newIdentificationCount,
    });

    await usersRef.doc(userDoc.id).update({
      count: newUserCount,
    });

    return res.status(200).json({
      success: true,
      message: 'History saved successfully',
      documentId,
    });
  } catch (error) {
    console.error('Save history error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
