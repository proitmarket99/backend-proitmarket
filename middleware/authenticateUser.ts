import { verify } from "jsonwebtoken";
import { Request, Response, NextFunction } from 'express';

type UserRole = 'user' | 'vendor' | 'admin';

interface JwtPayload {
  userId: string;
  role?: UserRole;
}

export const authenticate = (roles: UserRole[] = ['user', 'vendor', 'admin']) => {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      const authHeader = req.headers["authorization"];
      const token = authHeader && authHeader.split(" ")[1];
      
      if (!token) {
        return res.status(401).json({ 
          settings: { 
            success: "0", 
            message: "No token provided" 
          } 
        });
      }

      const secretKey = process.env.JWT_SECRET_KEY;
      if (!secretKey) {
        return res.status(500).json({ 
          settings: { 
            success: "0", 
            message: "Internal Server Error: Secret Key is not defined" 
          } 
        });
      }

      const decoded = verify(token, secretKey) as {userId:string,role?:UserRole};
      
      // Check if user has required role
      if (roles.length > 0 && (!decoded.role || !roles.includes(decoded.role))) {
        return res.status(403).json({ 
          settings: { 
            success: "0", 
            message: "Access denied. Insufficient permissions." 
          } 
        });
      }

      // Attach user info to request
      req.user = {
        id: decoded.userId,
        role: decoded.role || 'user' // Default to 'user' if role not specified
      };

      next();
    } catch (err: any) {
      console.error('Authentication error:', err.message);
      return res.status(401).json({ 
        settings: { 
          success: "0", 
          message: "Invalid or expired token" 
        } 
      });
    }
  };
};

// For backward compatibility
export const authenticateUser = authenticate(['user']);
export const authenticateVendor = authenticate(['vendor']);
export const authenticateAdmin = authenticate(['admin']);