import { NextRequest, NextResponse } from 'next/server';
import { writeFile, mkdir } from 'fs/promises';
import { join } from 'path';
import * as crypto from 'crypto';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    
    const file = formData.get('file') as File;
    const userId = formData.get('userId') as string;
    
    if (!file || !userId) {
      return NextResponse.json(
        { error: 'File and userId are required' },
        { status: 400 }
      );
    }

    // Create a unique file name with original extension
    const fileExtension = file.name.split('.').pop() || 'jpg';
    const fileName = `${userId}-${crypto.randomBytes(6).toString('hex')}.${fileExtension}`;
    
    // Create the directory if it doesn't exist
    const uploadDir = join(process.cwd(), 'public', 'profileimage');
    await mkdir(uploadDir, { recursive: true });
    
    // Path where the file will be stored
    const filePath = join(uploadDir, fileName);
    
    // Convert the file to an ArrayBuffer and then to a Buffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    
    // Save the file
    await writeFile(filePath, buffer);
    
    // Create the URL that the client will use to fetch the image
    const imageUrl = `/profileimage/${fileName}`;
    
    return NextResponse.json({ 
      success: true, 
      imageUrl,
      message: 'Image uploaded successfully' 
    });
  } catch (error) {
    console.error('Error uploading file:', error);
    return NextResponse.json(
      { error: 'Error uploading file' },
      { status: 500 }
    );
  }
}

// Configure the maximum size accepted
export const config = {
  api: {
    bodyParser: false,
  },
}; 