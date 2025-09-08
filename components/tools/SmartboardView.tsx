

import React, { useState, useRef, MouseEvent, TouchEvent } from 'react';
import { v4 as uuidv4 } from 'uuid';
// Fix: Correct import path for types.
import { Project, SmartboardToolData, SmartboardObject } from '../../types.ts';
import { Button } from '../common/Button';

interface SmartboardViewProps {
  project: Project;
  onUpdateProject: (updatedProject: Project) => void;
}

const getInitialData = (project: Project): SmartboardToolData => {
  return project.tools.smartboard || {
    objects: [],
    viewport: { x: 0, y: 0, zoom: 1 },
  };
};

export const SmartboardView: React.FC<SmartboardViewProps> = ({ project, onUpdateProject }) => {
    const [data, setData] = useState<SmartboardToolData>(getInitialData(project));
    const [activeTool, setActiveTool] = useState<'select' | 'draw' | 'text'>('select');
    const [isDrawing, setIsDrawing] = useState(false);
    const [currentPath, setCurrentPath] = useState<[number, number][]>([]);
    const [drawColor, setDrawColor] = useState('#FFFFFF');
    const [drawStrokeWidth, setDrawStrokeWidth] = useState(4);
    const svgRef = useRef<SVGSVGElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const updateAndPersist = (newData: SmartboardToolData) => {
        setData(newData);
        onUpdateProject({ ...project, tools: { ...project.tools, smartboard: newData } });
    };
    
    const getCoordinates = (event: MouseEvent | TouchEvent): [number, number] => {
        if (!svgRef.current) return [0, 0];
        const CTM = svgRef.current.getScreenCTM()?.inverse();
        if (!CTM) return [0,0];
        
        let clientX, clientY;
        if ('touches' in event) {
            clientX = event.touches[0].clientX;
            clientY = event.touches[0].clientY;
        } else {
            clientX = event.clientX;
            clientY = event.clientY;
        }

        const pt = new DOMPoint(clientX, clientY);
        const svgPt = pt.matrixTransform(CTM);
        return [svgPt.x, svgPt.y];
    }

    const handleInteractionStart = (e: MouseEvent<SVGSVGElement> | TouchEvent<SVGSVGElement>) => {
        if (activeTool === 'draw') {
            setIsDrawing(true);
            const coords = getCoordinates(e);
            setCurrentPath([coords]);
        }
    };

    const handleInteractionMove = (e: MouseEvent<SVGSVGElement> | TouchEvent<SVGSVGElement>) => {
        if (isDrawing && activeTool === 'draw') {
            const coords = getCoordinates(e);
            setCurrentPath(prev => [...prev, coords]);
        }
    };

    const handleInteractionEnd = (e: MouseEvent<SVGSVGElement> | TouchEvent<SVGSVGElement>) => {
        if (isDrawing && activeTool === 'draw' && currentPath.length > 0) {
            const newDrawing: SmartboardObject = {
                id: uuidv4(), type: 'drawing', path: currentPath,
                x: currentPath[0][0], y: currentPath[0][1],
                color: drawColor, strokeWidth: drawStrokeWidth,
            };
            updateAndPersist({ ...data, objects: [...data.objects, newDrawing] });
            setCurrentPath([]);
        }
        setIsDrawing(false);
        if (activeTool === 'text' && e.type !== 'mouseleave') { // Prevent text box on mouse leave
             const [x, y] = getCoordinates(e as MouseEvent); // Can't get coords from touchend
             const newText: SmartboardObject = {
                 id: uuidv4(), type: 'text', text: 'Type here...',
                 x, y, width: 150, height: 50, fontSize: 16
             };
             updateAndPersist({ ...data, objects: [...data.objects, newText] });
             setActiveTool('select');
        }
    };
    
    const handleUpdateText = (id: string, newText: string) => {
        const newObjects = data.objects.map(obj => obj.id === id && obj.type === 'text' ? { ...obj, text: newText } : obj);
        updateAndPersist({ ...data, objects: newObjects as SmartboardObject[] });
    };

    const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                const img = new Image();
                img.onload = () => {
                    const newImage: SmartboardObject = {
                        id: uuidv4(), type: 'image', dataUrl: reader.result as string,
                        x: 100, y: 100, width: img.width, height: img.height
                    };
                    updateAndPersist({ ...data, objects: [...data.objects, newImage] });
                };
                img.src = reader.result as string;
            };
            reader.readAsDataURL(file);
        }
    };
    
    const handleDownload = () => {
        const svgContent = svgRef.current?.outerHTML;
        if (!svgContent) return;
        const blob = new Blob([svgContent], { type: 'image/svg+xml;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `${project.name}_smartboard.svg`;
        link.click();
        URL.revokeObjectURL(url);
    };
    
    const handleClear = () => {
        if (window.confirm('Are you sure you want to clear the entire board?')) {
            updateAndPersist({ ...data, objects: [] });
        }
    };

    return (
        <div className="w-full h-full flex flex-col bg-background-darkest">
            <div className="p-2 border-b border-border-color flex-shrink-0 flex flex-wrap items-center justify-between gap-2 bg-surface">
                <div className="flex items-center gap-2 flex-wrap">
                    <Button onClick={() => setActiveTool('select')} variant={activeTool === 'select' ? 'primary' : 'secondary'} size="sm">Select</Button>
                    <Button onClick={() => setActiveTool('draw')} variant={activeTool === 'draw' ? 'primary' : 'secondary'} size="sm">Draw</Button>
                    <Button onClick={() => setActiveTool('text')} variant={activeTool === 'text' ? 'primary' : 'secondary'} size="sm">Text</Button>
                    <input type="file" ref={fileInputRef} onChange={handleImageUpload} accept="image/*" className="hidden"/>
                    <Button onClick={() => fileInputRef.current?.click()} variant="secondary" size="sm">Add Image</Button>
                </div>
                 <div className="flex items-center gap-2">
                    <Button onClick={handleClear} size="sm" variant="danger">Clear</Button>
                    <Button onClick={handleDownload} size="sm">Download SVG</Button>
                </div>
            </div>
            <div className="flex-grow relative overflow-hidden">
                <svg
                    ref={svgRef}
                    className="w-full h-full touch-none"
                    onMouseDown={handleInteractionStart}
                    onMouseMove={handleInteractionMove}
                    onMouseUp={handleInteractionEnd}
                    onMouseLeave={handleInteractionEnd}
                    onTouchStart={handleInteractionStart}
                    onTouchMove={handleInteractionMove}
                    onTouchEnd={handleInteractionEnd}
                    viewBox="0 0 1280 720"
                >
                    <defs>
                        <pattern id="grid" width="20" height="20" patternUnits="userSpaceOnUse">
                            <path d="M 20 0 L 0 0 0 20" fill="none" stroke="var(--border-color)" strokeWidth="0.5"/>
                        </pattern>
                    </defs>
                    <rect width="100%" height="100%" fill="url(#grid)" />
                    
                    {data.objects.map(obj => {
                        switch(obj.type) {
                            case 'drawing': return <path key={obj.id} d={obj.path.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p[0]} ${p[1]}`).join(' ')} stroke={obj.color} strokeWidth={obj.strokeWidth} fill="none" strokeLinecap="round" strokeLinejoin="round" />;
                            case 'text': return (
                                <foreignObject key={obj.id} x={obj.x} y={obj.y} width={obj.width} height={obj.height}>
                                    <textarea value={obj.text} onChange={e => handleUpdateText(obj.id, e.target.value)}
                                        style={{ fontSize: `${obj.fontSize}px`, border: '1px dashed #555', color: '#FFF' }}
                                        className="w-full h-full bg-transparent p-1 resize"
                                    />
                                </foreignObject>
                            );
                            case 'image': return <image key={obj.id} href={obj.dataUrl} x={obj.x} y={obj.y} width={obj.width} height={obj.height} />;
                            default: return null;
                        }
                    })}
                     {isDrawing && currentPath.length > 0 && (
                        <path d={currentPath.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p[0]} ${p[1]}`).join(' ')} stroke={drawColor} strokeWidth={drawStrokeWidth} fill="none" strokeLinecap="round" strokeLinejoin="round"/>
                    )}
                </svg>
            </div>
        </div>
    );
};