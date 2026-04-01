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
    const { email, code, password, confirmPassword } = req.body;

    if (!email || !code || !password || !confirmPassword) {
      return res.status(400).json({ error: 'Email, code, password, and confirm password are required' });
    }

    if (password !== confirmPassword) {
      return res.status(400).json({ error: 'Passwords do not match' });
    }

    if (password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters' });
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

    // Verify reset code
    const resetCodeDoc = await db.collection('reset_codes').doc(email).get();

    if (!resetCodeDoc.exists) {
      return res.status(400).json({ error: 'Invalid or expired code' });
    }

    const resetCodeData = resetCodeDoc.data();
    const storedCode = resetCodeData.code;
    const expiresAt = resetCodeData.expiresAt;

    // Check if code has expired
    if (Date.now() > expiresAt) {
      await db.collection('reset_codes').doc(email).delete();
      return res.status(400).json({ error: 'Code has expired. Please request a new one.' });
    }

    // Verify code
    if (code !== storedCode) {
      return res.status(400).json({ error: 'Invalid code' });
    }

    // Code is valid - update password in users collection
    const usersRef = db.collection('users');
    const userSnapshot = await usersRef.where('email', '==', email).limit(1).get();

    if (userSnapshot.empty) {
      return res.status(404).json({ error: 'User not found' });
    }

    const userDoc = userSnapshot.docs[0];
    
    // Update password
    await usersRef.doc(userDoc.id).update({
      password: password // In production, hash this with bcrypt
    });

    // Delete used reset code
    await db.collection('reset_codes').doc(email).delete();

    return res.status(200).json({
      success: true,
      message: 'Password has been reset successfully'
    });
  } catch (error) {
    console.error('Reset password error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
