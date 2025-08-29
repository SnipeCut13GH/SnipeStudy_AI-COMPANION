import React from 'react';
import { Message, MessageRole, MessageType } from '../types';

interface MessageRendererProps {
  message: Message;
}

const UserIcon: React.FC = () => (
  <div className="w-8 h-8 rounded-full bg-brand-secondary flex-shrink-0 flex items-center justify-center">
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-white" viewBox="0 0 20 20" fill="currentColor">
      <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
    </svg>
  </div>
);

const ModelIcon: React.FC = () => (
  <div className="w-8 h-8 rounded-full bg-chat-model flex-shrink-0 flex items-center justify-center">
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-brand-light" viewBox="0 0 20 20" fill="currentColor">
      <path d="M10.394 2.08a1 1 0 00-.788 0l-7 3.5a1 1 0 00.02 1.84l7 3.5a1 1 0 00.748 0l7-3.5a1 1 0 00.02-1.84l-7-3.5zM3 9.362l7 3.5v5.276l-7-3.5V9.362zM17 9.362v5.276l-7 3.5V12.862l7-3.5z" />
    </svg>
  </div>
);

const StudyGuideMessage: React.FC<{ text: string }> = ({ text }) => {
    // A simple markdown-to-HTML converter
    const formatText = (inputText: string) => {
        return inputText
            .replace(/^### (.*$)/gim, '<h3 class="text-lg font-semibold mt-4 mb-2">$1</h3>')
            .replace(/^## (.*$)/gim, '<h2 class="text-xl font-bold mt-6 mb-3 border-b border-gray-600 pb-1">$1</h2>')
            .replace(/^# (.*$)/gim, '<h1 class="text-2xl font-bold mt-8 mb-4 border-b-2 border-brand-secondary pb-2">$1</h1>')
            .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
            .replace(/\*(.*?)\*/g, '<em>$1</em>')
            .replace(/^- (.*$)/gim, '<li class="ml-4 list-disc">$1</li>')
            .replace(/\n/g, '<br />');
    };

    return (
        <div className="bg-background-light p-4 rounded-lg prose prose-invert max-w-none">
             <div dangerouslySetInnerHTML={{ __html: formatText(text) }} />
        </div>
    );
};

const QuizResultMessage: React.FC<{ score: number, total: number }> = ({ score, total }) => (
    <div className="bg-brand-primary p-4 rounded-lg text-center">
        <h2 className="text-xl font-bold text-white mb-2">Quiz Complete!</h2>
        <p className="text-lg text-brand-light">You scored</p>
        <p className="text-4xl font-bold text-white my-2">{score} / {total}</p>
        <p className="text-brand-light">{score / total >= 0.8 ? "Excellent work!" : "Keep practicing!"}</p>
    </div>
)


export const MessageRenderer: React.FC<MessageRendererProps> = ({ message }) => {
  const isUser = message.role === MessageRole.USER;
  
  const containerClasses = isUser ? 'justify-end' : 'justify-start';

  const renderContent = () => {
    switch (message.type) {
        case MessageType.STUDY_GUIDE_RESULT:
            return <StudyGuideMessage text={message.text} />;
        case MessageType.QUIZ_RESULT:
            if (message.quizScore) {
                return <QuizResultMessage score={message.quizScore.score} total={message.quizScore.total} />;
            }
            return null;
        case MessageType.ERROR:
             return <div className="bg-red-900/50 text-red-300 rounded-lg px-4 py-3">{message.text}</div>;
        case MessageType.CHAT:
        default:
            const messageClasses = isUser ? 'bg-chat-user text-white' : 'bg-chat-model text-gray-200';
            return (
                <div className={`rounded-2xl px-4 py-3 max-w-xs md:max-w-md break-words ${messageClasses}`}>
                    {message.image && (
                        <img 
                            src={message.image} 
                            alt="User upload" 
                            className="rounded-lg mb-2 max-h-48 w-full object-cover" 
                        />
                    )}
                    {message.text && <p className="whitespace-pre-wrap">{message.text}</p>}
                </div>
            );
    }
  }

  return (
    <div className={`flex items-start gap-3 my-4 ${containerClasses}`}>
      {!isUser && <ModelIcon />}
      <div className="w-full max-w-xs md:max-w-md">
        {renderContent()}
      </div>
      {isUser && <UserIcon />}
    </div>
  );
};