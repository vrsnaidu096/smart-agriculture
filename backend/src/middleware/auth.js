const admin = require('../config/firebase');

/**
 * Express middleware to verify Firebase JWT tokens.
 * Extracts the token from the Authorization header and verifies it.
 * If valid, it attaches the decoded user info to req.user and proceeds.
 * If missing or invalid, it returns a 401 Unauthorized error.
 */
const requireAuth = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ 
      error: 'Unauthorized', 
      message: 'Missing or invalid Authorization header' 
    });
  }

  const idToken = authHeader.split('Bearer ')[1];

  try {
    const decodedToken = await admin.auth().verifyIdToken(idToken);
    req.user = decodedToken; // Contains uid, phone_number, etc.
    next();
  } catch (error) {
    console.error('Firebase Auth Verification Error:', error);
    return res.status(401).json({ 
      error: 'Unauthorized', 
      message: 'Invalid or expired authentication token' 
    });
  }
};

module.exports = { requireAuth };
