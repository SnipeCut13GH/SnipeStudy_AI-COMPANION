// Fix: Corrected video operation types. 'GenerateVideosOperationResponse' and 'VideosOperationResponse' are not exported.
// Based on the error message and API patterns, 'GenerateVideosOperation' is the correct type for both.
// Fix: Add GenerateImagesResponse to handle typed responses from the image generation API.
// Fix: Add GenerateVideosOperation to support video generation.
import { GoogleGenAI, Type, Modality, GenerateContentResponse, Part, Content, GenerateImagesResponse, Chat, GenerateVideosOperation } from '@google/genai';
import { Message, Question, MindMapNode, Flashcard, KanbanTask, PresentationSlide, TranscriptSegment, MessageRole } from '../types.ts';
// Fix: Import languages to support multi-language prompts.
import { languages } from './translations.ts';

// Initialize the AI service directly, assuming API_key is in the environment.
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY! });


const textModel = 'gemini-2.5-flash';
const imageGenModel = 'imagen-4.0-generate-001';
const imageEditModel = 'gemini-2.5-flash-image-preview';
// Fix: Add video generation model.
const videoGenModel = 'veo-2.0-generate-001';

const apiCall = async <T>(apiPromise: Promise<T>): Promise<T> => {
    if (!navigator.onLine) {
        throw new Error("You are currently offline. Please check your internet connection and try again.");
    }
    try {
        return await apiPromise;
    } catch (error: any) {
        console.error("Gemini API Error:", error);
        if (error.toString().includes('429') || (error.message && /quota|limit|billing/i.test(error.message))) {
            throw new Error("You've exceeded your API quota for now. Please check your plan and billing details. For more information, visit https://ai.google.dev/gemini-api/docs/rate-limits");
        }
        if (error.message && /safety|policy/i.test(error.message)) {
            throw new Error("The request was blocked due to safety policies. Please adjust your prompt and try again.");
        }
        if (error.message && /API_KEY/i.test(error.message)) {
            throw new Error("The API key is invalid or has not been set correctly.");
        }
        if (error instanceof TypeError && (error.message.includes('fetch') || error.message.includes('NetworkError'))) {
             throw new Error("A network error occurred. Please check your internet connection and try again.");
        }
        if (error.message) {
             throw new Error(`An AI error occurred: ${error.message}`);
        }
        throw new Error("An unknown error occurred while contacting the AI service. Please try again later.");
    }
};


const extractJson = <T>(response: GenerateContentResponse): T => {
    try {
        const text = response.text.trim();
        const jsonStr = text.startsWith('```json') ? text.substring(7, text.length - 3).trim() : text;
        return JSON.parse(jsonStr) as T;
    } catch (error) {
        console.error("Failed to parse JSON response:", response.text);
        throw new Error("Invalid JSON response from model.");
    }
};

const fileToGenerativePart = async (file: File): Promise<Part> => {
    const base64EncodedData = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve((reader.result as string).split(',')[1]);
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });
    return {
        inlineData: {
            mimeType: file.type,
            data: base64EncodedData,
        },
    };
};

export const generateQuiz = async (topic: string, count: number, language: string): Promise<Question[]> => {
    const languageName = languages[language as keyof typeof languages] || 'English';
    const response = await apiCall(ai.models.generateContent({
        model: textModel,
        contents: `Generate a quiz in ${languageName} with ${count} multiple-choice questions about "${topic}". For each question, provide 4 options and the index of the correct answer.`,
        config: {
            responseMimeType: 'application/json',
            responseSchema: {
                type: Type.ARRAY,
                items: {
                    type: Type.OBJECT,
                    properties: {
                        text: { type: Type.STRING },
                        options: { type: Type.ARRAY, items: { type: Type.STRING } },
                        correctAnswerIndex: { type: Type.INTEGER },
                    },
                },
            },
        },
    }));
    return extractJson<Question[]>(response);
};

export const generateMindMap = async (topic: string, language: string): Promise<MindMapNode[]> => {
    const languageName = languages[language as keyof typeof languages] || 'English';
    const response = await apiCall(ai.models.generateContent({
        model: textModel,
        contents: `Generate a mind map in ${languageName} for the topic "${topic}". Provide a hierarchical structure with a central root node and several child nodes. Each node should have an id, text, x, y coordinates (within a 1000x800 canvas), and an optional parentId.`,
        config: {
            responseMimeType: 'application/json',
            responseSchema: {
                type: Type.ARRAY,
                items: {
                    type: Type.OBJECT,
                    properties: {
                        id: { type: Type.STRING },
                        text: { type: Type.STRING },
                        x: { type: Type.NUMBER },
                        y: { type: Type.NUMBER },
                        parentId: { type: Type.STRING },
                    },
                },
            },
        },
    }));
    return extractJson<MindMapNode[]>(response);
};

