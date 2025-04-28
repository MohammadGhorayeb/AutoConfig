import { NextResponse } from "next/server";
import { exec } from "child_process";
import { promisify } from "util";
import path from "path";

const execPromise = promisify(exec);

// POST handler for processing the RAG system
export async function POST() {
  try {
    // Get the path to the script that processes the RAG system
    const scriptPath = path.join(process.cwd(), "../llama-api-docker/RAG/run_tiny_rag.py");
    
    // Execute the script
    const { stdout, stderr } = await execPromise(`python ${scriptPath}`);
    
    if (stderr) {
      console.error("Error processing RAG:", stderr);
      return NextResponse.json(
        { 
          success: false, 
          message: "Error processing RAG system", 
          details: stderr 
        },
        { status: 500 }
      );
    }
    
    console.log("RAG processing output:", stdout);
    
    return NextResponse.json({
      success: true,
      message: "RAG system processed successfully",
      details: stdout
    });
    
  } catch (error: any) {
    console.error("Failed to process RAG system:", error);
    return NextResponse.json(
      { 
        success: false, 
        message: "Failed to process RAG system", 
        details: error.message || "Unknown error" 
      },
      { status: 500 }
    );
  }
} 