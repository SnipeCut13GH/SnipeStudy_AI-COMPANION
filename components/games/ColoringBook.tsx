import React, { useState } from 'react';
import { Button } from '../common/Button';

const colors = ['#EF4444', '#F97316', '#EAB308', '#22C55E', '#3B82F6', '#8B5CF6', '#EC4899', '#78716C', '#FFFFFF', '#18181b'];

const MandalaSVG: React.FC<{ onFill: (e: React.MouseEvent<SVGElement>) => void; fills: Record<string, string> }> = ({ onFill, fills }) => (
    <svg viewBox="0 0 100 100" className="w-full h-full">
        <g id="mandala" onClick={onFill}>
            <path id="p1" d="M50,50 L35,35 A21.21,21.21 0 0,1 65,35 z" fill={fills['p1'] || 'transparent'} stroke="#999" />
            <path id="p2" d="M50,50 L65,35 A21.21,21.21 0 0,1 65,65 z" fill={fills['p2'] || 'transparent'} stroke="#999" />
            <path id="p3" d="M50,50 L65,65 A21.21,21.21 0 0,1 35,65 z" fill={fills['p3'] || 'transparent'} stroke="#999" />
            <path id="p4" d="M50,50 L35,65 A21.21,21.21 0 0,1 35,35 z" fill={fills['p4'] || 'transparent'} stroke="#999" />
            
            <circle id="c1" cx="50" cy="50" r="15" fill={fills['c1'] || 'transparent'} stroke="#999" />
            
            {[0, 90, 180, 270].map(r => (
                 <path key={r} id={`petal-${r}`} transform={`rotate(${r} 50 50)`} d="M50,35 C40,20 60,20 50,35" fill={fills[`petal-${r}`] || 'transparent'} stroke="#999"/>
            ))}
             {[45, 135, 225, 315].map(r => (
                 <path key={r} id={`petal2-${r}`} transform={`rotate(${r} 50 50)`} d="M50,35 L45,45 L50,50 L55,45 z" fill={fills[`petal2-${r}`] || 'transparent'} stroke="#999"/>
            ))}
        </g>
    </svg>
);


export const ColoringBook: React.FC = () => {
    const [selectedColor, setSelectedColor] = useState(colors[0]);
    const [fills, setFills] = useState<Record<string, string>>({});

    const handleFill = (e: React.MouseEvent<SVGElement>) => {
        const target = e.target as SVGElement;
        const id = target.id;
        if (id) {
            setFills({ ...fills, [id]: selectedColor });
        }
    };

    const resetColoring = () => {
        setFills({});
    };

    return (
        <div className="flex flex-col md:flex-row items-center justify-center h-full bg-background-dark p-4 rounded-lg gap-8">
            <div className="w-full md:w-auto md:h-full max-w-sm md:max-w-none md:max-h-[80vh] aspect-square">
                 <MandalaSVG onFill={handleFill} fills={fills} />
            </div>
            <div className="flex flex-col items-center gap-4">
                <div className="grid grid-cols-5 gap-2">
                    {colors.map(color => (
                        <button
                            key={color}
                            onClick={() => setSelectedColor(color)}
                            className={`w-10 h-10 rounded-full transition-transform transform hover:scale-110 ${selectedColor === color ? 'ring-2 ring-offset-2 ring-offset-background-dark ring-white' : ''}`}
                            style={{ backgroundColor: color }}
                        />
                    ))}
                </div>
                <Button onClick={resetColoring} variant="secondary">Reset</Button>
            </div>
        </div>
    );
};