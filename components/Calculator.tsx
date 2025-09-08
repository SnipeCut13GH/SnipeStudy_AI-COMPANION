import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';

interface CalculatorProps {
  onClose: () => void;
}

export const Calculator: React.FC<CalculatorProps> = ({ onClose }) => {
  const [display, setDisplay] = useState('0');
  const [firstOperand, setFirstOperand] = useState<number | null>(null);
  const [operator, setOperator] = useState<string | null>(null);
  const [waitingForSecondOperand, setWaitingForSecondOperand] = useState(false);
  
  const [position, setPosition] = useState({ x: window.innerWidth - 350, y: 120 });
  const isDragging = useRef(false);
  const dragStart = useRef({ x: 0, y: 0, initialX: 0, initialY: 0 });
  const nodeRef = useRef<HTMLDivElement>(null);

  const handleDragStart = (e: React.MouseEvent | React.TouchEvent) => {
    if ((e.target as HTMLElement).closest('button')) return;
    isDragging.current = true;
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    dragStart.current = {
        x: clientX,
        y: clientY,
        initialX: position.x,
        initialY: position.y,
    };
  };

  useEffect(() => {
    const handleDragMove = (e: MouseEvent | TouchEvent) => {
      if (!isDragging.current) return;
      const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
      const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
      const dx = clientX - dragStart.current.x;
      const dy = clientY - dragStart.current.y;
      setPosition({
        x: dragStart.current.initialX + dx,
        y: dragStart.current.initialY + dy,
      });
    };
    const handleDragEnd = () => {
      isDragging.current = false;
    };
    document.addEventListener('mousemove', handleDragMove);
    document.addEventListener('mouseup', handleDragEnd);
    document.addEventListener('touchmove', handleDragMove);
    document.addEventListener('touchend', handleDragEnd);
    return () => {
      document.removeEventListener('mousemove', handleDragMove);
      document.removeEventListener('mouseup', handleDragEnd);
      document.removeEventListener('touchmove', handleDragMove);
      document.removeEventListener('touchend', handleDragEnd);
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

  const buttonClasses = "bg-overlay text-text-primary rounded-lg hover:bg-border-color focus:outline-none focus:ring-2 focus:ring-brand-primary";
  const operatorClasses = "bg-brand-primary/50 text-brand-primary rounded-lg hover:bg-brand-primary/80";

  return createPortal(
    <div 
        ref={nodeRef}
        style={{ top: `${position.y}px`, left: `${position.x}px`}}
        className="fixed w-72 bg-background-light rounded-lg shadow-2xl border border-border-color z-40 text-white"
    >
        <div 
            className="p-2 bg-background-dark rounded-t-lg flex justify-between items-center cursor-move touch-none"
            onMouseDown={handleDragStart}
            onTouchStart={handleDragStart}
        >
            <h3 className="text-sm font-bold">Calculator</h3>
            <button onClick={onClose} className="text-text-secondary hover:text-white cursor-pointer">&times;</button>
        </div>
        <div className="p-4 space-y-4">
            <div className="bg-background-darkest text-right p-4 rounded-lg text-4xl font-mono truncate">{display}</div>
            <div className="grid grid-cols-4 gap-2">
                <button onClick={handleClear} className={`${buttonClasses} col-span-2 bg-danger/50 text-danger hover:bg-danger/80`}>AC</button>
                <button onClick={() => setDisplay(String(parseFloat(display) * -1))} className={buttonClasses}>+/-</button>
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
    </div>,
    document.body
  );
};