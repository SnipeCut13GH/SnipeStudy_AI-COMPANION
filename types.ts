

// Fix: Add MessageRole enum and remove circular import.
export enum MessageRole {
  USER = 'user',
  MODEL = 'model',
}

// Fix: Add missing Translations type.
export type Translations = Record<string, Record<string, string>>;

export interface Message {
  id: string;
  role: MessageRole;
  text: string;
  images?: string[];
  isError?: boolean;
  sources?: { uri: string; title: string }[];
  codeBlock?: { language: string; code: string; result?: string };
  flashcardDeckId?: string;
  primarySource?: { uri: string; title: string };
}

export interface ChatSession {
  id: string;
  title: string;
  messages: Message[];
  createdAt: string; // ISO date string
}

export interface Question {
    id:string;
    text: string;
    options: string[];
    correctAnswerIndex: number;
}
  
export interface QuizToolData {
    topic: string;
    questions: Question[];
    currentQuestionIndex: number;
    userAnswers: (number | null)[];
    score: number | null;
    state: 'config' | 'taking' | 'result';
}

export interface MindMapNode {
    id: string;
    text: string;
    x: number;
    y: number;
    parentId?: string;
}

export interface MindMapToolData {
    nodes: MindMapNode[];
}

export interface User {
    id: string;
    name: string;
    avatarUrl: string;
}

export interface Command {
    id: string;
    name: string;
    category: string;
    action: () => void;
}

export interface CodeModeToolData {
    prompt: string;
    generatedHtml: string | null;
}

export interface PresentationSlide {
    id:string;
    title: string;
    content: string;
    layout: 'title' | 'content';
    notes: string;
    imagePrompt?: string;
    imageUrl?: string;
}

export interface PresentationToolData {
    slides: PresentationSlide[];
}

export interface KanbanTask {
    id: string;
    content: string;
}
  
export interface KanbanColumn {
    id: string;
    title: string;
    taskIds: string[];
}

export interface KanbanToolData {
    tasks: { [taskId: string]: KanbanTask };
    columns: { [columnId: string]: KanbanColumn };
    columnOrder: string[];
}

export interface CalendarEvent {
    id: string;
    title: string;
    start: string; // ISO string
    end: string;   // ISO string
    allDay: boolean;
}

export interface CalendarToolData {
    events: CalendarEvent[];
}

export interface ImageEditorToolData {
    originalImage: string | null; // base64 data URL
    editedImage: string | null;   // base64 data URL
    prompt: string;
    status?: 'idle' | 'generating' | 'complete' | 'error';
    errorMessage?: string;
}

// Fix: Add VideoGeneratorToolData to support the video generator feature.
export interface VideoGeneratorToolData {
    prompt: string;
    videoUrl: string | null;
    operation: any | null; // Can be a complex object from the API
    status: 'idle' | 'generating' | 'complete' | 'error';
    errorMessage?: string;
}

// Fix: Add missing tool data types.
export interface WhiteboardDrawing {
    id: string;
    path: [number, number][];
    color: string;
    strokeWidth: number;
}
  
export interface WhiteboardToolData {
    drawings: WhiteboardDrawing[];
}

export interface Flashcard {
    id: string;
    front: string;
    back: string;
}
  
export interface FlashcardDeck {
    id: string;
    title: string;
    cards: Flashcard[];
}
  
export interface FlashcardToolData {
    decks: { [deckId: string]: FlashcardDeck };
}

export interface TranscriptSegment {
    id: string;
    startTime: number;
    text: string;
}
  
export interface AudioTranscriptionToolData {
    audioFile: {
      name: string;
      url: string;
    };
    transcript: TranscriptSegment[];
}

export interface DocsToolData {
    inputText: string;
    analysisResult: string | null;
    analysisType: 'summary' | 'keyPoints' | 'simple' | null;
}

export type SmartboardObject =
  | { id: string; type: 'drawing'; path: [number, number][]; x: number; y: number; color: string; strokeWidth: number }
  | { id: string; type: 'text'; text: string; x: number; y: number; width: number; height: number; fontSize: number }
  | { id: string; type: 'image'; dataUrl: string; x: number; y: number; width: number; height: number };

export interface SmartboardToolData {
  objects: SmartboardObject[];
  viewport: { x: number; y: number; zoom: number };
}


export type ToolType = 
    | 'chat' 
    | 'quiz' 
    | 'mind_map' 
    | 'code_mode'
    | 'presentation'
    | 'kanban'
    | 'calendar'
    | 'image_editor'
    | 'games'
    // Fix: Add 'video_generator' to the list of available tools.
    | 'video_generator'
    // Fix: Add missing tool types
    | 'whiteboard'
    | 'flashcards'
    | 'audio_transcription'
    | 'docs'
    | 'smartboard';

export interface ProjectTools {
    chat?: {
        sessions: { [sessionId: string]: ChatSession };
        activeSessionId: string | null;
    };
    quiz?: QuizToolData;
    mind_map?: MindMapToolData;
    code_mode?: CodeModeToolData;
    presentation?: PresentationToolData;
    kanban?: KanbanToolData;
    calendar?: CalendarToolData;
    image_editor?: ImageEditorToolData;
    games?: any;
    // Fix: Add video_generator to the project tools.
    video_generator?: VideoGeneratorToolData;
    // Fix: Add missing tool data properties
    whiteboard?: WhiteboardToolData;
    flashcards?: FlashcardToolData;
    audio_transcription?: AudioTranscriptionToolData;
    docs?: DocsToolData;
    smartboard?: SmartboardToolData;
}

export interface Project {
  id: string;
  name: string;
  tools: ProjectTools;
  lastAccessed: string; // ISO date string
}