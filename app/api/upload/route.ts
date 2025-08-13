import { NextRequest, NextResponse } from 'next/server';
import { writeFile } from 'fs/promises';
import { join } from 'path';
import { mkdir } from 'fs/promises';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const directory = formData.get('directory') as string || 'uploads';
    
    if (!file) {
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400 }
      );
    }

    // Create a safe filename
    const timestamp = new Date().getTime();
    const originalName = file.name.replace(/[^a-zA-Z0-9.]/g, '_');
    const fileName = `${timestamp}_${originalName}`;
    
    // Ensure directory exists
    const publicDir = join(process.cwd(), 'public');
    const uploadDir = join(publicDir, directory);
    
    try {
      await mkdir(uploadDir, { recursive: true });
    } catch (error) {
      console.error('Error creating directory:', error);
    }
    
    // Convert file to buffer
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    
    // Write file to the public directory
    const filePath = join(uploadDir, fileName);
    await writeFile(filePath, buffer);
    
    // Return the path that can be used to access the file
    const publicPath = `/${directory}/${fileName}`;
    
    return NextResponse.json({ 
      success: true,
      path: publicPath
    });
  } catch (error) {
    console.error('Error uploading file:', error);
    return NextResponse.json(
      { error: 'Error uploading file' },
      { status: 500 }
    );
  }
} 