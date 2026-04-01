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
  
  // console.error("Error code initializing history");
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

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
        query = query.startAfter(lastDoc);
      }
    }

    const snapshot = await query.get();
    const history = snapshot.docs.map(doc => {
      const data = doc.data();
      // Format for Dashboard component
      let plantName = 'Unknown Plant';
      let isHealthy = null;
      
      if (data.type === 'identification' && data.species && data.species.length > 0) {
        plantName = (data.species[0].name || 'Unknown_Plant').split('_').join(' ');
        isHealthy = null; // Not applicable for identification
      } else if (data.type === 'diagnosis' && data.disease) {
        plantName = (data.disease.name || 'Unknown_Plant').split('_').join(' ');
        // Use saved isHealthy if available, otherwise check from disease name
        isHealthy = data.isHealthy !== undefined 
          ? data.isHealthy 
          : (data.disease.name?.toLowerCase().includes('healthy') || false);
      }
      
      return {
        id: doc.id,
        plantName,
        isHealthy,
        date: data.createdAt?.toDate?.()?.toLocaleDateString() || new Date().toLocaleDateString(),
        type: data.type,
        ...data
      };
    });

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
}




