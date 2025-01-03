'use client';
import { useState } from 'react';
import LoadingSpinner from './LoadingSpinner';

export default function CreateChatbot({ 
  uploadedFile, 
  chatbotTitle, 
  setChatbotTitle, 
  onComplete, 
  session 
}) {
  const [step, setStep] = useState(1); // 1: Edit Text, 2: Process Chunks
  const [content, setContent] = useState(uploadedFile.content);
  const [processedChunks, setProcessedChunks] = useState([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [currentChunkIndex, setCurrentChunkIndex] = useState(0);
  const [totalChunks, setTotalChunks] = useState(0);
  const [chunks, setChunks] = useState([]);

  // Step 1: Process text content
  const handleNextStep = () => {
    if (step === 1) {
      // Split into chunks and move to next step
      const allChunks = content.split(/(?<=[.!?])\s+/)
        .filter(chunk => chunk.trim());
      setChunks(allChunks);
      setTotalChunks(allChunks.length); // Process all chunks
      setStep(2);
      processChunks(allChunks); // Process all chunks
    }
  };

  // Step 2: Process chunks and get embeddings
  const processChunks = async (chunksToProcess) => {
    setIsProcessing(true);
    try {
      for (const chunk of chunksToProcess) {
        const response = await fetch('/api/embeddings', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ text: chunk }),
        });
        
        const data = await response.json();
        if (data.error) throw new Error(data.error);
        
        setProcessedChunks(prev => [...prev, {
          text: chunk,
          embedding: data.embedding
        }]);
        
        setCurrentChunkIndex(prev => prev + 1);
      }
    } catch (error) {
      console.error('Error processing chunks:', error);
    } finally {
      setIsProcessing(false);
    }
  };

  // Step 2: Upload to Pinecone
  const handlePineconeUpload = async () => {
    setIsProcessing(true);
    try {
      const response = await fetch('/api/pinecone/upload', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          vectors: processedChunks,
          chatbotName: chatbotTitle,
          userName: session.user.name,
          userEmail: session.user.email,
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Failed to upload to Pinecone');
      }

      // Create chatbot and add to sidebar
      const userSlug = session.user.name.toLowerCase().replace(/\s+/g, '');
      const chatbotSlug = chatbotTitle.trim().toLowerCase().replace(/\s+/g, '-');
      const shareUrl = `${userSlug}/${chatbotSlug}`;
      
      const newChatbot = {
        id: Date.now(),
        shareId: shareUrl,
        name: chatbotTitle.trim(),
        data: content,
        processedChunks,
        firstWords: content.split(' ').slice(0, 10).join(' '),
        userEmail: session.user.email,
        userName: session.user.name
      };

      onComplete(newChatbot);
      localStorage.setItem(shareUrl, JSON.stringify(newChatbot));
    } catch (error) {
      console.error('Error:', error);
      alert('Failed to create chatbot: ' + error.message);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-sm p-6 flex flex-col flex-1">
      {/* Step Indicator */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center ${step === 1 ? 'bg-blue-500 text-white' : 'bg-green-500 text-white'}`}>
              1
            </div>
            <div className="h-1 w-16 bg-gray-200 mx-2" />
            <div className={`w-8 h-8 rounded-full flex items-center justify-center ${step === 2 ? 'bg-blue-500 text-white' : 'bg-gray-200'}`}>
              2
            </div>
          </div>
          <div className="text-sm text-gray-500">
            Step {step} of 2
          </div>
        </div>
      </div>

      {step === 1 ? (
        // Step 1: Edit Text
        <>
          <div className="mb-4">
            <label htmlFor="chatbotTitle" className="block text-sm font-medium text-gray-700 mb-1">
              Chatbot Name
            </label>
            <input
              id="chatbotTitle"
              type="text"
              value={chatbotTitle}
              onChange={(e) => setChatbotTitle(e.target.value)}
              className="w-full border rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Enter a name for your chatbot"
            />
          </div>
          
          <div className="flex-1 flex flex-col min-h-0">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Content
            </label>
            <textarea
              className="flex-1 whitespace-pre-wrap text-sm text-gray-600 bg-gray-50 p-4 rounded-md resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={content}
              onChange={(e) => setContent(e.target.value)}
            />
          </div>
          
          <button 
            className="mt-4 bg-blue-500 text-white rounded-md py-2 px-4 hover:bg-blue-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            onClick={handleNextStep}
            disabled={!chatbotTitle.trim() || !content.trim()}
          >
            Next: Process Chunks
          </button>
        </>
      ) : (
        // Step 2: View Chunks and Process
        <div className="flex-1 flex flex-col min-h-0">
          <div className="sticky top-0 z-10 bg-gray-50/95 backdrop-blur-sm border-b p-4 shadow-sm">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-semibold">Text Chunks</h3>
              {currentChunkIndex >= totalChunks ? (
                <>
                  <div className="flex items-center gap-2 text-sm text-green-600">
                    <div className="h-2 w-2 rounded-full bg-green-500"></div>
                    {`All ${totalChunks} chunks converted`}
                  </div>
                  <button
                    onClick={handlePineconeUpload}
                    disabled={isProcessing}
                    className="ml-4 px-3 py-1 bg-blue-500 text-white text-sm rounded hover:bg-blue-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                  >
                    {isProcessing ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                        Uploading...
                      </>
                    ) : (
                      'Upload to Pinecone'
                    )}
                  </button>
                </>
              ) : (
                <div className="flex items-center gap-2 text-sm text-gray-500">
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-gray-500 border-t-transparent"></div>
                  Processing chunk {currentChunkIndex + 1}/{totalChunks}...
                </div>
              )}
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-4">
            <div className="space-y-4">
              {chunks.map((chunk, index) => {
                const processedChunk = processedChunks.find(pc => pc.text === chunk);
                
                return (
                  <div key={index} className="flex gap-4">
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

                    <div className="w-2/3 bg-white border rounded-lg shadow-sm p-4">
                      <h4 className="font-medium mb-2">Chunk {index + 1}</h4>
                      <p className="text-sm text-gray-700 whitespace-pre-wrap">{chunk}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
} 