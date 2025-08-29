
import React from 'react';

export const TypingIndicator: React.FC = () => {
    return (
        <div className="flex items-start gap-3 my-4 justify-start">
            <div className="w-8 h-8 rounded-full bg-chat-model flex-shrink-0 flex items-center justify-center">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-brand-light" viewBox="0 0 20 20" fill="currentColor">
                    <path d="M10.394 2.08a1 1 0 00-.788 0l-7 3.5a1 1 0 00.02 1.84l7 3.5a1 1 0 00.748 0l7-3.5a1 1 0 00.02-1.84l-7-3.5zM3 9.362l7 3.5v5.276l-7-3.5V9.362zM17 9.362v5.276l-7 3.5V12.862l7-3.5z" />
                </svg>
            </div>
            <div className="rounded-2xl px-4 py-3 bg-chat-model text-gray-200 flex items-center space-x-1.5">
                <span className="h-2 w-2 bg-gray-400 rounded-full animate-bounce [animation-delay:-0.3s]"></span>
                <span className="h-2 w-2 bg-gray-400 rounded-full animate-bounce [animation-delay:-0.15s]"></span>
                <span className="h-2 w-2 bg-gray-400 rounded-full animate-bounce"></span>
            </div>
        </div>
    );
};
