import { NextResponse } from 'next/server';
import axios from 'axios';

// Environment variable for the LLM API URL (with fallback)
const NEMO_API_URL = process.env.NEMO_API_URL || 'http://nemo-guardrails:8080';

export async function POST(request: Request) {
  try {
    // Get the message from request body
    const data = await request.json();
    const { message } = data;
    
    if (!message) {
      return NextResponse.json(
        { success: false, message: 'Message content is required' },
        { status: 400 }
      );
    }
    
    // Prepare the payload for the NeMo Guardrails API
    const payload = {
      message: message,
      max_tokens: 512,
      temperature: 0.7
    };
    
    // Call the NeMo Guardrails API
    console.log(`Sending request to NeMo API at ${NEMO_API_URL}/chat`);
    const response = await axios.post(`${NEMO_API_URL}/chat`, payload, {
      headers: {
        'Content-Type': 'application/json'
      },
      timeout: 300000 // 300 second timeout
    });
    
    // Extract the response
    const generatedText = response.data.response;
    
    if (!generatedText) {
      console.error('No response generated from NeMo:', response.data);
      return NextResponse.json(
        { success: false, message: 'Failed to generate response from NeMo' },
        { status: 500 }
      );
    }
    
    // Return the generated text
    return NextResponse.json({
      success: true,
      response: generatedText
    });
    
  } catch (error) {
    console.error('Error calling NeMo API:', error);
    return NextResponse.json(
      { 
        success: false, 
        message: 'Failed to get response from NeMo',
        error: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    );
  }
}