import React, { useState, useMemo } from 'react';
// Fix: Correct import path for types.
import { Message, MessageRole } from '../types.ts';
// Fix: Correct import path for SkeletonLoader component.
import { SkeletonLoader } from './common/SkeletonLoader.tsx';
// Fix: Correctly import FlashcardView instead of the non-existent FlashcardDeckView.
import { FlashcardView } from './tools/FlashcardView.tsx';

interface MessageRendererProps {
  message: Message;
}

const UserIcon: React.FC = () => (
  <div className="w-7 h-7 rounded-full bg-brand-primary flex-shrink-0 flex items-center justify-center">
    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-white" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" /></svg>
  </div>
);

const ModelIcon: React.FC = () => (
  <div className="w-7 h-7 rounded-full bg-chat-model flex-shrink-0 flex items-center justify-center">
    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-brand-light" viewBox="0 0 20 20" fill="currentColor"><path d="M10.394 2.08a1 1 0 00-.788 0l-7 3.5a1 1 0 00.02 1.84l7 3.5a1 1 0 00.748 0l7-3.5a1 1 0 00.02-1.84l-7-3.5zM3 9.362l7 3.5v5.276l-7-3.5V9.362zM17 9.362v5.276l-7 3.5V12.862l7-3.5z" /></svg>
  </div>
);

const CodeBlock: React.FC<{ language: string; code: string; result?: string; }> = ({ language, code, result }) => {
    const [copied, setCopied] = useState(false);
    const handleCopy = () => {
        navigator.clipboard.writeText(code);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };
    return (
        <div className="bg-background-darkest rounded-lg my-2 overflow-hidden border border-border-color">
            <div className="flex justify-between items-center px-4 py-1.5 bg-background-dark text-xs">
                <span className="text-text-secondary">{language || 'code'}</span>
                <button onClick={handleCopy} className="text-text-secondary hover:text-text-primary flex items-center text-xs">
                    {copied ? 'Copied!' : 'Copy'}
                </button>
            </div>
            <pre className="p-4 text-sm overflow-x-auto text-brand-light font-mono"><code>{code}</code></pre>
            {result && (
              <div className="border-t border-border-color p-4 bg-background-dark">
                <p className="text-xs text-text-secondary mb-2 font-semibold">Result:</p>
                <pre className="text-sm text-text-primary font-mono whitespace-pre-wrap">{result}</pre>
              </div>
            )}
        </div>
    );
};

const ParsedMessageContent: React.FC<{ text: string }> = ({ text }) => {
    const parts = useMemo(() => (text || '').split(/(\`\`\`[\s\S]*?\`\`\`)/g), [text]);
    return (
        <div className="whitespace-pre-wrap leading-relaxed text-text-primary">
            {parts.map((part, index) => {
                const codeBlockMatch = part.match(/\`\`\`(\w*)\n([\s\S]*)\`\`\`/);
                if (codeBlockMatch) {
                    const [, language, code] = codeBlockMatch;
                    return <CodeBlock key={index} language={language} code={code.trim()} />;
                }
                return <span key={index}>{part}</span>;
            })}
        </div>
    );
};

const ErrorMessage: React.FC<{ text: string }> = ({ text }) => (
  <div className="bg-red-900/50 border border-red-700 p-3 rounded-lg my-2 text-red-200">
    <p className="font-bold text-sm">An error occurred</p>
    <p className="text-xs mt-1">{text}</p>
  </div>
);

const DownloadImageButton: React.FC<{ imageUrl: string }> = ({ imageUrl }) => {
    const handleDownload = () => {
        const link = document.createElement('a');
        link.href = imageUrl;
        link.download = `snipe-study-image-${Date.now()}.png`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };
    return (
        <button onClick={handleDownload} aria-label="Download image" className="absolute top-2 right-2 bg-black/50 text-white p-1.5 rounded-full opacity-0 group-hover:opacity-100 transition-opacity hover:bg-black/75">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clipRule="evenodd" /></svg>
        </button>
    );
};

const SourcePill: React.FC<{ source: { uri: string; title: string } }> = ({ source }) => (
    <a href={source.uri} target="_blank" rel="noopener noreferrer"
       title={source.title}
       className="inline-block bg-background-darkest text-xs text-text-secondary px-2.5 py-1 rounded-full hover:bg-border-color hover:text-text-primary transition-colors max-w-full truncate">
        {source.title}
    </a>
);

export const MessageRenderer: React.FC<MessageRendererProps> = ({ message }) => {
  const isUser = message.role === MessageRole.USER;

  const renderContent = () => {
    if (message.isError) {
      return <ErrorMessage text={message.text} />;
    }
    if (message.codeBlock) {
      return <CodeBlock {...message.codeBlock} />;
    }
    if (message.flashcardDeckId) {
      // return <FlashcardDeckView deckId={message.flashcardDeckId} />; // Pass deckId to a component that can fetch and render it.
      return <div className="p-3 bg-background-light rounded-lg">Flashcard deck created! You can now view it in the Flashcards tool.</div>
    }
    return <ParsedMessageContent text={message.text} />;
  }

  return (
    <div className={`flex items-start gap-3 my-4 ${isUser ? 'justify-end' : 'justify-start'}`}>
      {!isUser && <ModelIcon />}
      <div className={`rounded-xl px-4 py-3 max-w-2xl ${isUser ? 'bg-chat-user text-white' : 'bg-chat-model text-text-primary'}`}>
        <div className="relative group">
            {message.images && message.images.length > 0 && (
                <div className="mb-2 flex flex-wrap gap-2">
                    {message.images.map((img, index) => (
                        <div key={index} className={`relative group ${message.images && message.images.length > 1 ? 'w-40 h-40' : ''}`}>
                            <img src={img} alt={`content ${index + 1}`} className={`rounded-lg h-auto ${message.images && message.images.length > 1 ? 'w-full h-full object-cover' : 'max-w-full'}`} />
                            {!isUser && <DownloadImageButton imageUrl={img} />}
                        </div>
                    ))}
                </div>
            )}
            {renderContent()}
            {message.sources && message.sources.length > 0 && (
                <div className="mt-3 pt-3 border-t border-border-color/50">
                    <h4 className="text-xs font-semibold text-text-secondary mb-2">Sources:</h4>
                    <div className="flex flex-wrap gap-2">
                        {message.sources.map((source, index) => <SourcePill key={index} source={source} />)}
                    </div>
                </div>
            )}
        </div>
      </div>
      {isUser && <UserIcon />}
    </div>
  );
};

export const MessageList: React.FC<{ messages: Message[], isLoading: boolean, bottomRef: React.RefObject<HTMLDivElement> }> = ({ messages, isLoading, bottomRef }) => {
    return (
        <div className="flex-1 overflow-y-auto p-4">
            {messages.map((msg) => <MessageRenderer key={msg.id} message={msg} />)}
            {isLoading && <SkeletonLoader />}
            <div ref={bottomRef} />
        </div>
    );
};