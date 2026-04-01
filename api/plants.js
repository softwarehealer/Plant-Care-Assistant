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

  if (req.method === 'GET') {
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
              commonIssues: care['common issues'] || care.common_issues || []
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
  }

  return res.status(405).json({ error: 'Method not allowed' });
}






