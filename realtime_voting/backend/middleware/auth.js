import jwt from 'jsonwebtoken';
import prisma from '../config/database.js';

/**
 * Authentication middleware
 * Verifies JWT token and adds user info to request
 */
export const auth = async (req, res, next) => {
  try {
    // Get token from Authorization header
    const authHeader = req.headers.authorization;
    
    if (!authHeader) {
      return res.status(401).json({ 
        error: 'Access denied. No token provided.' 
      });
    }

    // Check if header starts with 'Bearer '
    if (!authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ 
        error: 'Access denied. Invalid token format.' 
      });
    }

    // Extract token
    const token = authHeader.substring(7); // Remove 'Bearer ' prefix

    if (!token) {
      return res.status(401).json({ 
        error: 'Access denied. No token provided.' 
      });
    }

    // Verify token
    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET);
    } catch (jwtError) {
      if (jwtError.name === 'TokenExpiredError') {
        return res.status(401).json({ 
          error: 'Access denied. Token has expired.' 
        });
      } else if (jwtError.name === 'JsonWebTokenError') {
        return res.status(401).json({ 
          error: 'Access denied. Invalid token.' 
        });
      }
      throw jwtError;
    }

    // Check if user still exists
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: {
        id: true,
        name: true,
        email: true
      }
    });

    if (!user) {
      return res.status(401).json({ 
        error: 'Access denied. User no longer exists.' 
      });
    }

    // Add user info to request object
    req.user = {
      userId: user.id,
      name: user.name,
      email: user.email
    };

    next();

  } catch (error) {
    console.error('Auth middleware error:', error);
    res.status(500).json({ 
      error: 'Internal server error during authentication' 
    });
  }
};

/**
 * Optional authentication middleware
 * Adds user info if token is provided, but doesn't require it
 */
export const optionalAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return next();
    }

    const token = authHeader.substring(7);
    
    if (!token) {
      return next();
    }

    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      
      const user = await prisma.user.findUnique({
        where: { id: decoded.userId },
        select: {
          id: true,
          name: true,
          email: true
        }
      });

      if (user) {
        req.user = {
          userId: user.id,
          name: user.name,
          email: user.email
        };
      }
    } catch (jwtError) {
      // Ignore JWT errors for optional auth
    }

    next();

  } catch (error) {
    console.error('Optional auth middleware error:', error);
    next(); // Continue even if there's an error
  }
};