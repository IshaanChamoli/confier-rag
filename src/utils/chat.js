// Function to get bot response from API
export const getBotResponse = async (message, messageHistory = [], chatbotData = null) => {
  try {
    // First, search for relevant context if chatbot data is provided
    let context = [];
    if (chatbotData?.name && chatbotData?.userEmail) {
      const searchResponse = await fetch('/api/pinecone/search', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          query: message,
          userEmail: chatbotData.userEmail,
          chatbotName: chatbotData.name
        }),
      });

      if (searchResponse.ok) {
        const { matches } = await searchResponse.json();
        context = matches;
      }
    }

    // Get chat response with context
    const response = await fetch('/api/chat', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ message, messageHistory, context }),
    });

    if (!response.ok) {
      throw new Error('Failed to get response');
    }

    const data = await response.json();
    return {
      response: data.response,
      references: data.references?.map(ref => ({
        text: ref.text,
        score: ref.score,
        chunkIndex: ref.chunkIndex
      }))
    };
  } catch (error) {
    console.error('API error:', error);
    return {
      response: "I apologize, but I encountered an error. Please try again.",
      references: []
    };
  }
};

// Shared message handler
export const createChatMessage = (message, isUser = true, references = []) => {
  const chatMessage = {
    role: isUser ? 'user' : 'assistant',
    content: message,
    references
  };
  console.log('Created chat message:', chatMessage); // Debug log
  return chatMessage;
};

// Shared send message handler
export const handleMessage = async (newMessage, chatbotData, messageHistory = []) => {
  if (!newMessage.trim()) return null;

  const userMessage = createChatMessage(newMessage, true);
  
  try {
    const { response, references } = await getBotResponse(newMessage, messageHistory, chatbotData);
    console.log('Got response with references:', { response, references }); // Debug log
    
    const botMessage = createChatMessage(response, false, references);
    console.log('Created bot message:', botMessage); // Debug log

    return {
      userMessage,
      botMessage,
      error: null
    };
  } catch (error) {
    console.error('Chat error:', error);
    return {
      userMessage,
      error: "Failed to get response. Please try again."
    };
  }
}; 