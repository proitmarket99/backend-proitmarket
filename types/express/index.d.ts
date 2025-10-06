// types/express/index.d.ts
import { Multer } from 'multer';

declare global {
  namespace Express {
    interface Request {
      files?: Express.Multer.File[]; // For array of files
      file?: Express.Multer.File;    // Optional: For single file
      user?: {
        id: string;
        role: UserRole;
      };
    }
  }
}
