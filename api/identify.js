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
  // CORS headers
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
      maxFileSize: 10 * 1024 * 1024, // 10MB
    });

    // Parse the form using promises
    const [fields, files] = await form.parse(req);

    const file = Array.isArray(files.image) ? files.image[0] : files.image;
    if (!file) {
      return res.status(400).json({ error: 'Image file is required' });
    }

    // Get user email from form fields
    const email = Array.isArray(fields.email) ? fields.email[0] : fields.email;

    // Read uploaded file from temporary path
    const buffer = readFileSync(file.filepath);

    // --- GRADIO INTEGRATION ---
    let result;
    try {
      console.log("Connecting to Hugging Face Space...");
      const app = await Client.connect("vpdiga-24/plant-idfire");
      
      console.log("Sending image for prediction...");
      const gradioResponse = await app.predict("/predict", [
        handle_file(file.filepath) 
      ]);

      console.log("Raw Prediction Data:", gradioResponse.data);

      // Parsing the specific format: [ { label: 'Species', confidences: null }, 0.611 ]
      const predictionData = gradioResponse.data;
      
      // Extract label from the first object
      const labelObj = predictionData[0]; 
      const labelName = labelObj?.label; // e.g., 'Lactuca_virosa'
      
      // Extract confidence from the second item in array
      const confidenceScore = predictionData[1]; // e.g., 0.611...

      if (labelName) {
        result = {
          classes: [labelName],
          confidences: [confidenceScore || 0]
        };
      } else {
        throw new Error("Invalid prediction format received from Gradio");
      }

    } catch (gradioError) {
      console.warn('Gradio API failed, using mock data:', gradioError);
      result = {
        classes: ['tomato_plant', 'rose', 'sunflower', 'lavender', 'basil'],
        confidences: [0.92, 0.85, 0.78, 0.65, 0.52],
      };
    }
    // --------------------------

    // Top Classes Processing
    // Note: Since your new API returns 1 result, this loop will process just that 1 item.
    const classes = result.classes || [];
    const confidences = result.confidences || [];
    
    // We map the arrays into objects for easier Firestore lookup
    const topClasses = classes.map((name, i) => ({
      name,
      confidence: confidences[i] || 0,
    }));

    // Match Firestore plants
    const matchedPlants = [];
    for (const classItem of topClasses) {
      const plantId = classItem.name.toLowerCase();
      try {
        const doc = await db.collection('plants').doc(plantId).get();
        if (doc.exists) {
          const data = doc.data();
          matchedPlants.push({
            id: doc.id,
            name: classItem.name.split('_').join(' '),
            confidence: classItem.confidence,
            family: data.family || null,
            scientificName: data.scientificName || data.scientific_name || null,
            commonNames: data.commonNames || data.common_names || [],
            care: data.care || null,
          });
        }
      } catch (err) {
        console.warn(`Plant ${plantId} not found in Firestore`);
      }
    }

    // Fallback: first document if nothing matched (and we had a valid prediction)
    if (matchedPlants.length === 0 && topClasses.length > 0) {
      // Logic: If Firestore didn't have the specific plant, return a generic fallback 
      // OR you might want to return the identified name even if no details exist in DB.
      // Below preserves your original fallback logic:
      const snapshot = await db.collection('plants').limit(1).get();
      if (!snapshot.empty) {
        const firstDoc = snapshot.docs[0];
        const data = firstDoc.data();
        matchedPlants.push({
          id: firstDoc.id,
          name: firstDoc.id.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' '),
          // Use the confidence from the actual AI prediction, not the fallback doc
          confidence: topClasses[0]?.confidence || 0.85,
          family: data.family || null,
          scientificName: data.scientificName || data.scientific_name || null,
          commonNames: data.commonNames || data.common_names || [],
          care: data.care || null,
        });
      }
    }

    // Update user stats if email is provided
    if (email) {
      try {
        const usersRef = db.collection('users');
        const userSnapshot = await usersRef.where('email', '==', email).limit(1).get();
        
        if (!userSnapshot.empty) {
          const userDoc = userSnapshot.docs[0];
          const userData = userDoc.data();
          
          // Increment count and identifications
          await userDoc.ref.update({
            count: admin.firestore.FieldValue.increment(1),
            identifications: admin.firestore.FieldValue.increment(1)
          });
        }
      } catch (userUpdateError) {
        console.warn('Failed to update user stats:', userUpdateError);
        // Continue even if user update fails
      }
    }

    return res.status(200).json({
      success: true,
      type: 'identification',
      classes: matchedPlants,
      imageBuffer: buffer.toString('base64'),
    });
  } catch (error) {
    console.error('Identify error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}