export const generateHtmlApp = async (prompt: string): Promise<string> => {
    // FIX: Explicitly type the response to resolve property access error on 'unknown'.
    const response: GenerateContentResponse = await apiCall(ai.models.generateContent({
        model: textModel,
        contents: `Generate a complete, single-file HTML web application based on this prompt: "${prompt}". The HTML file must be self-contained, including all necessary HTML, CSS (inside <style> tags), and JavaScript (inside <script> tags). It must load Tailwind CSS from the CDN ('https://cdn.tailwindcss.com'). The response should contain only the HTML code, starting with <!DOCTYPE html> and ending with </html>.`,
    }));
    return response.text.trim().replace(/^```html\n|```$/g, '');
};

export const generateFlashcards = async (topic: string, count: number, language: string): Promise<Flashcard[]> => {
    const languageName = languages[language as keyof typeof languages] || 'English';
    const response = await apiCall(ai.models.generateContent({
        model: textModel,
        contents: `Generate ${count} flashcards in ${languageName} for the topic "${topic}". Each flashcard should have a "front" (question/term) and a "back" (answer/definition).`,
        config: {
            responseMimeType: 'application/json',
            responseSchema: {
                type: Type.ARRAY,
                items: {
                    type: Type.OBJECT,
                    properties: {
                        front: { type: Type.STRING },
                        back: { type: Type.STRING },
                    },
                },
            },
        },
    }));
    return extractJson<Flashcard[]>(response);
};

export const generateKanbanPlan = async (goal: string, language: string): Promise<{ tasks: { [taskId: string]: KanbanTask } }> => {
    const languageName = languages[language as keyof typeof languages] || 'English';
    const response = await apiCall(ai.models.generateContent({
        model: textModel,
        contents: `Based on the goal "${goal}", generate a list of tasks in ${languageName} for a Kanban board. Return a JSON object where the key is 'tasks' and the value is another object. In this inner object, each key should be a unique task ID (e.g., 'task-1', 'task-2'), and the value should be an object with 'id' and 'content' properties.`,
        config: {
            responseMimeType: 'application/json',
            responseSchema: {
                type: Type.OBJECT,
                properties: {
                    tasks: {
                        type: Type.OBJECT,
                        description: "An object where keys are task IDs and values are task details."
                    },
                },
            },
        },
    }));
    return extractJson<{ tasks: { [taskId: string]: KanbanTask } }>(response);
};

export const generatePresentation = async (topic: string, language: string): Promise<PresentationSlide[]> => {
    const languageName = languages[language as keyof typeof languages] || 'English';
    const response = await apiCall(ai.models.generateContent({
        model: textModel,
        contents: `Generate a 7-slide presentation in ${languageName} about "${topic}". For each slide, provide a title, content (2-3 sentences), speaker notes, and a concise image prompt for an AI image generator.`,
        config: {
            responseMimeType: 'application/json',
            responseSchema: {
                type: Type.ARRAY,
                items: {
                    type: Type.OBJECT,
                    properties: {
                        title: { type: Type.STRING },
                        content: { type: Type.STRING },
                        notes: { type: Type.STRING },
                        imagePrompt: { type: Type.STRING },
                    },
                },
            },
        },
    }));
    return extractJson<PresentationSlide[]>(response);
};

export const transcribeAudio = async (file: File, onProgress: (progress: string) => void): Promise<TranscriptSegment[]> => {
    onProgress("Uploading file...");
    const part = await fileToGenerativePart(file);
    onProgress("Processing audio... this may take a while.");
    
    const response = await apiCall(ai.models.generateContent({
        model: textModel,
        contents: { parts: [part, { text: "Transcribe this audio file with timestamps for each segment." }] },
        config: {
            responseMimeType: 'application/json',
            responseSchema: {
                type: Type.ARRAY,
                items: {
                    type: Type.OBJECT,
                    properties: {
                        id: { type: Type.STRING },
                        startTime: { type: Type.NUMBER },
                        text: { type: Type.STRING },
                    }
                }
            }
        }
    }));
    
    onProgress("Transcription complete.");
    return extractJson<TranscriptSegment[]>(response);
};

export const summarizeText = async (text: string, language: string): Promise<string> => {
    const languageName = languages[language as keyof typeof languages] || 'English';
    // FIX: Explicitly type the response to resolve property access error on 'unknown'.
    const response: GenerateContentResponse = await apiCall(ai.models.generateContent({
        model: textModel,
        contents: `Summarize the following text in ${languageName}:\n\n${text}`,
    }));
    return response.text;
};

