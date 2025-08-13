/**
 * Utility functions for handling image uploads
 */

/**
 * Uploads an image to the local public directory
 * @param file The image file to upload
 * @param directory The subdirectory within public to store the image
 * @returns The relative path to the uploaded image
 */
export const uploadLocalImage = async (
  file: File,
  directory: string = "dorms"
): Promise<string> => {
  try {
    // Create form data to send to the API
    const formData = new FormData();
    formData.append('file', file);
    formData.append('directory', directory);
    
    // Send the file to our API endpoint
    const response = await fetch('/api/upload', {
      method: 'POST',
      body: formData,
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to upload image');
    }
    
    const data = await response.json();
    return data.path;
  } catch (error) {
    console.error('Error uploading image:', error);
    throw error;
  }
};

/**
 * Creates a data URL for image preview
 * @param file The image file to preview
 * @returns A promise that resolves to the data URL
 */
export const createImagePreview = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      if (e.target?.result) {
        resolve(e.target.result as string);
      } else {
        reject(new Error("Failed to create image preview"));
      }
    };
    reader.onerror = () => {
      reject(new Error("Failed to read file"));
    };
    reader.readAsDataURL(file);
  });
}; 