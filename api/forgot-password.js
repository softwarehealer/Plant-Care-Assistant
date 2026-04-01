import admin from 'firebase-admin';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { readFileSync } from 'fs';
import nodemailer from 'nodemailer';

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

// Generate 6-digit random code
function generateCode() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

// Configure nodemailer (using Gmail as example - user should configure their own SMTP)
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER || 'vishnudevadiga24@gmail.com',
    pass: process.env.EMAIL_PASS 
  }
});

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
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ error: 'Email is required' });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ error: 'Invalid email format' });
    }

    // Check if user exists in Firestore
    const usersRef = db.collection('users');
    const snapshot = await usersRef.where('email', '==', email).limit(1).get();
    
    if (snapshot.empty) {
      // For security, don't reveal if email exists or not
      return res.status(200).json({
        success: true,
        message: 'If an account exists with this email, a password reset code has been sent.'
      });
    }

    // Generate 6-digit code
    const resetCode = generateCode();
    const expiresAt = Date.now() + 10 * 60 * 1000; // 10 minutes from now

    // Store reset code in Firestore (in a reset_codes collection)
    await db.collection('reset_codes').doc(email).set({
      code: resetCode,
      email: email,
      expiresAt: expiresAt,
      createdAt: admin.firestore.FieldValue.serverTimestamp()
    });

    // Send email with nodemailer
    try {
      const mailOptions = {
        from: process.env.EMAIL_USER || 'vishnudevadiga24@gmail.com',
        to: email,
        subject: 'Password Reset Code - Plant Care Assistant',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #28a745;">Password Reset Request</h2>
            <p>You have requested to reset your password for your Plant Care Assistant account.</p>
            <p>Your 6-digit verification code is:</p>
            <div style="background-color: #f8f9fa; padding: 20px; text-align: center; margin: 20px 0; border-radius: 5px;">
              <h1 style="color: #28a745; letter-spacing: 5px; margin: 0;">${resetCode}</h1>
            </div>
            <p>This code will expire in 10 minutes.</p>
            <p>If you did not request this password reset, please ignore this email.</p>
            <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
            <p style="color: #6c757d; font-size: 12px;">Plant Care Assistant</p>
          </div>
        `
      };

      await transporter.sendMail(mailOptions);
    } catch (emailError) {
      console.error('Error sending email:', emailError);
      // Still return success for security (don't reveal email sending failure)
      return res.status(200).json({
        success: true,
        message: 'If an account exists with this email, a password reset code has been sent.'
      });
    }

    return res.status(200).json({
      success: true,
      message: 'If an account exists with this email, a password reset code has been sent.'
    });
  } catch (error) {
    console.error('Forgot password error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
