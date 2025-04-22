import { NextResponse } from 'next/server';
import axios from 'axios';

// Environment variable for the LLM API URL (with fallback)
const LLM_API_URL = process.env.LLAMA_API_URL || 'http://llama-api:8000';

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
    
    // Prepare the payload for the LLM API
    const payload = {
      prompt: message,
      max_tokens: 1024,
      temperature: 0.7,
      top_p: 0.95,
      stop: ["<|im_end|>"]
    };
    
    // Call the LLM API
    console.log(`Sending request to LLM API at ${LLM_API_URL}/generate`);
    const response = await axios.post(`${LLM_API_URL}/generate`, payload, {
      headers: {
        'Content-Type': 'application/json'
      },
      timeout: 3600000 // 60 second timeout
    });
    
    // Extract the response
    const generatedText = response.data.response || response.data.generated_text;
    
    if (!generatedText) {
      console.error('No response generated from LLM:', response.data);
      return NextResponse.json(
        { success: false, message: 'Failed to generate response from LLM' },
        { status: 500 }
      );
    }
    
    // Return the generated text
    return NextResponse.json({
      success: true,
      response: generatedText
    });
    
  } catch (error) {
    console.error('Error calling LLM API:', error);
    return NextResponse.json(
      { 
        success: false, 
        message: 'Failed to get response from LLM',
        error: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    );
  }
}