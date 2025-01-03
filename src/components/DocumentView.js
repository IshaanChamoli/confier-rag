'use client';
import { useState, useEffect } from 'react';
import LoadingSpinner from './LoadingSpinner';

export default function DocumentView({ document, chatbotName, userEmail }) {
  const [chunks, setChunks] = useState([]);
  const [processedChunks, setProcessedChunks] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [totalChunks, setTotalChunks] = useState(0);

  useEffect(() => {
    const fetchChunks = async () => {
      try {
        const response = await fetch('/api/pinecone/fetch-chunks', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ 
            userEmail,
            chatbotName
          }),
        });

        const data = await response.json();
        if (!response.ok) {
          throw new Error(data.error || 'Failed to fetch chunks');
        }

        console.log('Fetched chunks:', data.chunks); // Debug log

        // Don't split document again, use the chunks from Pinecone directly
        setChunks(data.chunks.map(chunk => chunk.text));
        setProcessedChunks(data.chunks);
        setTotalChunks(data.chunks.length);

      } catch (error) {
        console.error('Error fetching chunks:', error);
      } finally {
        setIsLoading(false);
      }
    };

    if (chatbotName && userEmail) {
      fetchChunks();
    }
  }, [chatbotName, userEmail]);

  if (isLoading) {
    return <LoadingSpinner />;
  }

  return (
    <div className="flex h-full max-h-[calc(100vh-200px)] relative">
      <div className="w-full overflow-y-auto bg-gray-50 rounded-lg">
        {/* Sticky Header */}
        <div className="sticky top-0 z-10 bg-gray-50/95 backdrop-blur-sm border-b p-4 shadow-sm">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-semibold">Text Chunks</h3>
            <div className="flex items-center gap-2 text-sm text-green-600">
              <div className="h-2 w-2 rounded-full bg-green-500"></div>
              {totalChunks < 10 ? 
                `All ${totalChunks} chunks converted` : 
                'First 10 chunks converted'}
            </div>
          </div>
        </div>

        {/* Chunks Container */}
        <div className="p-4 space-y-4">
          {processedChunks.map((chunk, index) => (
            <div key={index} className="flex gap-4">
              {/* Embeddings Column (only for first 10) */}
              {index < 10 && (
                <div className="w-1/3 bg-white border rounded-lg shadow-sm p-4">
                  <h4 className="font-medium mb-2">Embedding {index + 1}</h4>
                  <div className="text-xs text-gray-500 space-y-1">
                    {chunk.embedding.slice(0, 10).map((value, i) => (
                      <div key={i} className="font-mono">{value.toFixed(6)}</div>
                    ))}
                    {chunk.embedding.length > 10 && (
                      <div className="text-center mt-1">...</div>
                    )}
                  </div>
                </div>
              )}

              {/* Text Chunk */}
              <div className={`${index < 10 ? 'w-2/3' : 'w-full'} bg-white border rounded-lg shadow-sm p-4`}>
                <h4 className="font-medium mb-2">Chunk {index + 1}</h4>
                <p className="text-sm text-gray-700 whitespace-pre-wrap">{chunk.text}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
} 