export const analyzeTextKeyPoints = async (text: string, language: string): Promise<string> => {
    const languageName = languages[language as keyof typeof languages] || 'English';
    // FIX: Explicitly type the response to resolve property access error on 'unknown'.
    const response: GenerateContentResponse = await apiCall(ai.models.generateContent({
        model: textModel,
        contents: `Extract the key points from the following text as a bulleted list in ${languageName}:\n\n${text}`,
    }));
    return response.text;
};

export const analyzeTextExplainSimply = async (text: string, language: string): Promise<string> => {
    const languageName = languages[language as keyof typeof languages] || 'English';
    // FIX: Explicitly type the response to resolve property access error on 'unknown'.
    const response: GenerateContentResponse = await apiCall(ai.models.generateContent({
        model: textModel,
        contents: `Explain the following text in simple terms in ${languageName}:\n\n${text}`,
    }));
    return response.text;
};

export const generateChatResponse = async (
    history: Message[],
    systemInstruction: string,
    isWebSearch: boolean
): Promise<{ text: string; sources?: { uri: string; title: string }[] }> => {
    
    const config: any = {
        systemInstruction,
    };
    if (isWebSearch) {
        config.tools = [{ googleSearch: {} }];
    }

    const contents: Content[] = history.map(msg => {
        const parts: Part[] = [];
        
        if (msg.images && msg.images.length > 0) {
            msg.images.forEach(imgDataUrl => {
                const mimeType = imgDataUrl.match(/data:(.*);base64,/)?.[1] || 'image/jpeg';
                const data = imgDataUrl.split(',')[1];
                parts.push({ inlineData: { mimeType, data } });
            });
        }

        if (msg.text.trim() !== '' || parts.length === 0) {
            parts.push({ text: msg.text });
        }

        return {
            role: msg.role === MessageRole.USER ? 'user' : 'model',
            parts,
        };
    });

    const response: GenerateContentResponse = await apiCall(ai.models.generateContent({
        model: textModel,
        contents: contents,
        config: config,
    }));
    
    const text = response.text;
    const sources = response.candidates?.[0]?.groundingMetadata?.groundingChunks
        ?.map((chunk: any) => chunk.web)
        .filter((web: any) => web?.uri && web?.title) || [];
    
    return { text, sources };
};

export const generateImage = async (prompt: string): Promise<string> => {
    const response = await apiCall(ai.models.generateImages({
        model: imageGenModel,
        prompt: prompt,
        config: { numberOfImages: 1, outputMimeType: 'image/png' },
    }));
    const base64ImageBytes = (response as GenerateImagesResponse).generatedImages[0].image.imageBytes;
    return `data:image/png;base64,${base64ImageBytes}`;
};

export const editImage = async (prompt: string, imageBase64: string): Promise<{ text: string, image: string }> => {
    const mimeType = imageBase64.match(/data:(.*);base64,/)?.[1] || 'image/png';
    const data = imageBase64.split(',')[1];
    
    // FIX: Explicitly type the response to resolve property access error on 'unknown'.
    const response: GenerateContentResponse = await apiCall(ai.models.generateContent({
        model: imageEditModel,
        contents: { parts: [
            { inlineData: { data, mimeType } },
            { text: prompt },
        ]},
        config: {
            responseModalities: [Modality.IMAGE, Modality.TEXT],
        },
    }));

    let editedImage: string | null = null;
    let textResponse: string = "Image processed.";
    for (const part of response.candidates[0].content.parts) {
        if (part.inlineData) {
            editedImage = `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
        } else if (part.text) {
            textResponse = part.text;
        }
    }
    
    if (!editedImage) {
        throw new Error("The AI did not return an edited image. It might have refused the request for safety reasons.");
    }

    return { text: textResponse, image: editedImage };
};

// Fix: Add generateVideo function to support video generation.
export const generateVideo = async (prompt: string): Promise<GenerateVideosOperation> => {
    const operation = await apiCall(ai.models.generateVideos({
        model: videoGenModel,
        prompt: prompt,
        config: {
            numberOfVideos: 1
        }
    }));
    return operation;
};

// Fix: Add getVideosOperation function to poll for video generation status.
export const getVideosOperation = async (operation: GenerateVideosOperation): Promise<GenerateVideosOperation> => {
    const updatedOperation = await apiCall(ai.operations.getVideosOperation({ operation }));
    return updatedOperation;
};