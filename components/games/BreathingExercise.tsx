import React, { useState, useEffect } from 'react';

export const BreathingExercise: React.FC = () => {
    const [text, setText] = useState('Get Ready...');
    const [animationClass, setAnimationClass] = useState('');

    useEffect(() => {
        const cycle = () => {
            setText('Breathe In');
            setAnimationClass('breathe-in');
            setTimeout(() => {
                setText('Hold');
                setAnimationClass('hold');
                setTimeout(() => {
                    setText('Breathe Out');
                    setAnimationClass('breathe-out');
                }, 2000); // Hold for 2 seconds
            }, 4000); // Breathe in for 4 seconds
        };

        const timer = setTimeout(cycle, 1000); // Initial delay
        const interval = setInterval(cycle, 10000); // Full cycle: 4s in + 2s hold + 4s out = 10s

        return () => {
            clearTimeout(timer);
            clearInterval(interval);
        };
    }, []);

    return (
        <div className="flex flex-col items-center justify-center h-full bg-background-dark p-4 rounded-lg text-white">
            <style>
                {`
                @keyframes breathe-in-animation {
                    0% { transform: scale(0.5); }
                    100% { transform: scale(1); }
                }
                .breathe-in {
                    animation: breathe-in-animation 4s ease-in-out forwards;
                }
                @keyframes breathe-out-animation {
                    0% { transform: scale(1); }
                    100% { transform: scale(0.5); }
                }
                .breathe-out {
                    animation: breathe-out-animation 4s ease-in-out forwards;
                }
                .hold {
                    transform: scale(1);
                }
                `}
            </style>
            <div className="relative w-64 h-64 flex items-center justify-center">
                <div className="absolute w-full h-full bg-blue-500/20 rounded-full animate-pulse" />
                <div className={`w-32 h-32 bg-brand-primary rounded-full transition-transform duration-[4000ms] ease-in-out ${animationClass}`} />
                <span className="absolute text-2xl font-semibold">{text}</span>
            </div>
        </div>
    );
};