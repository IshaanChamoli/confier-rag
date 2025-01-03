// Function to get bot response from API
export const getBotResponse = async (message, messageHistory = []) => {
  try {
    const response = await fetch('/api/chat', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ message, messageHistory }),
    });

    if (!response.ok) {
      throw new Error('Failed to get response');
    }

    const data = await response.json();
    return data.response;
  } catch (error) {
    console.error('API error:', error);
    return "I apologize, but I encountered an error. Please try again.";
  }
};

// Shared message handler
export const createChatMessage = (message, isUser = true) => {
  return {
    role: isUser ? 'user' : 'assistant',
    content: message
  };
};

// Shared send message handler
export const handleMessage = async (newMessage, chatbotData, messageHistory = []) => {
  if (!newMessage.trim()) return null;

  // Create user message
  const userMessage = createChatMessage(newMessage, true);
  
  try {
    // Get bot response from OpenAI
    const botResponse = await getBotResponse(newMessage, messageHistory);
    const botMessage = createChatMessage(botResponse, false);

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