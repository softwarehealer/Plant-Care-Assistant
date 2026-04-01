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
    const { email, code } = req.body;

    if (!email || !code) {
      return res.status(400).json({ error: 'Email and code are required' });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ error: 'Invalid email format' });
    }

    // Validate code format (6 digits)
    if (!/^\d{6}$/.test(code)) {
      return res.status(400).json({ error: 'Code must be 6 digits' });
    }

    // Get reset code from Firestore
    const resetCodeDoc = await db.collection('reset_codes').doc(email).get();

    if (!resetCodeDoc.exists) {
      return res.status(400).json({ error: 'Invalid or expired code' });
    }

    const resetCodeData = resetCodeDoc.data();
    const storedCode = resetCodeData.code;
    const expiresAt = resetCodeData.expiresAt;

    // Check if code has expired
    if (Date.now() > expiresAt) {
      // Delete expired code
      await db.collection('reset_codes').doc(email).delete();
      return res.status(400).json({ error: 'Code has expired. Please request a new one.' });
    }

    // Verify code
    if (code !== storedCode) {
      return res.status(400).json({ error: 'Invalid code' });
    }

    // Code is valid - return success (don't delete code yet, will be deleted after password reset)
    return res.status(200).json({
      success: true,
      message: 'Code verified successfully'
    });
  } catch (error) {
    console.error('Verify PIN error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}



