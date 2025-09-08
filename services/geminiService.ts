// Fix: Corrected video operation types. 'GenerateVideosOperationResponse' and 'VideosOperationResponse' are not exported.
// Based on the error message and API patterns, 'GenerateVideosOperation' is the correct type for both.
import { GoogleGenAI, Type, Modality, GenerateContentResponse, GenerateContentParameters, Part, GenerateVideosOperation, Content } from '@google/genai';
import { Message, Question, StorySlide, MindMapNode, Flashcard, KanbanTask, PresentationSlide, TranscriptSegment } from '../types';

// Initialize the AI service directly, assuming API_KEY is in the environment.
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY! });


const textModel = 'gemini-2.5-flash';
const imageGenModel = 'imagen-4.0-generate-001';
const imageEditModel = 'gemini-2.5-flash-image-preview';
const videoGenModel = 'veo-2.0-generate-001';

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

export const generateQuiz = async (topic: string, count: number): Promise<Question[]> => {
    const response = await ai.models.generateContent({
        model: textModel,
        contents: `Generate a quiz with ${count} multiple-choice questions about "${topic}". For each question, provide 4 options and the index of the correct answer.`,
        config: {
            responseMimeType: 'application/json',
            responseSchema: {
                type: Type.ARRAY,
                items: {
                    type: Type.OBJECT,
                    properties: {
                        text: { type: Type.STRING, description: "The question text." },
                        options: {
                            type: Type.ARRAY,
                            items: { type: Type.STRING },
                            description: "An array of 4 possible answers."
                        },
                        correctAnswerIndex: { type: Type.INTEGER, description: "The 0-based index of the correct answer in the options array." },
                    },
                    required: ['text', 'options', 'correctAnswerIndex'],
                },
            },
        },
    });
    return extractJson<Question[]>(response);
};

export const generateStory = (prompt: string): Promise<string> => {
    return ai.models.generateContent({
        model: textModel,
        contents: `Write a short, engaging story for a young adult based on this prompt: "${prompt}"`,
        config: { systemInstruction: "You are a creative storyteller." }
    }).then(res => res.text);
};

export const generateStorySlideshow = async (story: string): Promise<StorySlide[]> => {
    const response = await ai.models.generateContent({
        model: textModel,
        contents: `Based on the following story, create a slideshow with a title and content for each slide. The story is: "${story}"`,
        config: {
            responseMimeType: "application/json",
            responseSchema: {
                type: Type.ARRAY,
                items: {
                    type: Type.OBJECT,
                    properties: {
                        title: { type: Type.STRING },
                        content: { type: Type.STRING },
                    },
                    required: ['title', 'content'],
                }
            }
        },
    });
    return extractJson<StorySlide[]>(response);
};

export const generateChatResponse = async (messages: Message[], systemInstruction?: string, useSearch?: boolean): Promise<{ text: string, sources?: { uri: string; title: string }[] }> => {
    // Transform our Message[] format into the Content[] format the API expects.
    const contents: Content[] = messages.map(msg => {
        const parts: Part[] = [];
        
        if (msg.images && msg.images.length > 0) {
            msg.images.forEach(image => {
                const mimeType = image.match(/data:(.*);base64,/)?.[1] || 'image/jpeg';
                const data = image.split(',')[1];
                parts.push({ inlineData: { mimeType, data } });
            });
        }
        
        // A text part is required for multi-turn conversations.
        parts.push({ text: msg.text });
        
        return { role: msg.role, parts };
    }).filter(content => content.parts.length > 0);

    const config: GenerateContentParameters['config'] = useSearch ? { tools: [{ googleSearch: {} }] } : {};
    if (systemInstruction) {
        config.systemInstruction = systemInstruction;
    }

    const response = await ai.models.generateContent({ model: textModel, contents, config });
    
    const sources = response.candidates?.[0]?.groundingMetadata?.groundingChunks?.map(chunk => ({
        uri: chunk.web?.uri || '',
        title: chunk.web?.title || 'Source',
    })).filter(s => s.uri);

    return { text: response.text, sources };
};

export const summarizeText = (textToSummarize: string): Promise<string> => {
    return ai.models.generateContent({
        model: textModel,
        contents: `Please provide a concise summary of the following text:\n\n---\n\n${textToSummarize}`,
        config: { systemInstruction: "You are an expert in summarizing text, extracting key points efficiently." }
    }).then(res => res.text);
};

export const analyzeTextKeyPoints = (text: string): Promise<string> => {
    return ai.models.generateContent({
        model: textModel,
        contents: `Extract the key points from the following text as a bulleted list:\n\n---\n\n${text}`,
        config: { systemInstruction: "You are an expert at identifying and listing the most important points from a text." }
    }).then(res => res.text);
};

export const analyzeTextExplainSimply = (text: string): Promise<string> => {
    return ai.models.generateContent({
        model: textModel,
        contents: `Explain the following text in simple terms, as if you were talking to a 5-year-old:\n\n---\n\n${text}`,
        config: { systemInstruction: "You are an expert in simplifying complex topics for any audience." }
    }).then(res => res.text);
};


export const generateMindMap = async (topic: string): Promise<MindMapNode[]> => {
    const response = await ai.models.generateContent({
        model: textModel,
        contents: `Generate a mind map for the topic "${topic}". Provide a root node and several child nodes with their relationships (parentId). Each node must have a unique id, text, x, y coordinates, and an optional parentId. The root node's parentId should be null. Distribute nodes logically within a 1000x800 canvas.`,
        config: {
            responseMimeType: "application/json",
            responseSchema: {
                type: Type.OBJECT,
                properties: {
                    nodes: {
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
                            required: ['id', 'text', 'x', 'y'],
                        },
                    },
                },
            },
        },
    });
    return extractJson<{ nodes: MindMapNode[] }>(response).nodes;
};

