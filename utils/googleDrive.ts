import axios from 'axios';
import { Readable } from 'stream';

/**
 * Extracts file ID from Google Drive shareable link
 * @param url Google Drive shareable link
 * @returns File ID or null if not found
 */
const extractFileId = (url: string): string | null => {
  const patterns = [
    // Handles: https://drive.google.com/file/d/<ID>/view?usp=sharing
    /\/file\/d\/([a-zA-Z0-9_-]{28,})/,
    // Folder URLs: https://drive.google.com/drive/folders/<ID>
    /\/folders\/([a-zA-Z0-9_-]{28,})/,
    // Direct file ID
    /^([a-zA-Z0-9_-]{28,})$/,
  ];

  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match && match[1]) {
      return match[1];
    }
  }
  return null;
};

/**
 * Downloads a file from Google Drive
 * @param fileUrl Google Drive shareable link
 * @returns Promise with file buffer and mime type
 */
export const downloadFromGoogleDrive = async (
  fileUrl: string
): Promise<{ buffer: Buffer; mimeType: string }> => {
  try {
    const fileId = extractFileId(fileUrl);
    if (!fileId) {
      throw new Error('Invalid Google Drive URL');
    }

    const apiKey = process.env.GOOGLE_DRIVE_API_KEY;
    if (!apiKey) {
      throw new Error('Missing GOOGLE_DRIVE_API_KEY in environment variables');
    }

    // Get file metadata to determine mimeType
    const metadataUrl = `https://www.googleapis.com/drive/v3/files/${fileId}?fields=mimeType,exportLinks&key=${apiKey}`;
    const metadataResponse = await axios.get(metadataUrl);
    const { mimeType, exportLinks } = metadataResponse.data;

    let downloadUrl: string;

    if (mimeType.startsWith('application/vnd.google-apps.')) {
      // Google Docs, Sheets, etc. need to be exported
      const exportFormat = 'application/pdf';
      downloadUrl = exportLinks?.[exportFormat] ||
        `https://www.googleapis.com/drive/v3/files/${fileId}/export?mimeType=${encodeURIComponent(exportFormat)}&key=${apiKey}`;
    } else {
      // Direct download
      downloadUrl = `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media&key=${apiKey}`;
    }

    const response = await axios.get(downloadUrl, {
      responseType: 'arraybuffer',
    });

    return {
      buffer: Buffer.from(response.data),
      mimeType: mimeType || 'application/octet-stream',
    };
  } catch (error: any) {
    console.error('Error downloading from Google Drive:', error.message);
    throw new Error(`Failed to download file from Google Drive: ${error.message}`);
  }
};

/**
 * Converts a Google Drive shareable link to a direct download link
 * @param fileUrl Google Drive shareable link
 * @returns Direct download link
 */
export const getDirectDownloadLink = (fileUrl: string): string => {
  const fileId = extractFileId(fileUrl);
  if (!fileId) {
    throw new Error('Invalid Google Drive URL');
  }
  return `https://drive.google.com/uc?export=download&id=${fileId}`;
};

/**
 * Converts a Google Drive shareable link to an embeddable image link
 * @param fileUrl Google Drive shareable link
 * @returns Embeddable image link if the file is an image, otherwise the original link
 */
export const getEmbeddableImageLink = (fileUrl: string): string => {
  const fileId = extractFileId(fileUrl);
  if (!fileId) {
    return fileUrl;
  }
  return `https://drive.google.com/thumbnail?id=${fileId}&sz=w1000`;
};

/**
 * Streams a file from Google Drive
 * @param fileUrl Google Drive shareable link
 * @returns Readable stream of the file
 */
export const streamFromGoogleDrive = async (fileUrl: string): Promise<{ stream: Readable; mimeType: string }> => {
  try {
    const fileId = extractFileId(fileUrl);
    if (!fileId) {
      throw new Error('Invalid Google Drive URL');
    }

    const downloadUrl = `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`;
    
    const response = await axios.get(downloadUrl, {
      responseType: 'stream',
      headers: {
        'Authorization': `Bearer ${process.env.GOOGLE_DRIVE_API_KEY || ''}`
      }
    });

    return {
      stream: response.data,
      mimeType: response.headers['content-type'] || 'application/octet-stream'
    };
  } catch (error: any) {
    console.error('Error streaming from Google Drive:', error.message);
    throw new Error(`Failed to stream file from Google Drive: ${error.message}`);
  }
};
