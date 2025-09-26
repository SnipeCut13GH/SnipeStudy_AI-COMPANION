import React, { useState } from 'react';
import { Button } from '../common/Button.tsx';

interface Rock {
    id: number;
    x: number;
    y: number;
    size: number;
    rotation: number;
}

export const ZenGarden: React.FC = () => {
    const [rocks, setRocks] = useState<Rock[]>([]);
    const [rakePattern, setRakePattern] = useState<string | null>(null);

    const addRock = () => {
        const newRock: Rock = {
            id: Date.now(),
            x: Math.random() * 80 + 10, // in %
            y: Math.random() * 80 + 10, // in %
            size: Math.random() * 40 + 30, // in px
            rotation: Math.random() * 360,
        };
        setRocks([...rocks, newRock]);
    };

    const clearGarden = () => {
        setRocks([]);
        setRakePattern(null);
    };

    const createRakePattern = () => {
        const lines = Array.from({ length: 20 }, (_, i) => {
            const y = (i + 1) * 5;
            const wave = Math.sin(i / 2) * 10;
            return `M 0 ${y} C 25 ${y + wave}, 75 ${y - wave}, 100 ${y}`;
        }).join(' ');

        setRakePattern(
            `<svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
                <defs>
                    <pattern id="sand" patternUnits="userSpaceOnUse" width="10" height="10">
                        <circle cx="1" cy="1" r="0.5" fill="#e0ddd1" />
                    </pattern>
                    <filter id="rake-texture">
                        <feTurbulence type="fractalNoise" baseFrequency="0.1" numOctaves="2" result="turbulence" />
                        <feDisplacementMap in2="turbulence" in="SourceGraphic" scale="2" xChannelSelector="R" yChannelSelector="G" />
                    </filter>
                </defs>
                <rect width="100%" height="100%" fill="url(#sand)" />
                <path d="${lines}" fill="none" stroke="#d1cfc4" strokeWidth="2" filter="url(#rake-texture)" />
            </svg>`
        );
    };

    return (
        <div className="flex flex-col items-center justify-center h-full bg-background-dark p-4 rounded-lg">
            <div className="relative w-full h-full max-w-2xl aspect-video bg-[#f0ede4] rounded-lg shadow-inner overflow-hidden border-4 border-amber-800/50">
                {rakePattern && (
                    <div className="absolute inset-0" dangerouslySetInnerHTML={{ __html: rakePattern }} />
                )}
                {!rakePattern && (
                     <div className="absolute inset-0 bg-repeat" style={{ backgroundImage: 'radial-gradient(#e0ddd1 1px, transparent 1px)', backgroundSize: '5px 5px' }} />
                )}
                {rocks.map(rock => (
                    <div
                        key={rock.id}
                        className="absolute bg-gray-500 rounded-full shadow-md"
                        style={{
                            left: `${rock.x}%`,
                            top: `${rock.y}%`,
                            width: `${rock.size}px`,
                            height: `${rock.size * (Math.random() * 0.4 + 0.8)}px`, // slightly oval
                            transform: `translate(-50%, -50%) rotate(${rock.rotation}deg)`,
                            backgroundImage: 'linear-gradient(45deg, #888, #666)',
                        }}
                    />
                ))}
            </div>
            <div className="mt-4 flex gap-4">
                <Button onClick={addRock} variant="secondary">Add Rock</Button>
                <Button onClick={createRakePattern} variant="secondary">Rake Sand</Button>
                <Button onClick={clearGarden} variant="secondary">Clear</Button>
            </div>
        </div>
    );
};