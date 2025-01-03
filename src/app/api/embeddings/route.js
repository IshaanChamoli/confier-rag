import OpenAI from 'openai';
import { NextResponse } from 'next/server';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(request) {
  try {
    const { text } = await request.json();
    
    if (!text || typeof text !== 'string') {
      return NextResponse.json(
        { error: "Invalid input: text is required and must be a string" },
        { status: 400 }
      );
    }

    const response = await openai.embeddings.create({
      model: "text-embedding-3-small",
      input: text,
      encoding_format: "float"
    });
    
    if (!response.data?.[0]?.embedding) {
      throw new Error('Invalid response from OpenAI API');
    }

    return NextResponse.json({ 
      embedding: response.data[0].embedding,
      success: true
    });
  } catch (error) {
    console.error('OpenAI API error:', error);
    return NextResponse.json(
      { 
        error: "Failed to get embeddings from OpenAI",
        details: error.message 
      },
      { status: 500 }
    );
  }
} 