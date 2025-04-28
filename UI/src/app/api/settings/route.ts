import { NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import mongoose, { Document, Model } from 'mongoose';
import { writeFile } from 'fs/promises';
import path from 'path';

// Define the interface for the settings document
interface ISettings extends Document {
  name: string;
  logoUrl: string;
  updatedAt: Date;
}

// Define a settings schema if not already defined in models folder
const settingsSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    default: 'Business Dashboard'
  },
  logoUrl: {
    type: String,
    default: ''
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Get or create the Settings model
let Settings: Model<ISettings>;
try {
  Settings = mongoose.model<ISettings>('Settings');
} catch (error) {
  Settings = mongoose.model<ISettings>('Settings', settingsSchema);
}

// GET handler to retrieve settings
export async function GET() {
  try {
    await connectDB();
    
    // Since we only have one settings document for the entire application
    let settings = await Settings.findOne();
    
    // If no settings exist yet, create default settings
    if (!settings) {
      settings = await Settings.create({
        name: 'Business Dashboard',
        logoUrl: ''
      });
    }
    
    return NextResponse.json({ 
      success: true,
      settings
    });
  } catch (error) {
    console.error('Error fetching settings:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to retrieve settings' },
      { status: 500 }
    );
  }
}

// Function to handle multipart form data and file uploads
async function parseFormData(req: Request) {
  const formData = await req.formData();
  const name = formData.get('name') as string;
  const logoFile = formData.get('logo') as File | null;
  
  return { name, logoFile };
}

// POST handler to update settings
export async function POST(req: Request) {
  try {
    await connectDB();
    
    // Parse the form data
    const { name, logoFile } = await parseFormData(req);
    
    // Validate input
    if (!name) {
      return NextResponse.json(
        { success: false, message: 'Business name is required' },
        { status: 400 }
      );
    }
    
    // Find existing settings or create new ones
    let settings = await Settings.findOne();
    if (!settings) {
      settings = new Settings({
        name,
        logoUrl: ''
      });
    } else {
      settings.name = name;
    }
    
    // Handle logo upload if provided
    if (logoFile) {
      // Generate a unique filename
      const uniquePrefix = Date.now() + '-' + Math.round(Math.random() * 1e9);
      const filename = uniquePrefix + '-' + logoFile.name.replace(/\s+/g, '-');
      
      // Create the public directory path
      const publicDir = path.join(process.cwd(), 'public', 'uploads');
      
      // Ensure the directory exists
      // In production, you'd want to use fs.mkdir with { recursive: true }
      // For this example, we've created the directory manually
      
      // Save the file
      const buffer = await logoFile.arrayBuffer();
      const filepath = path.join(publicDir, filename);
      await writeFile(filepath, Buffer.from(buffer));
      
      // Set the logo URL relative to public directory
      settings.logoUrl = `/uploads/${filename}`;
    }
    
    // Update timestamps
    settings.updatedAt = new Date();
    
    // Save the settings
    await settings.save();
    
    return NextResponse.json({
      success: true,
      settings: {
        name: settings.name,
        logoUrl: settings.logoUrl
      },
      message: 'Settings updated successfully'
    });
    
  } catch (error) {
    console.error('Error updating settings:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to update settings' },
      { status: 500 }
    );
  }
} 