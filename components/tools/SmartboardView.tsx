import React, { useState, useRef, MouseEvent, TouchEvent, useEffect } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { Project, SmartboardToolData, SmartboardObject } from '../../types.ts';
import { Button } from '../common/Button';
import { AppSettings } from '../../App.tsx';

interface SmartboardViewProps {
  project: Project;
  onUpdateProject: (updater: (project: Project) => Project) => void;
  settings: AppSettings;
}

const getInitialData = (project: Project): SmartboardToolData => {
  return project.tools.smartboard || {
    objects: [],
    viewport: { x: 0, y: 0, zoom: 1 },
  };
};

const DeleteIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" /></svg>;
const EraserIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M13.477 2.523a.75.75 0 01.023 1.06L3.828 13.257a.75.75 0 11-1.06-1.06L12.44 2.546a.75.75 0 011.037-.023zM4.34 14.34a.75.75 0 011.06 0l2.122 2.121a.75.75 0 01-1.061 1.06l-2.121-2.12a.75.75 0 010-1.061zM17.5 5.5a.75.75 0 00-1.06 0L8.53 13.409a2.25 2.25 0 00-2.203 3.535l-1.008 1.008a.75.75 0 101.06 1.06l1.008-1.008a2.25 2.25 0 003.535-2.203L17.5 6.56a.75.75 0 000-1.06z" clipRule="evenodd" /></svg>;

