import React, { useState, useRef } from 'react';
import { createPortal } from 'react-dom';

interface TooltipProps {
  content: string;
  children: React.ReactElement;
  position?: 'top' | 'bottom' | 'left' | 'right';
  disabled?: boolean;
}

const getCoords = (rect: DOMRect, position: TooltipProps['position']) => {
    switch (position) {
        case 'right':
            return { x: rect.right + 8, y: rect.top + rect.height / 2, transform: 'translate(0, -50%)' };
        case 'left':
            return { x: rect.left - 8, y: rect.top + rect.height / 2, transform: 'translate(-100%, -50%)' };
        case 'bottom':
            return { x: rect.left + rect.width / 2, y: rect.bottom + 8, transform: 'translate(-50%, 0)' };
        case 'top':
        default:
            return { x: rect.left + rect.width / 2, y: rect.top - 8, transform: 'translate(-50%, -100%)' };
    }
}

export const Tooltip: React.FC<TooltipProps> = ({ content, children, position = 'top', disabled = false }) => {
  const [visible, setVisible] = useState(false);
  const [coords, setCoords] = useState({ x: 0, y: 0, transform: '' });
  const wrapperRef = useRef<HTMLSpanElement>(null);

  const showTooltip = () => {
    if (disabled || !wrapperRef.current) return;
    const rect = wrapperRef.current.getBoundingClientRect();
    setCoords(getCoords(rect, position));
    setVisible(true);
  };

  const hideTooltip = () => {
    setVisible(false);
  };

  return (
    <span
      ref={wrapperRef}
      onMouseEnter={showTooltip}
      onMouseLeave={hideTooltip}
      className="inline-flex items-center w-full"
    >
      {children}
      {visible && createPortal(
        <div 
          className="absolute bg-background-darkest text-white text-xs px-2 py-1 rounded-md shadow-lg z-50 pointer-events-none"
          style={{ top: coords.y, left: coords.x, transform: coords.transform }}
        >
          {content}
        </div>,
        document.getElementById('tooltip-root')!
      )}
    </span>
  );
};