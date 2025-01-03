'use client';
import { useState, useEffect, useRef } from 'react';
import { use } from 'react';
import { handleMessage, createChatMessage } from '@/utils/chat';

export default function PublicChat({ params }) {
  // Properly unwrap params using React.use()
  const resolvedParams = use(params);
  const { slug } = resolvedParams;
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [chatbot, setChatbot] = useState(null);
  const [isTyping, setIsTyping] = useState(false);

  const [username, docname] = slug || [];

  // Add ref for chat container
  const chatContainerRef = useRef(null);

  // Add useEffect to scroll to bottom when messages change
  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [messages]);

  // Add useEffect to fetch chatbot data when component mounts
  useEffect(() => {
    if (!username || !docname) return;
    
    const shareId = `${username}/${docname}`;
    const storedChatbot = localStorage.getItem(shareId);
    
    if (storedChatbot) {
      const chatbotData = JSON.parse(storedChatbot);
      console.log('Loaded chatbot data:', chatbotData); // Debug log
      setChatbot({
        ...chatbotData,
        name: chatbotData.name,
        userEmail: chatbotData.userEmail || username // Fallback to username if email not present
      });
    }
  }, [username, docname]);

  const getFirst10Words = (text) => {
    return text.split(' ').slice(0, 10).join(' ');
  };

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !chatbot || isTyping) return;

    console.log('Sending message with chatbot data:', {
      message: newMessage,
      chatbotName: chatbot.name,
      userEmail: chatbot.userEmail
    }); // Debug log
    
    const messageText = newMessage;
    setNewMessage(''); // Clear input immediately
    
    // Immediately show user message
    const userMessage = createChatMessage(messageText, true);
    setMessages(prev => [...prev, userMessage]);

    setIsTyping(true);

    try {
      console.log('Chatbot data:', chatbot); // Debug log
      const result = await handleMessage(messageText, chatbot, messages);
      console.log('Message result:', result); // Debug log
      
      if (result?.error) {
        setMessages(prev => [
          ...prev,
          createChatMessage("I apologize, but I encountered an error. Please try again.", false)
        ]);
        return;
      }

      // Add only the bot message since user message is already shown
      console.log('Bot message with references:', result.botMessage); // Debug log
      setMessages(prev => [...prev, result.botMessage]);
    } catch (error) {
      console.error('Send message error:', error);
      setMessages(prev => [
        ...prev,
        createChatMessage("I apologize, but I encountered an error. Please try again.", false)
      ]);
    } finally {
      setIsTyping(false);
    }
  };

  // First, add this debug log right before rendering messages
  console.log('All messages:', messages);

  return (
    <div className="flex flex-col h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b px-6 py-3">
        <h1 className="text-xl font-semibold">
          {docname ? decodeURIComponent(docname).replace(/-/g, ' ') : 'Chat'}
        </h1>
      </div>

      {/* Chat Area */}
      <div className="flex-1 p-4">
        <div className="max-w-3xl mx-auto flex flex-col h-full bg-white rounded-lg shadow-sm">
          {/* Messages */}
          <div 
            ref={chatContainerRef}
            className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100 bg-gray-50 rounded-lg smooth-scroll"
          >
            {messages.map((message, index) => {
              console.log('Rendering individual message:', message, 'References:', message.references);
              return (
                <div 
                  key={index} 
                  className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'} my-2`}
                >
                  <div className="max-w-[80%]">
                    <div 
                      className={`rounded-lg p-4 shadow-sm ${
                        message.role === 'user' 
                          ? 'bg-blue-500 text-white mr-2' 
                          : 'bg-red-500 text-white ml-2'
                      }`}
                    >
                      <div className="flex items-start gap-2">
                        <div className="flex-1">{message.content}</div>
                        {message.role === 'assistant' && message.references && message.references.length > 0 && (
                          <div className="group relative">
                            <svg 
                              xmlns="http://www.w3.org/2000/svg" 
                              className="h-5 w-5 text-white cursor-help opacity-70 hover:opacity-100" 
                              fill="none" 
                              viewBox="0 0 24 24" 
                              stroke="currentColor"
                            >
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            <div className="absolute bottom-full mb-2 hidden group-hover:block w-64 p-2 bg-gray-900 text-white text-sm rounded shadow-lg">
                              <div className="text-xs font-medium mb-1 flex justify-between">
                                <span>Chunk {message.references[0].chunkIndex}</span>
                                <span>Score: {(message.references[0].score * 100).toFixed(1)}%</span>
                              </div>
                              <p className="text-xs">{message.references[0].text}</p>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
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

          {/* Input */}
          <div className="p-4 border-t">
            <div className="flex gap-2">
              <input
                type="text"
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                placeholder="Type your message..."
                className="flex-1 border rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <button
                onClick={handleSendMessage}
                className="bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600 transition-colors"
              >
                Send
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 