export const SmartboardView: React.FC<SmartboardViewProps> = ({ project, onUpdateProject, settings }) => {
    const [data, setData] = useState<SmartboardToolData>(getInitialData(project));
    const [activeTool, setActiveTool] = useState<'select' | 'draw' | 'text' | 'eraser'>('select');
    const [isDrawing, setIsDrawing] = useState(false);
    const [currentPath, setCurrentPath] = useState<[number, number][]>([]);
    const [drawColor, setDrawColor] = useState(settings.theme === 'light' ? '#050505' : '#FFFFFF');
    const [drawStrokeWidth, setDrawStrokeWidth] = useState(4);
    const [selectedObjectId, setSelectedObjectId] = useState<string | null>(null);
    const [fontSize, setFontSize] = useState(16);
    const svgRef = useRef<SVGSVGElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    
    type Rect = { x: number; y: number; width: number; height: number };

    type InteractionState = {
        type: 'move' | 'resize';
        objectId: string;
        startX: number;
        startY: number;
        startObjectData: { x: number; y: number; width?: number; height?: number };
    } | null;

    const [interaction, setInteraction] = useState<InteractionState>(null);
    
    useEffect(() => {
        setDrawColor(settings.theme === 'light' ? '#050505' : '#FFFFFF');
    }, [settings.theme]);

    const updateAndPersist = (newData: Partial<SmartboardToolData>) => {
        const fullData = { ...data, ...newData };
        setData(fullData as SmartboardToolData);
        onUpdateProject(p => ({ ...p, tools: { ...p.tools, smartboard: fullData as SmartboardToolData } }));
    };

    const getCoordinates = (clientX: number, clientY: number): [number, number] => {
        if (!svgRef.current) return [0, 0];
        const CTM = svgRef.current.getScreenCTM()?.inverse();
        if (!CTM) return [0, 0];
        const pt = new DOMPoint(clientX, clientY);
        const svgPt = pt.matrixTransform(CTM);
        return [svgPt.x, svgPt.y];
    }
    
    const getClientCoords = (e: MouseEvent | TouchEvent | React.MouseEvent | React.TouchEvent | globalThis.MouseEvent | globalThis.TouchEvent) => {
        if ('touches' in e) {
            return { clientX: e.touches[0].clientX, clientY: e.touches[0].clientY };
        }
        return { clientX: e.clientX, clientY: e.clientY };
    };

    const handleInteractionStart = (e: React.MouseEvent | React.TouchEvent) => {
        const target = e.target as SVGElement;
        
        if (activeTool === 'draw' || activeTool === 'eraser') {
            if ('touches' in e) e.preventDefault();
            setIsDrawing(true);
            if (activeTool === 'draw') {
                const { clientX, clientY } = getClientCoords(e);
                const coords = getCoordinates(clientX, clientY);
                setCurrentPath([coords]);
            }
        } else if (activeTool === 'select' && target.dataset.objectId) {
            setSelectedObjectId(target.dataset.objectId);
        } else if (target === svgRef.current || (target.parentNode as SVGElement) === svgRef.current) {
            setSelectedObjectId(null);
        }
    };
    
    const handleDeleteObject = (id: string) => {
        updateAndPersist({ objects: data.objects.filter(obj => obj.id !== id) });
        setSelectedObjectId(null);
    }

    useEffect(() => {
        const handleMove = (e: globalThis.MouseEvent | globalThis.TouchEvent) => {
             if (!isDrawing && !interaction) return;
            e.preventDefault();

            const { clientX, clientY } = getClientCoords(e);
            
            if (isDrawing && activeTool === 'eraser') {
                const eraserSize = 20;
                const [currentX, currentY] = getCoordinates(clientX, clientY);
                const eraserRect = { x: currentX - eraserSize / 2, y: currentY - eraserSize / 2, width: eraserSize, height: eraserSize };

                const intersects = (rect1: Rect, rect2: Rect) => {
                    return !(rect1.x > rect2.x + rect2.width ||
                             rect1.x + rect1.width < rect2.x ||
                             rect1.y > rect2.y + rect2.height ||
                             rect1.y + rect1.height < rect2.y);
                };

                setData(prevData => {
                    const remainingObjects = prevData.objects.filter(obj => {
                        const bbox = getObjectBBox(obj);
                        return !intersects(bbox, eraserRect);
                    });
                    if (remainingObjects.length !== prevData.objects.length) {
                        return { ...prevData, objects: remainingObjects };
                    }
                    return prevData;
                });

            } else if (isDrawing && activeTool === 'draw') {
                const coords = getCoordinates(clientX, clientY);
                setCurrentPath(prev => [...prev, coords]);
            } else if (interaction) {
                const [currentX, currentY] = getCoordinates(clientX, clientY);
                const [startX, startY] = getCoordinates(interaction.startX, interaction.startY);
                const dx = currentX - startX;
                const dy = currentY - startY;

                const newObjects = data.objects.map(obj => {
                    if (obj.id === interaction.objectId) {
                        if (interaction.type === 'move') {
                            return { ...obj, x: interaction.startObjectData.x + dx, y: interaction.startObjectData.y + dy };
                        }
                        if (interaction.type === 'resize' && (obj.type === 'text' || obj.type === 'image')) {
                            return { 
                                ...obj, 
                                width: Math.max(50, (interaction.startObjectData.width || 0) + dx), 
                                height: Math.max(30, (interaction.startObjectData.height || 0) + dy)
                            };
                        }
                    }
                    return obj;
                });
                setData({ ...data, objects: newObjects });
            }
        };

        const handleEnd = () => {
            if (isDrawing && currentPath.length > 0 && activeTool === 'draw') {
                const newDrawing: SmartboardObject = {
                    id: uuidv4(), type: 'drawing', path: currentPath,
                    x: currentPath[0][0], y: currentPath[0][1],
                    color: drawColor, strokeWidth: drawStrokeWidth,
                };
                updateAndPersist({ objects: [...data.objects, newDrawing] });
                setCurrentPath([]);
            } else if (interaction) {
                // Persist changes after move/resize ends
                updateAndPersist({ objects: data.objects });
            } else if (isDrawing && activeTool === 'eraser') {
                 updateAndPersist({ objects: data.objects });
            }
            setIsDrawing(false);
            setInteraction(null);
        };
        
        const handleKeyDown = (e: KeyboardEvent) => {
            if ((e.key === 'Backspace' || e.key === 'Delete') && selectedObjectId) {
                // Prevent browser back navigation on backspace
                if ((e.target as HTMLElement).tagName.toLowerCase() !== 'textarea') {
                    e.preventDefault();
                }
                handleDeleteObject(selectedObjectId);
            }
        };

        window.addEventListener('mousemove', handleMove as EventListener);
        window.addEventListener('touchmove', handleMove as EventListener, { passive: false });
        window.addEventListener('mouseup', handleEnd);
        window.addEventListener('touchend', handleEnd);
        window.addEventListener('keydown', handleKeyDown);

        return () => {
            window.removeEventListener('mousemove', handleMove as EventListener);
            window.removeEventListener('touchmove', handleMove as EventListener);
            window.removeEventListener('mouseup', handleEnd);
            window.removeEventListener('touchend', handleEnd);
            window.removeEventListener('keydown', handleKeyDown);
        };
    }, [interaction, isDrawing, currentPath, data, drawColor, drawStrokeWidth, selectedObjectId, activeTool]);


    const handleInteractionEnd = (e: React.MouseEvent | React.TouchEvent) => {
        if (activeTool === 'text' && e.currentTarget === svgRef.current) {
             const { clientX, clientY } = getClientCoords(e);
             const [x, y] = getCoordinates(clientX, clientY);
             const newText: SmartboardObject = {
                 id: uuidv4(), type: 'text', text: 'Type here...',
                 x, y, width: 150, height: 50, fontSize: fontSize
             };
             updateAndPersist({ objects: [...data.objects, newText] });
             setActiveTool('select');
        }
    };
    
    const handleObjectInteractionStart = (e: React.MouseEvent | React.TouchEvent, obj: SmartboardObject, type: 'move' | 'resize') => {
        if (activeTool !== 'select') return;
        e.stopPropagation();
        e.preventDefault();
        setSelectedObjectId(obj.id);
        const { clientX, clientY } = getClientCoords(e);
        setInteraction({ 
            type, 
            objectId: obj.id, 
            startX: clientX, 
            startY: clientY, 
            startObjectData: { x: obj.x, y: obj.y, width: (obj as any).width, height: (obj as any).height }
        });
    };
    
    const handleUpdateText = (id: string, newText: string) => {
        const newObjects = data.objects.map(obj => obj.id === id && obj.type === 'text' ? { ...obj, text: newText } : obj);
        updateAndPersist({ objects: newObjects as SmartboardObject[] });
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
                    updateAndPersist({ objects: [...data.objects, newImage] });
                };
                img.src = reader.result as string;
            };
            reader.readAsDataURL(file);
        }
        e.target.value = '';
    };
    
    const handleDownload = () => {
        if (!svgRef.current) return;
        const svg = svgRef.current;
        const serializer = new XMLSerializer();
        let source = serializer.serializeToString(svg);

        if (!source.match(/^<svg[^>]+xmlns="http\:\/\/www\.w3\.org\/2000\/svg"/)) {
            source = source.replace(/^<svg/, '<svg xmlns="http://www.w3.org/2000/svg"');
        }
        
        const svgBlob = new Blob([source], { type: 'image/svg+xml;charset=utf-8' });
        const url = URL.createObjectURL(svgBlob);

        const img = new Image();
        img.onload = () => {
            const canvas = document.createElement('canvas');
            const viewBox = svg.getAttribute('viewBox')?.split(' ').map(Number);
            canvas.width = viewBox ? viewBox[2] : 1280;
            canvas.height = viewBox ? viewBox[3] : 720;
            const ctx = canvas.getContext('2d');
            if (ctx) {
                ctx.fillStyle = getComputedStyle(document.documentElement).getPropertyValue('--background').trim();
                ctx.fillRect(0, 0, canvas.width, canvas.height);
                ctx.drawImage(img, 0, 0);

                const pngUrl = canvas.toDataURL('image/png');
                const link = document.createElement('a');
                link.href = pngUrl;
                link.download = `${project.name}_smartboard.png`;
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
            }
            URL.revokeObjectURL(url);
        };
        img.src = url;
    };
    
    const handleClear = () => {
        if (window.confirm('Are you sure you want to clear the entire board? This action cannot be undone.')) {
            // Explicitly reset interaction states to prevent them from blocking the click event.
            setIsDrawing(false);
            setInteraction(null);
            setCurrentPath([]);
            updateAndPersist({ objects: [] });
        }
    };

    const getObjectBBox = (obj: SmartboardObject): Rect => {
        switch(obj.type) {
            case 'drawing':
                if (obj.path.length === 0) return {x: obj.x, y: obj.y, width: 0, height: 0};
                const xs = obj.path.map(p => p[0]);
                const ys = obj.path.map(p => p[1]);
                const minX = Math.min(...xs);
                const minY = Math.min(...ys);
                return { x: minX, y: minY, width: Math.max(...xs) - minX, height: Math.max(...ys) - minY };
            case 'text':
            case 'image':
                return { x: obj.x, y: obj.y, width: obj.width, height: obj.height };
        }
        return { x: 0, y: 0, width: 0, height: 0 };
    }
    
    const textColor = settings.theme === 'light' ? '#050505' : '#FFFFFF';

    const handleFontSizeChange = (change: 'increase' | 'decrease') => {
        const newSize = change === 'increase' ? fontSize + 2 : fontSize - 2;
        const clampedSize = Math.max(8, Math.min(64, newSize));
        setFontSize(clampedSize);

        if (selectedObjectId) {
            const newObjects = data.objects.map(obj => {
                if (obj.id === selectedObjectId && obj.type === 'text') {
                    return { ...obj, fontSize: clampedSize };
                }
                return obj;
            });
            updateAndPersist({ objects: newObjects });
        }
    };


    return (
        <div className="w-full h-full flex flex-col bg-background-darkest">
             <style>{`.eraser-cursor { cursor: url('data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32"><circle cx="16" cy="16" r="14" fill="none" stroke="currentColor" stroke-width="2"/></svg>') 16 16, crosshair; }`}</style>
            <div className="p-2 border-b border-border-color flex-shrink-0 flex flex-wrap items-center justify-between gap-2 bg-surface">
                <div className="flex items-center gap-2 flex-wrap">
                    <Button onClick={() => setActiveTool('select')} variant={activeTool === 'select' ? 'primary' : 'secondary'} size="sm">Select</Button>
                    <Button onClick={() => setActiveTool('draw')} variant={activeTool === 'draw' ? 'primary' : 'secondary'} size="sm">Draw</Button>
                    <Button onClick={() => setActiveTool('text')} variant={activeTool === 'text' ? 'primary' : 'secondary'} size="sm">Text</Button>
                    <Button onClick={() => setActiveTool('eraser')} variant={activeTool === 'eraser' ? 'primary' : 'secondary'} size="sm" leftIcon={<EraserIcon />}>Eraser</Button>
                    <input type="file" id="smartboard-image-upload" ref={fileInputRef} onChange={handleImageUpload} accept="image/*" className="hidden"/>
                    <label htmlFor="smartboard-image-upload" className="inline-flex items-center justify-center font-semibold rounded-lg transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-background bg-overlay text-text-primary hover:bg-border-color focus:ring-brand-secondary px-3 py-1.5 text-xs cursor-pointer">
                        Add Image
                    </label>
                    <div className="flex items-center gap-1 bg-overlay rounded-lg p-0.5">
                        <button onClick={() => handleFontSizeChange('decrease')} className="px-2 py-1 text-xs rounded-md hover:bg-background-dark">-A</button>
                        <span className="text-xs w-6 text-center">{fontSize}</span>
                        <button onClick={() => handleFontSizeChange('increase')} className="px-2 py-1 text-xs rounded-md hover:bg-background-dark">+A</button>
                    </div>
                </div>
                 <div className="flex items-center gap-2">
                    <Button onClick={() => selectedObjectId && handleDeleteObject(selectedObjectId)} size="sm" variant="secondary" disabled={!selectedObjectId} leftIcon={<DeleteIcon />}>Delete</Button>
                    <Button onClick={handleClear} size="sm" variant="danger">Clear</Button>
                    <Button onClick={handleDownload} size="sm">Download PNG</Button>
                </div>
            </div>
            <div className="flex-grow relative overflow-hidden">
                <svg
                    ref={svgRef}
                    className={`w-full h-full touch-none ${activeTool === 'eraser' ? 'eraser-cursor' : ''}`}
                    onMouseDown={handleInteractionStart}
                    onMouseUp={handleInteractionEnd}
                    onTouchStart={handleInteractionStart}
                    onTouchEnd={handleInteractionEnd}
                    viewBox="0 0 1280 720"
                >
                    <defs>
                        <pattern id="grid" width="20" height="20" patternUnits="userSpaceOnUse">
                            <path d="M 20 0 L 0 0 0 20" fill="none" stroke="var(--border-color)" strokeWidth="0.5"/>
                        </pattern>
                    </defs>
                    <rect width="100%" height="100%" fill="var(--background)" />
                    <rect width="100%" height="100%" fill="url(#grid)" />
                    
                    {data.objects.map(obj => {
                        const objectProps = {
                            'data-object-id': obj.id,
                            onMouseDown: (e: React.MouseEvent) => handleObjectInteractionStart(e, obj, 'move'),
                            onTouchStart: (e: React.TouchEvent) => handleObjectInteractionStart(e, obj, 'move'),
                            style: { cursor: activeTool === 'select' ? 'move' : 'default', pointerEvents: ['draw', 'eraser'].includes(activeTool) ? 'none' : 'auto'} as React.CSSProperties
                        };
                        const drawingPath = obj.type === 'drawing' ? obj.path.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p[0]} ${p[1]}`).join(' ') : '';
                        switch(obj.type) {
                            case 'drawing': return (
                                <g key={obj.id}>
                                    <path d={drawingPath} stroke="transparent" strokeWidth={Math.max(20, obj.strokeWidth)} fill="none" strokeLinecap="round" strokeLinejoin="round" {...objectProps} />
                                    <path d={drawingPath} stroke={obj.color} strokeWidth={obj.strokeWidth} fill="none" strokeLinecap="round" strokeLinejoin="round" style={{ pointerEvents: 'none' }} />
                                </g>
                            );
                            case 'text': return (
                                <g key={obj.id} transform={`translate(${obj.x}, ${obj.y})`}>
                                    <foreignObject x="0" y="0" width={obj.width} height={obj.height} {...objectProps}>
                                        <textarea value={obj.text} onChange={e => handleUpdateText(obj.id, e.target.value)}
                                            onMouseDown={(e) => { if(activeTool === 'select') e.stopPropagation() }}
                                            onTouchStart={(e) => { if(activeTool === 'select') e.stopPropagation() }}
                                            style={{ fontSize: `${obj.fontSize}px`, border: 'none', color: textColor, pointerEvents: activeTool === 'select' ? 'auto' : 'none' }}
                                            className="w-full h-full bg-transparent p-1 resize-none"
                                        />
                                    </foreignObject>
                                </g>
                            );
                            case 'image': return (
                                <g key={obj.id} transform={`translate(${obj.x}, ${obj.y})`}>
                                    <image href={obj.dataUrl} x="0" y="0" width={obj.width} height={obj.height} {...objectProps} />
                                </g>
                            );
                            default: return null;
                        }
                    })}
                     {isDrawing && currentPath.length > 0 && activeTool === 'draw' && (
                        <path d={currentPath.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p[0]} ${p[1]}`).join(' ')} stroke={drawColor} strokeWidth={drawStrokeWidth} fill="none" strokeLinecap="round" strokeLinejoin="round"/>
                    )}

                    {/* Selection Highlight */}
                    {selectedObjectId && data.objects.find(o => o.id === selectedObjectId) && (() => {
                        const selectedObject = data.objects.find(o => o.id === selectedObjectId)!;
                        const bbox = getObjectBBox(selectedObject);
                        const handleSize = 10;
                        return (
                            <g>
                                <rect x={bbox.x - 4} y={bbox.y - 4} width={bbox.width + 8} height={bbox.height + 8} fill="none" stroke="var(--brand-primary)" strokeWidth="2" strokeDasharray="4 4" />
                                {(selectedObject.type === 'text' || selectedObject.type === 'image') &&
                                    <rect
                                        x={bbox.x + bbox.width - handleSize/2} y={bbox.y + bbox.height - handleSize/2} width={handleSize} height={handleSize}
                                        fill="var(--brand-primary)" className="cursor-se-resize"
                                        onMouseDown={(e) => handleObjectInteractionStart(e, selectedObject, 'resize')}
                                        onTouchStart={(e) => handleObjectInteractionStart(e, selectedObject, 'resize')}
                                    />
                                }
                            </g>
                        );
                    })()}
                </svg>
            </div>
        </div>
    );
};