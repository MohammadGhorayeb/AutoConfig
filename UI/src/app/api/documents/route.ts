import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { writeFile } from "fs/promises";
import { connectToDatabase } from "@/lib/mongodb";

// This function saves the file to the RAG documents directory
async function saveDocumentToRag(file: File, title: string) {
  // Define the documents directory path in the RAG system
  const ragDocsDirectory = path.join(process.cwd(), "../llama-api-docker/RAG/documents");
  
  // Ensure the directory exists
  try {
    if (!fs.existsSync(ragDocsDirectory)) {
      fs.mkdirSync(ragDocsDirectory, { recursive: true });
    }
  } catch (error) {
    console.error("Failed to create RAG documents directory:", error);
    throw new Error("Failed to create documents directory");
  }
  
  // Convert the file to an ArrayBuffer
  const bytes = await file.arrayBuffer();
  const buffer = Buffer.from(bytes);
  
  // Generate a safe filename based on the title
  const safeFilename = title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
    
  // Generate a unique filename with date
  const timestamp = new Date().getTime();
  const fileExtension = path.extname(file.name);
  const filename = `${safeFilename}_${timestamp}${fileExtension}`;
  
  // Create the file path
  const filePath = path.join(ragDocsDirectory, filename);
  
  // Write the file to disk
  try {
    await writeFile(filePath, buffer);
    return { filename, filePath };
  } catch (error) {
    console.error("Failed to save file:", error);
    throw new Error("Failed to save document");
  }
}

// GET handler for fetching all documents
export async function GET() {
  try {
    const { db } = await connectToDatabase();
    const documents = await db.collection("documents").find({}).toArray();
    
    return NextResponse.json({ success: true, documents });
  } catch (error) {
    console.error("Error fetching documents:", error);
    return NextResponse.json(
      { success: false, message: "Failed to fetch documents" },
      { status: 500 }
    );
  }
}

// POST handler for uploading a document
export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const document = formData.get("document") as File;
    const title = formData.get("title") as string;
    
    if (!document || !title) {
      return NextResponse.json(
        { success: false, message: "Document and title are required" },
        { status: 400 }
      );
    }
    
    // Validate file type
    const allowedTypes = [".txt", ".pdf", ".docx", ".md"];
    const fileExtension = path.extname(document.name).toLowerCase();
    
    if (!allowedTypes.includes(fileExtension)) {
      return NextResponse.json(
        { 
          success: false, 
          message: `Invalid file type. Allowed types: ${allowedTypes.join(", ")}` 
        },
        { status: 400 }
      );
    }
    
    // Save document to RAG system
    const { filename, filePath } = await saveDocumentToRag(document, title);
    
    // Save document metadata to database
    const { db } = await connectToDatabase();
    
    const documentData = {
      title,
      filename,
      path: filePath,
      uploadedAt: new Date(),
      size: document.size,
    };
    
    const result = await db.collection("documents").insertOne(documentData);
    
    // Return success response
    return NextResponse.json({ 
      success: true, 
      message: "Document uploaded successfully",
      document: {
        ...documentData,
        _id: result.insertedId
      }
    });
    
  } catch (error) {
    console.error("Error uploading document:", error);
    return NextResponse.json(
      { success: false, message: "Failed to upload document" },
      { status: 500 }
    );
  }
} 