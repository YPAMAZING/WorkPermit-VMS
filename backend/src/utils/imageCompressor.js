/**
 * Image Compression Utility
 * Compresses base64 images using sharp library
 */

const sharp = require('sharp');

/**
 * Compress a base64 image
 * @param {string} base64Image - Base64 encoded image (with or without data URI prefix)
 * @param {object} options - Compression options
 * @param {number} options.maxWidth - Maximum width (default: 800)
 * @param {number} options.maxHeight - Maximum height (default: 800)
 * @param {number} options.quality - JPEG quality 1-100 (default: 70)
 * @param {number} options.maxSizeKB - Maximum size in KB (default: 200)
 * @returns {Promise<string>} - Compressed base64 image with data URI prefix
 */
async function compressImage(base64Image, options = {}) {
  const {
    maxWidth = 800,
    maxHeight = 800,
    quality = 70,
    maxSizeKB = 200
  } = options;

  try {
    // Extract base64 data (remove data URI prefix if present)
    let base64Data = base64Image;
    let mimeType = 'image/jpeg';
    
    if (base64Image.includes(',')) {
      const parts = base64Image.split(',');
      base64Data = parts[1];
      // Extract mime type
      const mimeMatch = parts[0].match(/data:([^;]+);/);
      if (mimeMatch) {
        mimeType = mimeMatch[1];
      }
    }

    // Convert base64 to buffer
    const imageBuffer = Buffer.from(base64Data, 'base64');
    
    // Get image metadata
    const metadata = await sharp(imageBuffer).metadata();
    console.log(`Original image: ${metadata.width}x${metadata.height}, format: ${metadata.format}, size: ${Math.round(imageBuffer.length / 1024)}KB`);

    // Calculate new dimensions while maintaining aspect ratio
    let newWidth = metadata.width;
    let newHeight = metadata.height;
    
    if (newWidth > maxWidth || newHeight > maxHeight) {
      const ratio = Math.min(maxWidth / newWidth, maxHeight / newHeight);
      newWidth = Math.round(newWidth * ratio);
      newHeight = Math.round(newHeight * ratio);
    }

    // Compress the image
    let compressedBuffer = await sharp(imageBuffer)
      .resize(newWidth, newHeight, {
        fit: 'inside',
        withoutEnlargement: true
      })
      .jpeg({ quality })
      .toBuffer();

    // If still too large, reduce quality further
    let currentQuality = quality;
    while (compressedBuffer.length > maxSizeKB * 1024 && currentQuality > 20) {
      currentQuality -= 10;
      compressedBuffer = await sharp(imageBuffer)
        .resize(newWidth, newHeight, {
          fit: 'inside',
          withoutEnlargement: true
        })
        .jpeg({ quality: currentQuality })
        .toBuffer();
    }

    console.log(`Compressed image: ${newWidth}x${newHeight}, quality: ${currentQuality}, size: ${Math.round(compressedBuffer.length / 1024)}KB`);

    // Convert back to base64 with data URI prefix
    const compressedBase64 = `data:image/jpeg;base64,${compressedBuffer.toString('base64')}`;
    
    return compressedBase64;
  } catch (error) {
    console.error('Image compression error:', error);
    // Return original image if compression fails
    return base64Image;
  }
}

/**
 * Compress multiple images in an array of worker objects
 * @param {Array} workers - Array of worker objects with idProofImage field
 * @returns {Promise<Array>} - Workers array with compressed images
 */
async function compressWorkerImages(workers) {
  if (!Array.isArray(workers) || workers.length === 0) {
    return workers;
  }

  const compressedWorkers = await Promise.all(
    workers.map(async (worker) => {
      if (worker.idProofImage && worker.idProofImage.startsWith('data:image')) {
        try {
          const compressedImage = await compressImage(worker.idProofImage);
          return { ...worker, idProofImage: compressedImage };
        } catch (error) {
          console.error(`Failed to compress image for worker ${worker.name}:`, error);
          return worker;
        }
      }
      return worker;
    })
  );

  return compressedWorkers;
}

module.exports = {
  compressImage,
  compressWorkerImages
};
