export enum MessageRole {
  USER = 'user',
  MODEL = 'model',
}

export enum AppMode {
  CHAT = 'chat',
  STUDY_GUIDE = 'study_guide',
  QUIZ = 'quiz',
  LIVE = 'live',
}

export enum MessageType {
  CHAT = 'chat',
  STUDY_GUIDE_RESULT = 'study_guide_result',
  QUIZ_RESULT = 'quiz_result',
  ERROR = 'error'
}

export interface QuizQuestion {
  question: string;
  options: string[];
  correctAnswerIndex: number;
  explanation: string;
}

export interface Quiz {
  topic: string;
  questions: QuizQuestion[];
}

export interface Message {
  role: MessageRole;
  type: MessageType;
  text: string;
  image?: string;
  quizData?: Quiz;
  quizScore?: { score: number; total: number };
}