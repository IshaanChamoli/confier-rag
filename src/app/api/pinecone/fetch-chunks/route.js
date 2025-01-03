import { NextResponse } from 'next/server';
import { Pinecone } from '@pinecone-database/pinecone';

export async function POST(request) {
  try {
    const { userEmail, chatbotName } = await request.json();

    if (!userEmail || !chatbotName) {
      return NextResponse.json(
        { error: 'User email and chatbot name are required' },
        { status: 400 }
      );
    }

    console.log('Fetching chunks for:', { userEmail, chatbotName }); // Debug log

    const pinecone = new Pinecone({
      apiKey: process.env.PINECONE_API_KEY,
    });

    const index = pinecone.index(process.env.PINECONE_INDEX);

    // Step 1 & 2: Query vectors for specific user and chatbot
    const queryResponse = await index.query({
      vector: new Array(1536).fill(0),
      filter: {
        userEmail,
        chatbotName
      },
      includeMetadata: true,
      includeValues: true,
      topK: 10000, // Get all possible chunks
    });

    console.log('Query response matches:', queryResponse.matches.length); // Debug log

    // Step 3 & 4: Process and sort all vectors
    const chunks = queryResponse.matches
      .map(match => {
        console.log('Processing match:', match.metadata); // Debug log
        return {
          text: match.metadata.text,
          embedding: match.values,
          chunkIndex: Number(match.metadata.chunkIndex)
        };
      })
      .sort((a, b) => a.chunkIndex - b.chunkIndex);

    console.log('Processed chunks:', {
      total: chunks.length,
      indices: chunks.map(c => c.chunkIndex)
    }); // Debug log

    return NextResponse.json({ 
      success: true,
      chunks,
      debug: {
        totalMatches: queryResponse.matches.length,
        processedChunks: chunks.length,
        userEmail,
        chatbotName
      }
    });

  } catch (error) {
    console.error('Error fetching chunks:', error);
    return NextResponse.json(
      { 
        error: 'Failed to fetch chunks',
        details: error.message,
        stack: error.stack
      },
      { status: 500 }
    );
  }
} 