import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';

interface CalculatorProps {
  onClose: () => void;
  onMinimize: () => void;
}

const MinimizeIcon: React.FC = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" /></svg>
);


export const Calculator: React.FC<CalculatorProps> = ({ onClose, onMinimize }) => {
  const [display, setDisplay] = useState('0');
  const [firstOperand, setFirstOperand] = useState<number | null>(null);
  const [operator, setOperator] = useState<string | null>(null);
  const [waitingForSecondOperand, setWaitingForSecondOperand] = useState(false);
  
  const [position, setPosition] = useState({ x: window.innerWidth - 350, y: 120 });
  const [size, setSize] = useState<{ width: number; height: number | 'auto' }>({ width: 288, height: 'auto' });
  
  const isDragging = useRef(false);
  const isResizing = useRef(false);
  const interactionStart = useRef({ x: 0, y: 0, initialX: 0, initialY: 0, initialW: 0, initialH: 0 });
  const nodeRef = useRef<HTMLDivElement>(null);

  const getClientCoords = (e: MouseEvent | TouchEvent | React.MouseEvent | React.TouchEvent) => ({
      x: 'touches' in e ? e.touches[0].clientX : e.clientX,
      y: 'touches' in e ? e.touches[0].clientY : e.clientY,
  });

  const handleDragStart = (e: React.MouseEvent | React.TouchEvent) => {
    if ((e.target as HTMLElement).closest('button') || (e.target as HTMLElement).closest('.resize-handle')) return;
    isDragging.current = true;
    const { x, y } = getClientCoords(e);
    interactionStart.current = { ...interactionStart.current, x, y, initialX: position.x, initialY: position.y };
  };
  
  const handleResizeStart = (e: React.MouseEvent | React.TouchEvent) => {
    e.stopPropagation();
    isResizing.current = true;
    const { x, y } = getClientCoords(e);
    interactionStart.current = { ...interactionStart.current, x, y, initialW: size.width, initialH: nodeRef.current?.offsetHeight || 0 };
  };

  useEffect(() => {
    const handleInteractionMove = (e: MouseEvent | TouchEvent) => {
        if (!isDragging.current && !isResizing.current) return;
        // Fix: Prevent default browser actions (like text selection) during drag/resize for a smoother experience.
        e.preventDefault();
        const { x, y } = getClientCoords(e);
        const dx = x - interactionStart.current.x;
        const dy = y - interactionStart.current.y;

        if (isDragging.current) {
            setPosition({
                x: interactionStart.current.initialX + dx,
                y: interactionStart.current.initialY + dy,
            });
        } else if (isResizing.current) {
            const newWidth = Math.max(260, interactionStart.current.initialW + dx);
            const newHeight = Math.max(400, interactionStart.current.initialH + dy);
            setSize({ width: newWidth, height: newHeight });
        }
    };
    const handleInteractionEnd = () => {
        isDragging.current = false;
        isResizing.current = false;
    };
    
    document.addEventListener('mousemove', handleInteractionMove);
    document.addEventListener('mouseup', handleInteractionEnd);
    document.addEventListener('touchmove', handleInteractionMove, { passive: false });
    document.addEventListener('touchend', handleInteractionEnd);
    return () => {
        document.removeEventListener('mousemove', handleInteractionMove);
        document.removeEventListener('mouseup', handleInteractionEnd);
        document.removeEventListener('touchmove', handleInteractionMove);
        document.removeEventListener('touchend', handleInteractionEnd);
    };
  }, []);
  
  const handleNumberClick = (num: string) => {
    if (waitingForSecondOperand) {
        setDisplay(num);
        setWaitingForSecondOperand(false);
    } else {
        setDisplay(display === '0' ? num : display + num);
    }
  };

  const handleOperatorClick = (nextOperator: string) => {
    const inputValue = parseFloat(display);

    if (operator && !waitingForSecondOperand) {
        const result = calculate(firstOperand!, inputValue, operator);
        setDisplay(String(result));
        setFirstOperand(result);
    } else {
        setFirstOperand(inputValue);
    }

    setWaitingForSecondOperand(true);
    setOperator(nextOperator);
  };

  const calculate = (first: number, second: number, op: string) => {
    switch (op) {
        case '+': return first + second;
        case '-': return first - second;
        case '*': return first * second;
        case '/': return first / second;
        case '=': return second;
        default: return second;
    }
  };

  const handleEquals = () => {
    const inputValue = parseFloat(display);
    if (operator && firstOperand !== null) {
      const result = calculate(firstOperand, inputValue, operator);
      setDisplay(String(result));
      setFirstOperand(result);
      setOperator(null);
      setWaitingForSecondOperand(true);
    }
  };
  
  const handleClear = () => {
      // Fix: Also reset any lingering drag/resize states to ensure button clicks are always processed.
      isDragging.current = false;
      isResizing.current = false;
      setDisplay('0');
      setFirstOperand(null);
      setOperator(null);
      setWaitingForSecondOperand(false);
  };

  const handleDecimal = () => {
    if (!display.includes('.')) {
        setDisplay(display + '.');
    }
  };

  const handleSquareRoot = () => {
    if (display === 'Error') return;
    const currentValue = parseFloat(display);
    if (currentValue >= 0) {
        setDisplay(String(Math.sqrt(currentValue)));
    } else {
        setDisplay('Error');
    }
  };

  const buttonClasses = "bg-overlay text-text-primary rounded-lg hover:bg-border-color focus:outline-none focus:ring-2 focus:ring-brand-primary h-full";
  const operatorClasses = "bg-brand-primary/50 text-brand-primary rounded-lg hover:bg-brand-primary/80 h-full";

  return createPortal(
    <div 
        ref={nodeRef}
        style={{ top: `${position.y}px`, left: `${position.x}px`, width: `${size.width}px`, height: typeof size.height === 'number' ? `${size.height}px` : size.height }}
        className="fixed bg-background-light rounded-lg shadow-2xl border border-border-color z-40 text-white flex flex-col"
    >
        <div 
            className="p-2 bg-background-dark rounded-t-lg flex justify-between items-center cursor-move touch-none flex-shrink-0"
            onMouseDown={handleDragStart}
            onTouchStart={handleDragStart}
        >
            <h3 className="text-sm font-bold">Calculator</h3>
            <div className="flex items-center">
                <button onClick={onMinimize} className="p-1 text-text-secondary hover:text-white" aria-label="Minimize"><MinimizeIcon /></button>
                <button onClick={onClose} className="p-1 text-text-secondary hover:text-white text-lg" aria-label="Close">&times;</button>
            </div>
        </div>
        <div className="p-4 space-y-4 flex flex-col flex-grow">
            <div className="bg-background-darkest text-right p-4 rounded-lg text-4xl font-mono truncate">{display}</div>
            <div className="grid grid-cols-4 gap-2 flex-grow">
                <button onClick={handleClear} className={`${buttonClasses} bg-danger/50 text-danger hover:bg-danger/80`}>AC</button>
                <button onClick={() => setDisplay(String(parseFloat(display) * -1))} className={buttonClasses}>+/-</button>
                <button onClick={handleSquareRoot} className={buttonClasses}>√</button>
                <button onClick={() => handleOperatorClick('/')} className={operatorClasses}>÷</button>

                <button onClick={() => handleNumberClick('7')} className={buttonClasses}>7</button>
                <button onClick={() => handleNumberClick('8')} className={buttonClasses}>8</button>
                <button onClick={() => handleNumberClick('9')} className={buttonClasses}>9</button>
                <button onClick={() => handleOperatorClick('*')} className={operatorClasses}>×</button>

                <button onClick={() => handleNumberClick('4')} className={buttonClasses}>4</button>
                <button onClick={() => handleNumberClick('5')} className={buttonClasses}>5</button>
                <button onClick={() => handleNumberClick('6')} className={buttonClasses}>6</button>
                <button onClick={() => handleOperatorClick('-')} className={operatorClasses}>-</button>

                <button onClick={() => handleNumberClick('1')} className={buttonClasses}>1</button>
                <button onClick={() => handleNumberClick('2')} className={buttonClasses}>2</button>
                <button onClick={() => handleNumberClick('3')} className={buttonClasses}>3</button>
                <button onClick={() => handleOperatorClick('+')} className={operatorClasses}>+</button>
                
                <button onClick={() => handleNumberClick('0')} className={`${buttonClasses} col-span-2`}>0</button>
                <button onClick={handleDecimal} className={buttonClasses}>.</button>
                <button onClick={handleEquals} className={operatorClasses}>=</button>
            </div>
        </div>
        <div 
            className="resize-handle absolute bottom-0 right-0 w-4 h-4 cursor-se-resize" 
            onMouseDown={handleResizeStart}
            onTouchStart={handleResizeStart}
        />
        <style>{`.resize-handle::after { content: ''; position: absolute; right: 2px; bottom: 2px; width: 8px; height: 8px; border-right: 2px solid var(--text-secondary); border-bottom: 2px solid var(--text-secondary); opacity: 0.5; }`}</style>
    </div>,
    document.body
  );
};