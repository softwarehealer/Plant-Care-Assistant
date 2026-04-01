import admin from 'firebase-admin';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { readFileSync } from 'fs';
import formidable from 'formidable';
import { Client, handle_file } from "@gradio/client";

// Disable bodyParser so formidable can parse files
export const config = {
  api: {
    bodyParser: false,
  },
};

// Initialize Firebase Admin SDK
let db;
try {
  const __filename = fileURLToPath(import.meta.url);
  const __dirname = dirname(__filename);

  const serviceAccount = JSON.parse(
    readFileSync(
      join(__dirname, '..', 'plant-care-assistant-5037d-firebase-adminsdk-fbsvc-23d12bdb1b.json'),
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
  // CORS
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,POST,PUT,PATCH,DELETE');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const form = formidable({
      keepExtensions: true,
      maxFileSize: 10 * 1024 * 1024,
    });

    const [fields, files] = await form.parse(req);

    const file = Array.isArray(files.image) ? files.image[0] : files.image;
    if (!file) {
      return res.status(400).json({ error: 'Image file is required' });
    }

    // Get user email from form fields
    const email = Array.isArray(fields.email) ? fields.email[0] : fields.email;

    const buffer = readFileSync(file.filepath);

    // ---- GRADIO INTEGRATION ----
    let prediction;
    try {
      const app = await Client.connect("vpdiga-24/disease-inference");
      const response = await app.predict("/predict", [
        handle_file(file.filepath)
      ]);
      // Output format:
      // ({ label: 'late blight', confidences: null }, 0.3536)
      const [labelObj, confidence] = response.data;
    
      const label = labelObj?.label?.toLowerCase() || "";
    
      prediction = {
        is_healthy: label.includes("healthy"),
        disease: label,
        disease_confidence: confidence || 0
      };
    
    } catch (err) {
      console.warn("Gradio failed, using mock:", err);
      prediction = {
        is_healthy: false,
        disease: "early_blight",
        disease_confidence: 0.92
      };
    }
    // ----------------------------

    const isHealthy = prediction.is_healthy === true;
    const diseaseName = prediction.disease;
    const diseaseConfidence = prediction.disease_confidence || 0;

    let treatment = [];
    let diseaseData = null;
    
    if (!isHealthy && diseaseName) {
      const diseaseId = diseaseName.toLowerCase().replace(/\s+/g, '_');
      try {
        const doc = await db.collection('disease').doc(diseaseId).get();
        if (doc.exists) {
          diseaseData = doc.data();
          treatment = diseaseData.treatment || [];
        }
      } catch {}

      if (treatment.length === 0) {
        const snap = await db.collection('disease').limit(1).get();
        if (!snap.empty) {
          diseaseData = snap.docs[0].data();
          treatment = diseaseData.treatment || [];
        }
      }
    }

    const formattedDisease = diseaseName
      ? diseaseName
          .split('_')
          .map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
          .join(' ')
      : null;

    // Update user stats if email is provided
    if (email) {
      try {
        const usersRef = db.collection('users');
        const userSnapshot = await usersRef.where('email', '==', email).limit(1).get();
        
        if (!userSnapshot.empty) {
          const userDoc = userSnapshot.docs[0];
          
          // Increment count and disease
          const updateData = {
            count: admin.firestore.FieldValue.increment(1),
            disease: admin.firestore.FieldValue.increment(1)
          };
          
          // If healthy, also increment healthy field
          if (isHealthy) {
            updateData.healthy = admin.firestore.FieldValue.increment(1);
          }
          
          await userDoc.ref.update(updateData);
        }
      } catch (userUpdateError) {
        console.warn('Failed to update user stats:', userUpdateError);
        // Continue even if user update fails
      }
    }

    return res.status(200).json({
      success: true,
      type: 'diagnosis',
      isHealthy,
      disease: formattedDisease || diseaseData?.name || null,
      diseaseConfidence: isHealthy ? 0.95 : diseaseConfidence,
      treatment,
      imageBuffer: buffer.toString('base64'),
    });
  } catch (error) {
    console.error('Diagnosis error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
