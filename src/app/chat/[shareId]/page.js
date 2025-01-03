'use client';
import { useState, useEffect } from 'react';

export default function PublicChat({ params }) {
  const { shareId } = params;
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [chatbot, setChatbot] = useState(null);

  const handleSendMessage = async () => {
    if (!newMessage.trim()) return;

    // Add user message
    const userMessage = { role: 'user', content: newMessage };
    setMessages(prev => [...prev, userMessage]);
    
    // Clear input
    setNewMessage('');

    // Add bot response
    const botMessage = { role: 'assistant', content: 'Hi!' };
    setMessages(prev => [...prev, botMessage]);
  };

  return (
    <div className="flex flex-col h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b px-6 py-3">
        <h1 className="text-xl font-semibold">
          {chatbot?.name || 'Chat'}
        </h1>
      </div>

      {/* Chat Area */}
      <div className="flex-1 p-4">
        <div className="max-w-3xl mx-auto flex flex-col h-full bg-white rounded-lg shadow-sm">
          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100 bg-gray-50 rounded-lg">
            {messages.map((message, index) => (
              <div 
                key={index} 
                className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'} my-2`}
              >
                <div 
                  className={`max-w-[80%] rounded-lg p-4 shadow-sm ${
                    message.role === 'user' 
                      ? 'bg-blue-500 text-white mr-2' 
                      : 'bg-white text-gray-800 ml-2'
                  }`}
                >
                  {message.content}
                </div>
              </div>
            ))}
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