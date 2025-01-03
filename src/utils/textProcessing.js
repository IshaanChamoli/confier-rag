export const chunkText = (text, chunkSize = 800, overlap = 100) => {
  const chunks = [];
  let startIndex = 0;
  
  while (startIndex < text.length) {
    // Calculate end index with overlap
    let endIndex = startIndex + chunkSize;
    
    // If not at the end of text, try to find a natural break point
    if (endIndex < text.length) {
      // Look for the last period, question mark, or exclamation mark within reasonable range
      const lastPunctuation = Math.max(
        text.lastIndexOf('. ', endIndex),
        text.lastIndexOf('? ', endIndex),
        text.lastIndexOf('! ', endIndex)
      );
      
      if (lastPunctuation > startIndex) {
        endIndex = lastPunctuation + 1;
      }
    }
    
    chunks.push({
      text: text.slice(startIndex, endIndex).trim(),
      startIndex,
      endIndex
    });
    
    // Move start index forward by chunk size minus overlap
    startIndex = endIndex - overlap;
  }
  
  return chunks;
}; 