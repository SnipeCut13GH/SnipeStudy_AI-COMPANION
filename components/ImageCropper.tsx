import React, { useState, useRef, useEffect } from 'react';
import { Button } from './common/Button';

interface ImageCropperProps {
  imageSrc: string;
  onConfirm: (croppedImageUrl: string) => void;
  onRetake: () => void;
  onClose: () => void;
}

interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

const CROP_BOX_INITIAL_PERCENTAGE = 0.8;

export const ImageCropper: React.FC<ImageCropperProps> = ({ imageSrc, onConfirm, onRetake, onClose }) => {
    const imgRef = useRef<HTMLImageElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const [cropRect, setCropRect] = useState<Rect>({ x: 0, y: 0, width: 100, height: 100 });
    const [interaction, setInteraction] = useState<{ type: 'move' | 'resize-br', startX: number, startY: number, startRect: Rect } | null>(null);

    useEffect(() => {
        const image = imgRef.current;
        if (!image) return;

        const setInitialCropBox = () => {
            const container = containerRef.current;
            if (!container) return;

            const containerAspect = container.clientWidth / container.clientHeight;
            const imageAspect = image.naturalWidth / image.naturalHeight;

            let viewWidth, viewHeight;
            if (imageAspect > containerAspect) {
                viewWidth = container.clientWidth;
                viewHeight = viewWidth / imageAspect;
            } else {
                viewHeight = container.clientHeight;
                viewWidth = viewHeight * imageAspect;
            }

            const initialWidth = viewWidth * CROP_BOX_INITIAL_PERCENTAGE;
            const initialHeight = viewHeight * CROP_BOX_INITIAL_PERCENTAGE;

            setCropRect({
                x: (container.clientWidth - initialWidth) / 2,
                y: (container.clientHeight - initialHeight) / 2,
                width: initialWidth,
                height: initialHeight,
            });
        };

        if (image.complete) {
            setInitialCropBox();
        } else {
            image.onload = setInitialCropBox;
        }

        const handleResize = () => setInitialCropBox();
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);

    }, [imageSrc]);

    const getClientCoords = (e: MouseEvent | TouchEvent | React.MouseEvent | React.TouchEvent) => {
        if ('touches' in e) {
            return { x: e.touches[0].clientX, y: e.touches[0].clientY };
        }
        return { x: e.clientX, y: e.clientY };
    };

    const handleInteractionStart = (e: React.MouseEvent | React.TouchEvent, type: 'move' | 'resize-br') => {
        e.preventDefault();
        const { x, y } = getClientCoords(e);
        setInteraction({ type, startX: x, startY: y, startRect: cropRect });
    };

    const handleInteractionMove = (e: MouseEvent | TouchEvent) => {
        if (!interaction || !containerRef.current) return;
        const { x, y } = getClientCoords(e);
        const dx = x - interaction.startX;
        const dy = y - interaction.startY;
        
        let newRect = { ...interaction.startRect };
        
        if (interaction.type === 'move') {
            newRect.x = interaction.startRect.x + dx;
            newRect.y = interaction.startRect.y + dy;
        } else if (interaction.type === 'resize-br') {
            newRect.width = interaction.startRect.width + dx;
            newRect.height = interaction.startRect.height + dy;
        }
        
        // Boundary checks
        if (newRect.width < 50) newRect.width = 50;
        if (newRect.height < 50) newRect.height = 50;
        newRect.x = Math.max(0, Math.min(newRect.x, containerRef.current.clientWidth - newRect.width));
        newRect.y = Math.max(0, Math.min(newRect.y, containerRef.current.clientHeight - newRect.height));

        setCropRect(newRect);
    };

    const handleInteractionEnd = () => {
        setInteraction(null);
    };

    useEffect(() => {
        if (interaction) {
            document.addEventListener('mousemove', handleInteractionMove);
            document.addEventListener('mouseup', handleInteractionEnd);
            document.addEventListener('touchmove', handleInteractionMove);
            document.addEventListener('touchend', handleInteractionEnd);
        }
        return () => {
            document.removeEventListener('mousemove', handleInteractionMove);
            document.removeEventListener('mouseup', handleInteractionEnd);
            document.removeEventListener('touchmove', handleInteractionMove);
            document.removeEventListener('touchend', handleInteractionEnd);
        };
    }, [interaction]);

    const handleConfirm = () => {
        const image = imgRef.current;
        const container = containerRef.current;
        if (!image || !container) return;

        const scaleX = image.naturalWidth / image.clientWidth;
        const scaleY = image.naturalHeight / image.clientHeight;

        const sourceX = (cropRect.x - image.offsetLeft) * scaleX;
        const sourceY = (cropRect.y - image.offsetTop) * scaleY;
        const sourceWidth = cropRect.width * scaleX;
        const sourceHeight = cropRect.height * scaleY;
        
        const canvas = document.createElement('canvas');
        canvas.width = sourceWidth;
        canvas.height = sourceHeight;
        const ctx = canvas.getContext('2d');

        if (ctx) {
            ctx.drawImage(image, sourceX, sourceY, sourceWidth, sourceHeight, 0, 0, sourceWidth, sourceHeight);
            onConfirm(canvas.toDataURL('image/jpeg'));
        }
    };


    return (
        <div className="fixed inset-0 bg-black z-50 flex flex-col items-center justify-center p-4">
            <h2 className="text-white text-lg font-semibold mb-4">Crop Image</h2>
            <div ref={containerRef} className="relative w-full h-full max-w-3xl max-h-[70vh] flex items-center justify-center overflow-hidden">
                <img ref={imgRef} src={imageSrc} className="max-w-full max-h-full object-contain select-none" alt="Preview"/>
                <div className="absolute inset-0">
                     {/* Overlay */}
                    <div className="absolute inset-0 bg-black/60" style={{
                        clipPath: `polygon(
                            0% 0%, 100% 0%, 100% 100%, 0% 100%,
                            ${cropRect.x}px ${cropRect.y}px,
                            ${cropRect.x}px ${cropRect.y + cropRect.height}px,
                            ${cropRect.x + cropRect.width}px ${cropRect.y + cropRect.height}px,
                            ${cropRect.x + cropRect.width}px ${cropRect.y}px,
                            ${cropRect.x}px ${cropRect.y}px
                        )`,
                        clipRule: 'evenodd'
                    }}/>
                    {/* Crop Box */}
                    <div
                        className="absolute border-2 border-dashed border-white cursor-move"
                        style={{
                            left: cropRect.x,
                            top: cropRect.y,
                            width: cropRect.width,
                            height: cropRect.height,
                        }}
                        onMouseDown={(e) => handleInteractionStart(e, 'move')}
                        onTouchStart={(e) => handleInteractionStart(e, 'move')}
                    >
                         <div className="absolute -right-1.5 -bottom-1.5 w-4 h-4 bg-white rounded-full cursor-se-resize" 
                            onMouseDown={(e) => handleInteractionStart(e, 'resize-br')}
                            onTouchStart={(e) => handleInteractionStart(e, 'resize-br')}
                         />
                    </div>
                </div>
            </div>
            <div className="mt-6 flex gap-4">
                <Button onClick={onRetake} variant="secondary">Retake</Button>
                <Button onClick={handleConfirm}>Confirm Crop</Button>
            </div>
             <button onClick={onClose} className="absolute top-6 right-6 text-white/70 hover:text-white text-4xl font-light">&times;</button>
        </div>
    );
};
