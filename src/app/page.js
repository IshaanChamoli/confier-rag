'use client';
import { useSession, signIn, signOut } from "next-auth/react";
import { useState, useRef, useEffect } from 'react';
import FileUpload from '@/components/FileUpload';
import Image from 'next/image';
import { nanoid } from 'nanoid';
import { handleMessage, createChatMessage } from '@/utils/chat';
import DocumentView from '@/components/DocumentView';
import { chunkText } from '@/utils/textProcessing';
import CreateChatbot from '@/components/CreateChatbot';

export default function Home() {
  const { data: session, status } = useSession();
  const [uploadedFile, setUploadedFile] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [chatbots, setChatbots] = useState([]);
  const [selectedChatbot, setSelectedChatbot] = useState(null);
  const [view, setView] = useState(null); // 'document' or 'chat'
  const [messagesMap, setMessagesMap] = useState({});
  const [newMessage, setNewMessage] = useState('');
  const [chatbotTitle, setChatbotTitle] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  // Add ref for chat container
  const chatContainerRef = useRef(null);

  // Add useEffect to scroll to bottom when messages change
  useEffect(() => {
    if (chatContainerRef.current && selectedChatbot) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [messagesMap, selectedChatbot]);

  const handleSignIn = async () => {
    try {
      await signIn('google', {
        callbackUrl: '/',
        redirect: true
      });
    } catch (error) {
      console.error('Sign in error:', error);
    }
  };

  const handleFileUpload = (fileData) => {
    setUploadedFile(fileData);
    setChatbotTitle(fileData.name.replace('.txt', ''));
    setIsUploading(false);
  };

  const handleCreateChatbot = async () => {
    if (!uploadedFile || !chatbotTitle.trim()) return;
    
    setIsProcessing(true);
    
    try {
      // Create URL-friendly IDs
      const userSlug = session.user.name.toLowerCase().replace(/\s+/g, '');
      const chatbotSlug = chatbotTitle.trim().toLowerCase().replace(/\s+/g, '-');
      const shareUrl = `${userSlug}/${chatbotSlug}`;
      
      // Split document into chunks and get embeddings
      const allChunks = uploadedFile.content.split(/(?<=[.!?])\s+/)
        .filter(chunk => chunk.trim())
        .slice(0, 10); // Only process first 10 chunks

      const processedChunks = [];
      
      // Process each chunk
      for (const chunk of allChunks) {
        const response = await fetch('/api/embeddings', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ text: chunk }),
        });
        
        const data = await response.json();
        if (data.error) throw new Error(data.error);
        
        processedChunks.push({
          text: chunk,
          embedding: data.embedding
        });
      }
      
      const newChatbot = {
        id: Date.now(),
        shareId: shareUrl,
        name: chatbotTitle.trim(),
        data: uploadedFile.content,
        processedChunks: processedChunks,
        firstWords: uploadedFile.content.split(' ').slice(0, 10).join(' ')
      };
      
      setChatbots(prev => [...prev, newChatbot]);
      localStorage.setItem(shareUrl, JSON.stringify(newChatbot));
      
      setUploadedFile(null);
      setChatbotTitle('');
      setIsUploading(false);
    } catch (error) {
      console.error('Error creating chatbot:', error);
      alert('Failed to create chatbot. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleChatbotClick = (botId) => {
    if (selectedChatbot === botId) {
      setSelectedChatbot(null); // collapse if clicking the same bot
    } else {
      setSelectedChatbot(botId);
      setView(null); // reset view when selecting new bot
    }
  };

  const handleViewSelect = (botId, viewType) => {
    setSelectedChatbot(botId);
    setView(viewType);
  };

  const handleTextEdit = (newContent, botId = null) => {
    if (botId) {
      // Update existing chatbot's content
      setChatbots(prev => prev.map(bot => 
        bot.id === botId 
          ? { ...bot, data: newContent }
          : bot
      ));
    } else {
      // Update uploaded file content
      setUploadedFile(prev => ({ ...prev, content: newContent }));
    }
  };

  const handleSendMessage = async (botId) => {
    if (!newMessage.trim() || isTyping) return;

    const currentBot = chatbots.find(b => b.id === botId);
    if (!currentBot) return;

    const messageText = newMessage;
    setNewMessage(''); // Clear input immediately
    
    // Immediately show user message
    const userMessage = createChatMessage(messageText, true);
    setMessagesMap(prev => ({
      ...prev,
      [botId]: [...(prev[botId] || []), userMessage]
    }));

    setIsTyping(true);

    try {
      // Get bot response
      const messages = await handleMessage(
        messageText, 
        currentBot, 
        messagesMap[botId] || []
      );

      if (messages?.error) {
        setMessagesMap(prev => ({
          ...prev,
          [botId]: [
            ...(prev[botId] || []),
            createChatMessage("I apologize, but I encountered an error. Please try again.", false)
          ]
        }));
        return;
      }

      // Add only the bot message since user message is already shown
      setMessagesMap(prev => ({
        ...prev,
        [botId]: [...(prev[botId] || []), messages.botMessage]
      }));
    } catch (error) {
      console.error('Send message error:', error);
      setMessagesMap(prev => ({
        ...prev,
        [botId]: [
          ...(prev[botId] || []),
          createChatMessage("I apologize, but I encountered an error. Please try again.", false)
        ]
      }));
    } finally {
      setIsTyping(false);
    }
  };

  useEffect(() => {
    const loadUserChatbots = async () => {
      if (session?.user?.email) {
        try {
          const response = await fetch('/api/pinecone/fetch-chatbots', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ 
              userEmail: session.user.email 
            }),
          });

          const data = await response.json();
          
          if (!response.ok) {
            throw new Error(data.error || 'Failed to fetch chatbots');
          }

          if (data.chatbots?.length > 0) {
            // Merge with any existing local chatbots
            setChatbots(prev => {
              const existingIds = prev.map(bot => bot.shareId);
              const newBots = data.chatbots.filter(bot => !existingIds.includes(bot.shareId));
              return [...prev, ...newBots];
            });
          }
        } catch (error) {
          console.error('Error loading chatbots:', error);
          // Optionally show error to user
        }
      }
    };

    loadUserChatbots();
  }, [session]); // Run when session changes (user logs in)

  if (status === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="bg-white p-8 rounded-lg shadow-lg text-center">
          <h1 className="text-2xl font-bold mb-6">Welcome to ChatBot Builder</h1>
          <p className="text-gray-600 mb-8">Sign in to create and manage your custom chatbots</p>
          <button
            onClick={handleSignIn}
            className="flex items-center gap-2 bg-white text-gray-700 px-6 py-2 rounded-md border hover:bg-gray-50 transition-colors mx-auto"
          >
            <svg viewBox="0 0 24 24" width="24" height="24" xmlns="http://www.w3.org/2000/svg">
              <g transform="matrix(1, 0, 0, 1, 27.009001, -39.238998)">
                <path fill="#4285F4" d="M -3.264 51.509 C -3.264 50.719 -3.334 49.969 -3.454 49.239 L -14.754 49.239 L -14.754 53.749 L -8.284 53.749 C -8.574 55.229 -9.424 56.479 -10.684 57.329 L -10.684 60.329 L -6.824 60.329 C -4.564 58.239 -3.264 55.159 -3.264 51.509 Z"/>
                <path fill="#34A853" d="M -14.754 63.239 C -11.514 63.239 -8.804 62.159 -6.824 60.329 L -10.684 57.329 C -11.764 58.049 -13.134 58.489 -14.754 58.489 C -17.884 58.489 -20.534 56.379 -21.484 53.529 L -25.464 53.529 L -25.464 56.619 C -23.494 60.539 -19.444 63.239 -14.754 63.239 Z"/>
                <path fill="#FBBC05" d="M -21.484 53.529 C -21.734 52.809 -21.864 52.039 -21.864 51.239 C -21.864 50.439 -21.724 49.669 -21.484 48.949 L -21.484 45.859 L -25.464 45.859 C -26.284 47.479 -26.754 49.299 -26.754 51.239 C -26.754 53.179 -26.284 54.999 -25.464 56.619 L -21.484 53.529 Z"/>
                <path fill="#EA4335" d="M -14.754 43.989 C -12.984 43.989 -11.404 44.599 -10.154 45.789 L -6.734 42.369 C -8.804 40.429 -11.514 39.239 -14.754 39.239 C -19.444 39.239 -23.494 41.939 -25.464 45.859 L -21.484 48.949 C -20.534 46.099 -17.884 43.989 -14.754 43.989 Z"/>
              </g>
            </svg>
            Sign in with Google
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      {/* Sidebar - make it narrower */}
      <div className="w-56 bg-white border-r flex flex-col">
        <div className="p-4 border-b">
          <div className="flex items-center gap-3">
            {session.user?.image && (
              <Image 
                src={session.user.image} 
                alt="Profile picture"
                width={32}
                height={32}
                className="rounded-full"
              />
            )}
            <span className="font-semibold truncate">
              {session.user?.name?.split(' ')[0]}
            </span>
          </div>
        </div>
        
        {/* Chatbot List */}
        <div className="flex-1 overflow-y-auto p-4">
          <button 
            className="w-full bg-blue-500 text-white rounded-md py-2 mb-4 hover:bg-blue-600 transition-colors"
            onClick={() => {
              setUploadedFile(null);  // Reset uploaded file
              setChatbotTitle('');    // Reset title
              setIsUploading(true);   // Show upload interface
              setView(null);          // Reset view
              setSelectedChatbot(null); // Deselect current chatbot
            }}
          >
            + New Chatbot
          </button>
          
          <div className="space-y-2">
            {chatbots.length > 0 ? (
              chatbots.map(bot => (
                <div key={bot.id} className="border rounded-md overflow-hidden">
                  <div 
                    className={`p-3 bg-gray-50 hover:bg-gray-100 cursor-pointer transition-colors flex items-center justify-between ${selectedChatbot === bot.id ? 'bg-gray-100' : ''}`}
                    onClick={() => handleChatbotClick(bot.id)}
                  >
                    <p className="font-medium text-sm">{bot.name}</p>
                    <svg 
                      xmlns="http://www.w3.org/2000/svg" 
                      className={`h-4 w-4 transition-transform ${selectedChatbot === bot.id ? 'rotate-180' : ''}`} 
                      fill="none" 
                      viewBox="0 0 24 24" 
                      stroke="currentColor"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </div>
                  
                  {/* Dropdown Menu */}
                  {selectedChatbot === bot.id && (
                    <div className="border-t">
                      <button
                        className={`w-full text-left px-4 py-2 text-sm hover:bg-gray-50 ${view === 'document' && selectedChatbot === bot.id ? 'bg-blue-50 text-blue-600' : ''}`}
                        onClick={() => handleViewSelect(bot.id, 'document')}
                      >
                        📄 View Document
                      </button>
                      <button
                        className={`w-full text-left px-4 py-2 text-sm hover:bg-gray-50 ${view === 'chat' && selectedChatbot === bot.id ? 'bg-blue-50 text-blue-600' : ''}`}
                        onClick={() => handleViewSelect(bot.id, 'chat')}
                      >
                        💬 Open Chat
                      </button>
                      <button
                        className="w-full text-left px-4 py-2 text-sm hover:bg-gray-50 flex items-center gap-2"
                        onClick={() => {
                          const shareUrl = `${window.location.origin}/share/${bot.shareId}`;
                          navigator.clipboard.writeText(shareUrl);
                          // Optional: Show a toast notification that the link was copied
                        }}
                      >
                        🔗 Copy Share Link
                      </button>
                    </div>
                  )}
                </div>
              ))
            ) : (
              <p className="text-sm text-gray-500">Your chatbots will appear here</p>
            )}
          </div>
        </div>

        {/* Sidebar Footer */}
        <div className="p-4 border-t">
          <button
            onClick={() => signOut()}
            className="text-sm text-gray-600 hover:text-gray-900 flex items-center gap-2"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
            Sign Out
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        {/* Header - reduce padding */}
        <div className="bg-white border-b px-6 py-3">
          <h1 className="text-xl font-semibold">ChatBot Builder</h1>
        </div>

        {/* Chat Area - reduce padding and increase max-width */}
        <div className="flex-1 p-4 flex">
          <div className="max-w-6xl w-full mx-auto flex flex-col flex-1">
            {isUploading ? (
              <div className="bg-white rounded-lg shadow-sm p-6 flex flex-col flex-1">
                <h2 className="text-xl font-semibold mb-4">Upload Training Data</h2>
                <FileUpload onFileUpload={handleFileUpload} />
              </div>
            ) : uploadedFile ? (
              <CreateChatbot
                uploadedFile={uploadedFile}
                chatbotTitle={chatbotTitle}
                setChatbotTitle={setChatbotTitle}
                onComplete={(newChatbot) => {
                  setChatbots(prev => [...prev, newChatbot]);
                  setUploadedFile(null);
                  setChatbotTitle('');
                  setIsUploading(false);
                }}
                session={session}
              />
            ) : view === 'document' ? (
              <div className="bg-white rounded-lg shadow-sm p-6 flex flex-col flex-1">
                <h2 className="text-xl font-semibold mb-4">
                  {chatbots.find(b => b.id === selectedChatbot)?.name}
                </h2>
                <div className="flex-1 flex flex-col min-h-0">
                  <DocumentView 
                    document={chatbots.find(b => b.id === selectedChatbot)?.data}
                    processedChunks={chatbots.find(b => b.id === selectedChatbot)?.processedChunks}
                    chatbotName={chatbots.find(b => b.id === selectedChatbot)?.name}
                    userName={session.user.name}
                    userEmail={session.user.email}
                    onChunksProcessed={(newChunks) => {
                      setChatbots(prev => prev.map(bot => 
                        bot.id === selectedChatbot 
                          ? { ...bot, processedChunks: newChunks }
                          : bot
                      ));
                    }}
                  />
                </div>
              </div>
            ) : view === 'chat' ? (
              <div className="bg-white rounded-lg shadow-sm p-6 flex flex-col flex-1">
                <h2 className="text-xl font-semibold mb-4 pb-3 border-b">
                  Chat with {chatbots.find(b => b.id === selectedChatbot)?.name}
                </h2>
                
                <div 
                  ref={chatContainerRef}
                  className="flex-1 overflow-y-auto mb-4 space-y-4 max-h-[calc(100vh-250px)] pr-4 scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100 bg-gray-50 p-4 rounded-lg smooth-scroll"
                >
                  {(messagesMap[selectedChatbot] || []).map((message, index) => (
                    <div 
                      key={index} 
                      className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'} my-2`}
                    >
                      <div 
                        className={`max-w-[80%] rounded-lg p-4 shadow-sm transition-all duration-200 ${
                          message.role === 'user' 
                            ? 'bg-blue-500 text-white mr-2 hover:bg-blue-600' 
                            : 'bg-white text-gray-800 ml-2 hover:shadow-md'
                        }`}
                      >
                        {message.content}
                      </div>
                    </div>
                  ))}
                  {isTyping && (
                    <div className="flex justify-start my-2">
                      <div className="bg-white text-gray-800 ml-2 rounded-lg p-4 shadow-sm typing-indicator">
                        <span style={{"--delay": 0}}>.</span>
                        <span style={{"--delay": 1}}>.</span>
                        <span style={{"--delay": 2}}>.</span>
                      </div>
                    </div>
                  )}
                </div>

                <div className="pt-4 border-t">
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={newMessage}
                      onChange={(e) => setNewMessage(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && !e.shiftKey && handleSendMessage(selectedChatbot)}
                      placeholder="Type your message..."
                      disabled={isTyping}
                      className={`flex-1 border rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all duration-200 ${
                        isTyping ? 'opacity-50 cursor-not-allowed' : ''
                      }`}
                    />
                    <button
                      onClick={() => handleSendMessage(selectedChatbot)}
                      disabled={isTyping || !newMessage.trim()}
                      className={`bg-blue-500 text-white px-4 py-2 rounded-lg transition-all duration-200 ${
                        isTyping || !newMessage.trim() 
                          ? 'opacity-50 cursor-not-allowed' 
                          : 'hover:bg-blue-600 hover:shadow-md'
                      }`}
                    >
                      {isTyping ? 'Sending...' : 'Send'}
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="bg-white rounded-lg shadow-sm p-6 text-center">
                <h2 className="text-xl font-semibold mb-2">Welcome to ChatBot Builder! 🤖</h2>
                <p className="text-gray-600">
                  Create your first chatbot by clicking the "New Chatbot" button in the sidebar.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
