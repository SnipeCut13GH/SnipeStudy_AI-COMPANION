import React from 'react';
import { createPortal } from 'react-dom';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  size?: 'md' | 'lg' | 'xl';
}

export const Modal: React.FC<ModalProps> = ({ isOpen, onClose, title, children, size = 'lg' }) => {
  if (!isOpen) return null;

  const sizeClasses = {
    md: 'sm:max-w-md',
    lg: 'sm:max-w-2xl',
    xl: 'sm:max-w-4xl',
  };

  return createPortal(
    <div 
      className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center sm:p-4 backdrop-blur-sm" 
      onClick={onClose}
      role="dialog"
      aria-modal="true"
    >
      <div
        className={`bg-background-light shadow-2xl w-full border-border-color flex flex-col animate-fade-in h-full sm:h-auto max-h-full sm:max-h-[90vh] sm:rounded-xl ${sizeClasses[size]}`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between items-center p-4 border-b border-border-color flex-shrink-0">
          <h2 className="text-lg font-bold text-text-primary">{title}</h2>
          <button onClick={onClose} className="text-text-secondary hover:text-text-primary text-2xl">&times;</button>
        </div>
        <div className="p-6 overflow-y-auto">
          {children}
        </div>
      </div>
       <style>{`
          @keyframes fade-in {
            from { opacity: 0; transform: scale(0.95); }
            to { opacity: 1; transform: scale(1); }
          }
          .animate-fade-in { animation: fade-in 0.2s ease-out forwards; }
        `}</style>
    </div>,
    document.getElementById('modal-root')!
  );
};