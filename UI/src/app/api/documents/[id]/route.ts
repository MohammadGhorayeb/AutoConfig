import { NextResponse } from "next/server";
import fs from "fs";
import { ObjectId } from "mongodb";
import { connectToDatabase } from "@/lib/mongodb";

// DELETE handler for deleting a document
export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const id = params.id;
    
    if (!id || !ObjectId.isValid(id)) {
      return NextResponse.json(
        { success: false, message: "Invalid document ID" },
        { status: 400 }
      );
    }
    
    // Connect to database
    const { db } = await connectToDatabase();
    
    // Find the document to get its file path
    const document = await db.collection("documents").findOne({
      _id: new ObjectId(id)
    });
    
    if (!document) {
      return NextResponse.json(
        { success: false, message: "Document not found" },
        { status: 404 }
      );
    }
    
    // Delete the document from database
    await db.collection("documents").deleteOne({
      _id: new ObjectId(id)
    });
    
    // Delete the file from the RAG documents directory
    try {
      if (document.path && fs.existsSync(document.path)) {
        fs.unlinkSync(document.path);
      }
    } catch (error) {
      console.error("Error deleting document file:", error);
      // Continue even if file deletion fails
    }
    
    return NextResponse.json({
      success: true,
      message: "Document deleted successfully"
    });
    
  } catch (error) {
    console.error("Error deleting document:", error);
    return NextResponse.json(
      { success: false, message: "Failed to delete document" },
      { status: 500 }
    );
  }
} 