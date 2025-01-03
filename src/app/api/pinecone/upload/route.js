import { NextResponse } from 'next/server';
import { Pinecone } from '@pinecone-database/pinecone';

export async function POST(request) {
  try {
    const { vectors, chatbotName, userName, userEmail } = await request.json();

    if (!vectors || !Array.isArray(vectors)) {
      return NextResponse.json(
        { error: 'Invalid vectors data' },
        { status: 400 }
      );
    }

    const pinecone = new Pinecone({
      apiKey: process.env.PINECONE_API_KEY,
    });

    const index = pinecone.index(process.env.PINECONE_INDEX);

    // Format vectors with enhanced metadata
    const pineconeVectors = vectors.map((vec, i) => ({
      id: `chunk_${Date.now()}_${i}`,
      values: vec.embedding,
      metadata: {
        text: vec.text,
        chunkIndex: i,
        timestamp: new Date().toISOString(),
        source: 'chatbot-training',
        userName: userName,
        userEmail: userEmail,
        chatbotName: chatbotName,
        shareId: `${userName.toLowerCase().replace(/\s+/g, '')}/${chatbotName.toLowerCase().replace(/\s+/g, '-')}`
      },
    }));

    // Upsert vectors in batches
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