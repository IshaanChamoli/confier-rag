import OpenAI from 'openai';
import { NextResponse } from 'next/server';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(request) {
  try {
    const { message, messageHistory, context } = await request.json();

    // Create a system message with the context
    const contextMessage = context ? {
      role: "system",
      content: `Answer the question based on the following context:\n\n${context.map(c => c.text).join('\n\n')}\n\nIf the context doesn't contain relevant information, you can say "I don't have enough information to answer that question."`
    } : {
      role: "system",
      content: "You are a helpful assistant. If you're not sure about something, please say so."
    };

    const completion = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [
        contextMessage,
        ...messageHistory,
        { role: "user", content: message }
      ],
      temperature: 0.7,
    });

    // Include used references in the response
    const response = completion.choices[0].message.content;
    const references = context?.map(c => ({ text: c.text.slice(0, 150) + "...", score: c.score }));

    return NextResponse.json({ 
      response,
      references 
    });
  } catch (error) {
    console.error('OpenAI API error:', error);
    return NextResponse.json(
      { error: "Failed to get response from OpenAI" },
      { status: 500 }
    );
  }
} 