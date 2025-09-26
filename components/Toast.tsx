import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';

interface ToastProps {
  message: string;
  onClose: () => void;
  duration?: number;
}

export const Toast: React.FC<ToastProps> = ({ message, onClose, duration = 5000 }) => {
  useEffect(() => {
    const timer = setTimeout(() => {
      onClose();
    }, duration);

    return () => clearTimeout(timer);
  }, [onClose, duration]);

  return createPortal(
    <div className="fixed bottom-5 left-1/2 -translate-x-1/2 bg-overlay text-text-primary px-6 py-3 rounded-lg shadow-lg z-[200] animate-toast-in-out">
      <p>{message}</p>
      <style>{`
        @keyframes toast-in-out {
          0% { transform: translate(-50%, 100%); opacity: 0; }
          10% { transform: translate(-50%, 0); opacity: 1; }
          90% { transform: translate(-50%, 0); opacity: 1; }
          100% { transform: translate(-50%, 100%); opacity: 0; }
        }
        .animate-toast-in-out {
          animation: toast-in-out ${duration / 1000}s ease-in-out forwards;
        }
      `}</style>
    </div>,
    document.getElementById('modal-root')! // Re-using modal root for simplicity
  );
};