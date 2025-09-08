export enum MessageRole {
  USER = 'user',
  MODEL = 'model',
}

export interface Message {
  id: string;
  role: MessageRole;
  text: string;
  images?: string[];
  isError?: boolean;
  sources?: { uri: string; title: string }[];
  codeBlock?: { language: string; code: string; result?: string };
  flashcardDeckId?: string;
}

export interface Question {
    id: string;
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

export interface StorySlide {
    title: string;
    content: string;
}

export interface StoryToolData {
    prompt: string;
    story: string | null;
    slideshow?: StorySlide[];
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

export interface WhiteboardDrawing {
    id: string;
    path: [number, number][];
    color: string;
    strokeWidth: number;
}

export interface WhiteboardToolData {
    drawings: WhiteboardDrawing[];
}

export interface CodeModeToolData {
    prompt: string;
    generatedHtml: string | null;
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
    audioFile?: { name: string; url: string };
    transcript?: TranscriptSegment[];
}

export interface DocsToolData {
    inputText: string;
    analysisResult: string | null;
    analysisType: 'summary' | 'keyPoints' | 'simple' | null;
}

export interface PresentationSlide {
    id:string;
    title: string;
    content: string;
    layout: 'title' | 'content';
    notes: string;
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

export type SmartboardObject = 
    | { id: string; type: 'drawing'; path: [number, number][]; color: string; strokeWidth: number; x: number; y: number; }
    | { id: string; type: 'text'; text: string; x: number; y: number; width: number; height: number; fontSize: number }
    | { id: string; type: 'image'; dataUrl: string; x: number; y: number; width: number; height: number };

export interface SmartboardToolData {
    objects: SmartboardObject[];
    viewport: { x: number; y: number; zoom: number };
}

export interface VideoGeneratorToolData {
    prompt: string;
    videoUrl: string | null;
    operation: any | null; // Can be more specific if operation type is known
    status: 'idle' | 'generating' | 'complete' | 'error';
    errorMessage?: string;
}

// Fix: Add 'whiteboard' and 'docs' to the ToolType to fix type errors.
export type ToolType = 
    | 'chat' 
    | 'quiz' 
    | 'story' 
    | 'mind_map' 
    | 'code_mode'
    | 'flashcards'
    | 'audio_transcription'
    | 'presentation'
    | 'kanban'
    | 'calendar'
    | 'image_editor'
    | 'smartboard'
    | 'video_generator'
    | 'whiteboard'
    | 'docs';

export interface ProjectTools {
    chat?: any; // Define if chat has specific data
    quiz?: QuizToolData;
    story?: StoryToolData;
    mind_map?: MindMapToolData;
    whiteboard?: WhiteboardToolData;
    code_mode?: CodeModeToolData;
    flashcards?: FlashcardToolData;
    audio_transcription?: AudioTranscriptionToolData;
    docs?: DocsToolData;
    presentation?: PresentationToolData;
    kanban?: KanbanToolData;
    calendar?: CalendarToolData;
    image_editor?: ImageEditorToolData;
    smartboard?: SmartboardToolData;
    video_generator?: VideoGeneratorToolData;
}

export interface Project {
  id: string;
  name: string;
  tools: ProjectTools;
  lastAccessed: string; // ISO date string
}