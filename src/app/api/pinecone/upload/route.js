import { NextResponse } from 'next/server';
import { Pinecone } from '@pinecone-database/pinecone';

export async function POST(request) {
  try {
    const { vectors } = await request.json();

    if (!vectors || !Array.isArray(vectors)) {
      return NextResponse.json(
        { error: 'Invalid vectors data' },
        { status: 400 }
      );
    }

    // Initialize Pinecone client (new simplified way)
    const pinecone = new Pinecone({
      apiKey: process.env.PINECONE_API_KEY,
    });

    // Get the index directly
    const index = pinecone.index(process.env.PINECONE_INDEX);

    // Format vectors for Pinecone with additional metadata
    const pineconeVectors = vectors.map((vec, i) => ({
      id: `chunk_${Date.now()}_${i}`, // Unique ID with timestamp
      values: vec.embedding,
      metadata: {
        text: vec.text,
        chunkIndex: i,
        timestamp: new Date().toISOString(),
        source: 'chatbot-training'
      },
    }));

    // Upsert vectors to Pinecone in batches of 100
    const batchSize = 100;
    for (let i = 0; i < pineconeVectors.length; i += batchSize) {
      const batch = pineconeVectors.slice(i, i + batchSize);
      await index.upsert(batch);
    }

    return NextResponse.json({ 
      success: true, 
      message: `Successfully uploaded ${vectors.length} vectors to Pinecone`,
      vectorCount: vectors.length
    });

  } catch (error) {
    console.error('Pinecone upload error:', error);
    return NextResponse.json(
      { 
        error: 'Failed to upload to Pinecone',
        details: error.message 
      },
      { status: 500 }
    );
  }
} 