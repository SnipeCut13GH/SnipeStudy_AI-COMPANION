import React, { useState, useMemo } from 'react';
import { Message, MessageRole } from '../types.ts';
import { TypingIndicator } from './TypingIndicator.tsx';
import { getTranslator } from '../services/translator.ts';
import { useSettings } from '../hooks/useSettings.ts'; // Assuming a hook to get settings

// --- ICONS ---
const UserIcon: React.FC = () => (
  <div className="w-7 h-7 rounded-full bg-brand-primary flex-shrink-0 flex items-center justify-center shadow-md">
    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-white" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" /></svg>
  </div>
);

const ModelIcon: React.FC = () => (
  <div className="w-7 h-7 rounded-full bg-surface flex-shrink-0 flex items-center justify-center shadow-md border border-border-color">
    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-text-primary" viewBox="0 0 20 20" fill="currentColor"><path d="M10.394 2.08a1 1 0 00-.788 0l-7 3.5a1 1 0 00.02 1.84l7 3.5a1 1 0 00.748 0l7-3.5a1 1 0 00.02-1.84l-7-3.5zM3 9.362l7 3.5v5.276l-7-3.5V9.362zM17 9.362v5.276l-7 3.5V12.862l7-3.5z" /></svg>
  </div>
);

const CopyIcon: React.FC = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>
);
const CheckIcon: React.FC = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
);


// --- COMPONENTS ---
const CodeBlock: React.FC<{ language: string; code: string; result?: string; t: (key: string) => string }> = ({ language, code, result, t }) => {
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
                <button onClick={handleCopy} className="text-text-secondary hover:text-text-primary flex items-center text-xs gap-1">
                    {copied ? <CheckIcon /> : <CopyIcon />}
                    {copied ? t('chatMessage.copied') : t('chatMessage.copy')}
                </button>
            </div>
            <pre className="p-4 text-sm overflow-x-auto text-text-primary font-mono"><code>{code}</code></pre>
            {result && (
              <div className="border-t border-border-color p-4 bg-background-dark">
                <p className="text-xs text-text-secondary mb-2 font-semibold">{t('chatMessage.result')}</p>
                <pre className="text-sm text-text-primary font-mono whitespace-pre-wrap">{result}</pre>
              </div>
            )}
        </div>
    );
};

const ParsedMessageContent: React.FC<{ text: string; t: (key: string) => string }> = ({ text, t }) => {
    const parts = useMemo(() => (text || '').split(/(```[\w\s-]*\n[\s\S]+?\n```)/g), [text]);
    return (
        <div className="whitespace-pre-wrap leading-relaxed text-inherit">
            {parts.map((part, index) => {
                const codeBlockMatch = part.match(/^```(\w*)\n([\s\S]*?)\n```$/);
                if (codeBlockMatch) {
                    const [, language, code] = codeBlockMatch;
                    return <CodeBlock key={index} language={language} code={code.trim()} t={t} />;
                }
                return <span key={index}>{part}</span>;
            })}
        </div>
    );
};

const ErrorMessage: React.FC<{ text: string; t: (key: string) => string }> = ({ text, t }) => (
  <div className="bg-danger/20 border border-danger/50 p-3 rounded-lg my-2 text-red-200">
    <p className="font-bold text-sm">{t('chatMessage.errorTitle')}</p>
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

const PrimarySourceButton: React.FC<{ source: { uri: string; title: string } }> = ({ source }) => (
    <a
        href={source.uri}
        target="_blank"
        rel="noopener noreferrer"
        title={source.title}
        className="inline-flex items-center gap-2 bg-blue-500/20 text-blue-300 hover:bg-blue-500/40 px-3 py-1.5 rounded-lg text-sm font-semibold transition-colors mb-3 max-w-full"
    >
        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 flex-shrink-0" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M12.586 4.586a2 2 0 112.828 2.828l-3 3a2 2 0 01-2.828 0 1 1 0 00-1.414 1.414 4 4 0 005.656 0l3-3a4 4 0 00-5.656-5.656l-1.5 1.5a1 1 0 101.414 1.414l1.5-1.5zm-5 5a2 2 0 012.828 0 1 1 0 101.414-1.414 4 4 0 00-5.656 0l-3 3a4 4 0 105.656 5.656l1.5-1.5a1 1 0 10-1.414-1.414l-1.5 1.5a2 2 0 11-2.828-2.828l3-3z" clipRule="evenodd" /></svg>
        <span className="truncate">{source.title || "View Top Source"}</span>
    </a>
);


// --- MAIN RENDERERS ---
export const MessageRenderer: React.FC<{ message: Message; t: (key: string) => string }> = ({ message, t }) => {
  const isUser = message.role === MessageRole.USER;

  const renderContent = () => {
    if (message.isError) {
      return <ErrorMessage text={message.text} t={t} />;
    }
    if (message.codeBlock) { // Keep this for structured code block messages
      return <CodeBlock {...message.codeBlock} t={t} />;
    }
    return <ParsedMessageContent text={message.text} t={t} />;
  }

  return (
    <div className={`flex items-start gap-3 my-4 ${isUser ? 'justify-end' : 'justify-start'}`}>
      {!isUser && <ModelIcon />}
      <div className={`rounded-xl px-4 py-3 max-w-2xl shadow-sm ${isUser ? 'bg-chat-user text-white' : 'bg-chat-model text-text-primary'}`}>
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
                    {message.primarySource && <PrimarySourceButton source={message.primarySource} />}
                    <h4 className="text-xs font-semibold text-text-secondary mb-2">{t('chatMessage.sources')}</h4>
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

export const MessageList: React.FC<{ messages: Message[], isLoading: boolean, bottomRef: React.RefObject<HTMLDivElement>, t: (key: string) => string }> = ({ messages, isLoading, bottomRef, t }) => {
    return (
        <div className="flex-1 overflow-y-auto p-4">
            {messages.map((msg) => <MessageRenderer key={msg.id} message={msg} t={t} />)}
            {isLoading && <TypingIndicator />}
            <div ref={bottomRef} />
        </div>
    );
};