export const generateHtmlApp = async (prompt: string): Promise<string> => {
    const response = await ai.models.generateContent({
        model: textModel,
        contents: `Create a single, self-contained HTML file with embedded CSS and JavaScript based on the following prompt. The HTML should be complete, valid, and ready to be rendered in a browser. Include the <html>, <head>, and <body> tags. Do not include any explanations, just the raw HTML code. Prompt: "${prompt}"`,
        config: { systemInstruction: "You are an expert web developer who creates self-contained HTML files." }
    });
    let html = response.text.trim();
    if (html.startsWith('```html')) {
        html = html.substring(7, html.length - 3).trim();
    }
    return html;
};

export const generateFlashcards = async (topic: string, count: number): Promise<Flashcard[]> => {
    const response = await ai.models.generateContent({
        model: textModel,
        contents: `Generate ${count} flashcards for the topic "${topic}". Each card should have a "front" (a question or term) and a "back" (the answer or definition).`,
        config: {
            responseMimeType: "application/json",
            responseSchema: {
                type: Type.ARRAY,
                items: {
                    type: Type.OBJECT,
                    properties: { front: { type: Type.STRING }, back: { type: Type.STRING } },
                    required: ['front', 'back'],
                },
            },
        },
    });
    return extractJson<Flashcard[]>(response);
};

export const transcribeAudio = async (file: File, setProgress: (progress: string) => void): Promise<TranscriptSegment[]> => {
    setProgress("Preparing audio...");
    const audioPart = await fileToGenerativePart(file);
    setProgress("Transcribing... this may take a moment.");
    
    const response = await ai.models.generateContent({
        model: textModel, // Best-effort with allowed model.
        contents: {
            parts: [ audioPart, { text: "Transcribe this audio file. Provide the transcript as an array of segments, each with a unique 'id', 'startTime' in seconds, and 'text'." }]
        },
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
                    },
                    required: ['id', 'startTime', 'text'],
                }
            }
        }
    });

    setProgress("Processing complete.");
    return extractJson<TranscriptSegment[]>(response);
};

export const generatePresentation = async (topic: string): Promise<Omit<PresentationSlide, 'id' | 'layout'>[]> => {
    const response = await ai.models.generateContent({
        model: textModel,
        contents: `Generate a presentation about "${topic}". Create about 5-7 slides, each with a title, content, and brief speaker notes.`,
        config: {
            responseMimeType: "application/json",
            responseSchema: {
                type: Type.ARRAY,
                items: {
                    type: Type.OBJECT,
                    properties: {
                        title: { type: Type.STRING },
                        content: { type: Type.STRING },
                        notes: { type: Type.STRING },
                    },
                    required: ['title', 'content', 'notes'],
                },
            },
        },
    });
    return extractJson<Omit<PresentationSlide, 'id' | 'layout'>[]>(response);
};

export const generateKanbanPlan = async (goal: string): Promise<{ tasks: { [taskId: string]: KanbanTask } }> => {
    const response = await ai.models.generateContent({
        model: textModel,
        contents: `Based on the goal "${goal}", generate a list of tasks for a Kanban board. Each task must have a unique 'id' and 'content'.`,
        config: {
            responseMimeType: "application/json",
            responseSchema: {
                type: Type.ARRAY,
                items: {
                    type: Type.OBJECT,
                    properties: {
                        id: { type: Type.STRING },
                        content: { type: Type.STRING },
                    },
                    required: ['id', 'content'],
                }
            }
        },
    });
    const result = extractJson<KanbanTask[]>(response);
    const tasksObject: { [taskId: string]: KanbanTask } = {};
    result.forEach(task => { tasksObject[task.id] = task; });
    return { tasks: tasksObject };
};

export const generateImage = async (prompt: string): Promise<string> => {
    const response = await ai.models.generateImages({
        model: imageGenModel,
        prompt,
        config: { numberOfImages: 1, outputMimeType: 'image/png' },
    });
    const base64ImageBytes = response.generatedImages[0].image.imageBytes;
    return `data:image/png;base64,${base64ImageBytes}`;
};

export const editImage = async (prompt: string, originalImage: string): Promise<{ image: string; text: string }> => {
    const mimeType = originalImage.match(/data:(.*);base64,/)?.[1] || 'image/png';
    const base64ImageData = originalImage.split(',')[1];

    const response = await ai.models.generateContent({
        model: imageEditModel,
        contents: { parts: [{ inlineData: { data: base64ImageData, mimeType } }, { text: prompt }] },
        config: { responseModalities: [Modality.IMAGE, Modality.TEXT] },
    });

    let editedImage: string | null = null, textResponse = "Edit applied.";

    for (const part of response.candidates[0].content.parts) {
        if (part.inlineData) editedImage = `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
        else if (part.text) textResponse = part.text;
    }
    if (!editedImage) throw new Error("The model did not return an edited image.");

    return { image: editedImage, text: textResponse };
};

export const generateVideo = async (prompt: string): Promise<GenerateVideosOperation> => {
    return await ai.models.generateVideos({
        model: videoGenModel,
        prompt,
        config: { numberOfVideos: 1 }
    });
};

export const getVideosOperation = async (operation: GenerateVideosOperation): Promise<GenerateVideosOperation> => {
    return await ai.operations.getVideosOperation({ operation });
};