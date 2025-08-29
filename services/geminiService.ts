import { GoogleGenAI, Chat, Type } from "@google/genai";

const SYSTEM_INSTRUCTION = `You are Snipestudy, a friendly and knowledgeable AI study assistant. Your goal is to help students understand complex topics, prepare for exams, and learn effectively. Explain concepts clearly, provide examples, and be encouraging. Keep your responses concise and mobile-friendly. Format your answers with markdown where it improves readability, for example using lists or bold text.`;

let ai: GoogleGenAI | null = null;

const getAi = (): GoogleGenAI => {
  if (!ai) {
    if (!process.env.API_KEY) {
      throw new Error("API_KEY environment variable not set");
    }
    ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  }
  return ai;
};

export const startChat = (): Chat => {
  const genAI = getAi();
  return genAI.chats.create({
    model: 'gemini-2.5-flash',
    config: {
      systemInstruction: SYSTEM_INSTRUCTION,
      temperature: 0.8,
      topP: 0.9,
    },
  });
};

export const generateStudyGuide = async (topic: string): Promise<string> => {
  const genAI = getAi();
  const prompt = `Create a comprehensive, well-structured study guide on the following topic: "${topic}". Use markdown for formatting, including headings, bold text, and lists to ensure clarity and readability for a student.`;
  
  const response = await genAI.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
  });

  return response.text;
};

const quizSchema = {
    type: Type.OBJECT,
    properties: {
        questions: {
            type: Type.ARRAY,
            items: {
                type: Type.OBJECT,
                properties: {
                    question: { type: Type.STRING },
                    options: { type: Type.ARRAY, items: { type: Type.STRING } },
                    correctAnswerIndex: { type: Type.INTEGER },
                    explanation: { type: Type.STRING },
                },
                required: ["question", "options", "correctAnswerIndex", "explanation"]
            }
        }
    },
    required: ["questions"]
};


export const generateQuiz = async (topic: string): Promise<any> => {
    const genAI = getAi();
    const prompt = `Generate a quiz with 5 multiple-choice questions on the topic: "${topic}". For each question, provide 4 options, the index of the correct answer, and a brief explanation for why it's correct.`;

    const response = await genAI.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
        config: {
            responseMimeType: "application/json",
            responseSchema: quizSchema,
        },
    });

    return JSON.parse(response.text);
};