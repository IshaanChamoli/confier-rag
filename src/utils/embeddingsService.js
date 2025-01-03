export const getEmbeddings = async (text) => {
  try {
    const response = await fetch('/api/embeddings', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ text }),
    });

    if (!response.ok) {
      throw new Error('Failed to get embeddings');
    }

    const data = await response.json();
    return data.embedding;
  } catch (error) {
    console.error('Error getting embeddings:', error);
    throw error;
  }
};

export const processChunksWithEmbeddings = async (chunks) => {
  const processedChunks = [];
  
  for (const chunk of chunks) {
    const embedding = await getEmbeddings(chunk.text);
    processedChunks.push({
      ...chunk,
      embedding
    });
  }
  
  return processedChunks;
}; 