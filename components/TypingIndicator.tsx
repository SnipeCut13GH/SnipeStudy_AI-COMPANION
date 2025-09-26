import React from 'react';

export const TypingIndicator: React.FC = () => {
    return (
        <div className="flex items-start gap-3 my-4">
            <div className="w-7 h-7 rounded-full bg-chat-model flex-shrink-0 flex items-center justify-center">
                 <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-text-primary" viewBox="0 0 20 20" fill="currentColor"><path d="M10.394 2.08a1 1 0 00-.788 0l-7 3.5a1 1 0 00.02 1.84l7 3.5a1 1 0 00.748 0l7-3.5a1 1 0 00.02-1.84l-7-3.5zM3 9.362l7 3.5v5.276l-7-3.5V9.362zM17 9.362v5.276l-7 3.5V12.862l7-3.5z" /></svg>
            </div>
            <div className="rounded-xl px-4 py-3 max-w-2xl bg-chat-model text-text-primary">
                <div className="flex items-center space-x-1.5">
                    <div className="w-2 h-2 bg-text-secondary rounded-full animate-typing-dot" style={{ animationDelay: '0s' }}></div>
                    <div className="w-2 h-2 bg-text-secondary rounded-full animate-typing-dot" style={{ animationDelay: '0.2s' }}></div>
                    <div className="w-2 h-2 bg-text-secondary rounded-full animate-typing-dot" style={{ animationDelay: '0.4s' }}></div>
                </div>
                <style>{`
                    @keyframes typing-dot-animation {
                        0%, 100% { transform: translateY(0); }
                        50% { transform: translateY(-4px); }
                    }
                    .animate-typing-dot {
                        animation: typing-dot-animation 1.4s ease-in-out infinite;
                    }
                `}</style>
            </div>
        </div>
    );
};