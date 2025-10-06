import AWS from 'aws-sdk';
import dotenv from 'dotenv';

dotenv.config();

const bucketName = process.env.AWS_BUCKET_NAME as string;

const awsConfig = {
  accessKeyId: process.env.AWS_ACCESS_KEY as string,
  secretAccessKey: process.env.AWS_SECRET_KEY as string,
  region: process.env.AWS_REGION as string,
};

const S3 = new AWS.S3(awsConfig);

// Suppress AWS SDK maintenance mode message
// @ts-ignore
require('aws-sdk/lib/maintenance_mode_message').suppress = true;

/**
 * Upload a file buffer to S3
 * @param fileBuffer - Buffer of the file
 * @param mimeType - MIME type (e.g., image/jpeg)
 * @returns Promise<string> - S3 URL
 */
export const uploadToS3 = (fileBuffer: Buffer, mimeType: string,collectionName: string): Promise<string> => {
  const fileName = `${collectionName}/${Date.now().toString()}.${mimeType.split('/')[1]}`;

  const params: AWS.S3.PutObjectRequest = {
    Bucket: bucketName,
    Key: fileName,
    Body: fileBuffer,
    ContentType: mimeType,
  };

  return new Promise((resolve, reject) => {
    S3.upload(params, (err: any, data: any) => {
      if (err) return reject(err);
      return resolve(data.Location);
    });
  });
};

/**
 * Delete a file from S3 using its full URL
 * @param fileUrl - Full URL of the S3 object
 * @returns Promise<boolean>
 */
export const deleteFile = (fileUrl: string): Promise<boolean> => {
  const parsedUrl = new URL(fileUrl);
  const objectKey = parsedUrl.pathname.slice(1); // Remove leading '/'

  const params: AWS.S3.DeleteObjectRequest = {
    Bucket: bucketName,
    Key: objectKey,
  };

  return new Promise((resolve, reject) => {
    S3.deleteObject(params, (err: any) => {
      if (err) return reject(err);
      return resolve(true);
    });
  });
};
// import dotenv from "dotenv";
// import { S3Client, PutObjectCommand, DeleteObjectCommand, GetObjectCommand } from "@aws-sdk/client-s3";
// import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

// dotenv.config();

// const bucketName = process.env.R2_BUCKET_NAME as string;
// const accountId = process.env.R2_ACCOUNT_ID as string;

// const s3 = new S3Client({
//   region: "auto",
//   endpoint: process.env.R2_ACCOUNT_ID,
//   forcePathStyle: true,
//   credentials: {
//     accessKeyId: process.env.R2_ACCESS_KEY as string,
//     secretAccessKey: process.env.R2_SECRET_KEY as string,
//   },
// });

// /**
//  * Upload a file buffer to R2
//  * @param fileBuffer - Buffer of the file
//  * @param mimeType - MIME type (e.g., image/jpeg)
//  * @param collectionName - Folder/collection name
//  * @returns Promise<string> - Public or Signed URL
//  */
// export const uploadToR2 = async (
//   fileBuffer: Buffer,
//   mimeType: string,
//   collectionName: string
// ): Promise<string> => {
//   const fileExtension = mimeType.split('/')[1] || 'bin';
//   const fileName = `${collectionName}/${Date.now().toString()}.${fileExtension}`;
//   console.log(process.env.R2_BUCKET_NAME,process.env.R2_ACCOUNT_ID,process.env.R2_ACCESS_KEY,process.env.R2_SECRET_KEY)
//   const command = new PutObjectCommand({
//     Bucket: process.env.R2_BUCKET_NAME as string,
//     Key: fileName,
//     Body: fileBuffer,
//     ContentType: mimeType,
//   });

//   try {
//     await s3.send(command);
//     return `${process.env.R2_PUBLIC_URL}/${fileName}`;
//   } catch (error) {
//     console.error('Error uploading to R2:', error);
//     throw new Error('Failed to upload file to R2');
//   }
// };

// /**
//  * Delete a file from R2
//  * @param fileUrl - Full URL of the R2 object
//  * @returns Promise<boolean>
//  */
// export const deleteFromR2 = async (fileUrl: string): Promise<boolean> => {
//   const parsedUrl = new URL(fileUrl);
//   const objectKey = parsedUrl.pathname.slice(1);

//   const command = new DeleteObjectCommand({
//     Bucket: bucketName,
//     Key: objectKey,
//   });

//   await s3.send(command);
//   return true;
// };

// /**
//  * Generate a temporary signed URL for private files
//  * @param key - Object key inside the bucket
//  * @param expiresIn - Expiry time in seconds (default: 3600 = 1 hour)
//  * @returns Promise<string>
//  */
// export const getSignedR2Url = async (key: string, expiresIn: number = 3600): Promise<string> => {
//   const command = new GetObjectCommand({
//     Bucket: bucketName,
//     Key: key,
//   });

//   const url = await getSignedUrl(s3, command, { expiresIn });
//   return url;
// };