import cloudinary from '../config/cloudinary.js';
import streamifier from 'streamifier';

// Function to stream upload to Cloudinary
export const streamUpload = (buffer) => {
  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      { folder: 'cattle-listings' },
      (error, result) => {
        if (error) return reject(error);
        resolve(result);
      }
    );
    
    streamifier.createReadStream(buffer).pipe(uploadStream);
  });
};
