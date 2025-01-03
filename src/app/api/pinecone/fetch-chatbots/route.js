import { NextResponse } from 'next/server';
import { Pinecone } from '@pinecone-database/pinecone';

export async function POST(request) {
  try {
    const { userEmail } = await request.json();

    if (!userEmail) {
      return NextResponse.json(
        { error: 'User email is required' },
        { status: 400 }
      );
    }

    const pinecone = new Pinecone({
      apiKey: process.env.PINECONE_API_KEY,
    });

    const index = pinecone.index(process.env.PINECONE_INDEX);

    // Query Pinecone to find all vectors for this user's email
    const queryResponse = await index.query({
      vector: new Array(1536).fill(0),
      filter: {
        userEmail: userEmail
      },
      includeMetadata: true,
      topK: 10000,
    });

    // Group vectors by chatbot
    const chatbotMap = queryResponse.matches.reduce((acc, match) => {
      const { metadata } = match;
      const chatbotId = metadata.shareId;
      
      if (!acc[chatbotId]) {
        acc[chatbotId] = {
          id: Date.now() + Math.random(),
          shareId: metadata.shareId,
          name: metadata.chatbotName,
          data: metadata.text, // Include the first chunk as data
          userName: metadata.userName,
          userEmail: metadata.userEmail
        };
      }
      return acc;
    }, {});

    const chatbots = Object.values(chatbotMap);

    return NextResponse.json({ 
      success: true,
      chatbots
    });

  } catch (error) {
    console.error('Error fetching chatbots:', error);
    return NextResponse.json(
      { error: 'Failed to fetch chatbots' },
      { status: 500 }
    );
  }
} 