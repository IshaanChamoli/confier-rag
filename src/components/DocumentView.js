'use client';
import { useState, useEffect } from 'react';

export default function DocumentView({ document, processedChunks: existingChunks, onChunksProcessed }) {
  const [chunks, setChunks] = useState([]);
  const [processedChunks, setProcessedChunks] = useState(existingChunks || []);
  const [isProcessing, setIsProcessing] = useState(false);
  const [currentChunkIndex, setCurrentChunkIndex] = useState(0);
  const [totalChunks, setTotalChunks] = useState(0);

  // Split document into chunks once when component mounts
  useEffect(() => {
    if (document) {
      const allChunks = document.split(/(?<=[.!?])\s+/)
        .filter(chunk => chunk.trim());
      const chunksToProcess = allChunks.slice(0, 10);
      setChunks(allChunks);
      setTotalChunks(Math.min(chunksToProcess.length, 10));
    }
  }, [document]);

  // Only process chunks if they haven't been processed before
  useEffect(() => {
    if (existingChunks?.length === totalChunks) {
      // If we have all chunks processed, just display them
      setProcessedChunks(existingChunks);
      setCurrentChunkIndex(totalChunks);
      setIsProcessing(false);
      return;
    }

    const processNextChunk = async () => {
      if (currentChunkIndex >= totalChunks) {
        setIsProcessing(false);
        return;
      }

      const chunkText = chunks[currentChunkIndex]?.trim();
      if (!chunkText) {
        setCurrentChunkIndex(prev => prev + 1);
        return;
      }

      setIsProcessing(true);
      try {
        const response = await fetch('/api/embeddings', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ text: chunkText }),
        });
        const data = await response.json();

        if (data.error) {
          throw new Error(data.error);
        }

        const newProcessedChunks = [...processedChunks, {
          text: chunkText,
          embedding: data.embedding
        }];
        
        setProcessedChunks(newProcessedChunks);
        if (onChunksProcessed) {
          onChunksProcessed(newProcessedChunks);
        }

        setCurrentChunkIndex(prev => prev + 1);
      } catch (error) {
        console.error('Error processing chunk:', error);
        setIsProcessing(false);
      }
    };

    if (chunks.length > 0 && currentChunkIndex < totalChunks) {
      processNextChunk();
    }
  }, [chunks, currentChunkIndex, totalChunks, existingChunks, onChunksProcessed]);

  return (
    <div className="flex h-full max-h-[calc(100vh-200px)] relative">
      <div className="w-full overflow-y-auto bg-gray-50 rounded-lg">
        {/* Sticky Header */}
        <div className="sticky top-0 z-10 bg-gray-50/95 backdrop-blur-sm border-b p-4 shadow-sm">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-semibold">Text Chunks</h3>
            {currentChunkIndex >= totalChunks ? (
              <div className="flex items-center gap-2 text-sm text-green-600">
                <div className="h-2 w-2 rounded-full bg-green-500"></div>
                {totalChunks < 10 ? 
                  `All ${totalChunks} chunks converted` : 
                  'First 10 chunks converted'}
              </div>
            ) : isProcessing && (
              <div className="flex items-center gap-2 text-sm text-gray-500">
                <div className="animate-spin rounded-full h-4 w-4 border-2 border-gray-500 border-t-transparent"></div>
                Processing chunk {currentChunkIndex + 1}/{totalChunks}...
              </div>
            )}
          </div>
        </div>

        {/* Chunks Container */}
        <div className="p-4 space-y-4">
          {chunks.map((chunk, index) => {
            const processedChunk = processedChunks.find(pc => pc.text === chunk);
            
            return (
              <div key={index} className="flex gap-4">
                {/* Embeddings Column (only for first 10) */}
                {index < 10 && (
                  <div className="w-1/3 bg-white border rounded-lg shadow-sm p-4">
                    <h4 className="font-medium mb-2">Embedding {index + 1}</h4>
                    {processedChunk ? (
                      <div className="text-xs text-gray-500 space-y-1">
                        {processedChunk.embedding.slice(0, 10).map((value, i) => (
                          <div key={i} className="font-mono">{value.toFixed(6)}</div>
                        ))}
                        {processedChunk.embedding.length > 10 && (
                          <div className="text-center mt-1">...</div>
                        )}
                      </div>
                    ) : (
                      <div className="text-xs text-gray-400 italic">
                        {index === currentChunkIndex ? 'Processing...' : 'Waiting...'}
                      </div>
                    )}
                  </div>
                )}

                {/* Text Chunk */}
                <div className={`${index < 10 ? 'w-2/3' : 'w-full'} bg-white border rounded-lg shadow-sm p-4`}>
                  <h4 className="font-medium mb-2">Chunk {index + 1}</h4>
                  <p className="text-sm text-gray-700 whitespace-pre-wrap">{chunk}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
} 