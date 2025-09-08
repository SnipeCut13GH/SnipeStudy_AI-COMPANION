
import React, { useRef, useEffect, useState, useCallback } from 'react';
import { ImageCropper } from './ImageCropper';

const CloseIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
);

const SwitchCameraIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h5M20 20v-5h-5M4 20l16-16" /></svg>
);

interface CameraViewProps {
  onPhotoTaken: (dataUrl: string) => void;
  onClose: () => void;
}

export const CameraView: React.FC<CameraViewProps> = ({ onPhotoTaken, onClose }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const videoTrackRef = useRef<MediaStreamTrack | null>(null);

  const [error, setError] = useState<string | null>(null);
  const [devices, setDevices] = useState<MediaDeviceInfo[]>([]);
  const [currentDeviceIndex, setCurrentDeviceIndex] = useState(0);
  
  const [zoomLevel, setZoomLevel] = useState(1);
  const [zoomCapabilities, setZoomCapabilities] = useState<{ min: number; max: number; step: number } | null>(null);
  
  const [capturedImage, setCapturedImage] = useState<string | null>(null);

  const stopStream = useCallback(() => {
    streamRef.current?.getTracks().forEach(track => track.stop());
    streamRef.current = null;
    videoTrackRef.current = null;
  }, []);
  
  // Enumerate devices on mount
  useEffect(() => {
    navigator.mediaDevices.enumerateDevices()
      .then(allDevices => {
        const videoDevices = allDevices.filter(device => device.kind === 'videoinput');
        setDevices(videoDevices);
      })
      .catch(err => console.error("Could not enumerate devices:", err));
  }, []);

  // Start stream when device index changes
  useEffect(() => {
    stopStream();
    if (devices.length === 0) {
        // Attempt to start with default camera if enumeration is slow/fails
        const constraints = { video: true };
         navigator.mediaDevices.getUserMedia(constraints)
          .then(stream => {
            streamRef.current = stream;
            if (videoRef.current) videoRef.current.srcObject = stream;
            const track = stream.getVideoTracks()[0];
            if (!track) {
                setError("Could not find a video track on the stream.");
                return;
            }
            videoTrackRef.current = track;
            if ('zoom' in track.getCapabilities()) {
                // @ts-ignore
                const { min, max, step } = track.getCapabilities().zoom;
                setZoomCapabilities({ min, max, step });
                setZoomLevel((track.getSettings() as any).zoom || 1);
            }
          })
          .catch(err => {
            console.error("Camera Error:", err);
            setError("Could not access camera. Please check permissions.");
          });
        return;
    };


    const deviceId = devices[currentDeviceIndex]?.deviceId;
    const constraints = { video: { deviceId: deviceId ? { exact: deviceId } : undefined } };

    navigator.mediaDevices.getUserMedia(constraints)
      .then(stream => {
        streamRef.current = stream;
        if (videoRef.current) videoRef.current.srcObject = stream;
        
        const track = stream.getVideoTracks()[0];
        if (!track) {
            setError("Could not find a video track on the stream.");
            return;
        }
        videoTrackRef.current = track;
        // Check for zoom capabilities
        if ('zoom' in track.getCapabilities()) {
            // @ts-ignore - capabilities is not fully typed
            const { min, max, step } = track.getCapabilities().zoom;
            setZoomCapabilities({ min, max, step });
            // Fix: Cast getSettings() to any to access the non-standard 'zoom' property.
            setZoomLevel((track.getSettings() as any).zoom || 1);
        } else {
            setZoomCapabilities(null);
        }
      })
      .catch(err => {
        console.error("Camera Error:", err);
        setError("Could not access camera. Please check permissions.");
      });
      
    return () => stopStream();
  }, [currentDeviceIndex, devices, stopStream]);

  const handleSwitchCamera = useCallback(() => {
    if (devices.length > 1) {
        setCurrentDeviceIndex(prev => (prev + 1) % devices.length);
    }
  }, [devices.length]);
  
  const handleZoomChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (!videoTrackRef.current || !zoomCapabilities) return;
    const newZoom = parseFloat(e.target.value);
    try {
        // @ts-ignore - applyConstraints is available
        videoTrackRef.current.applyConstraints({ advanced: [{ zoom: newZoom }] });
    } catch (err) {
        console.warn("Zoom is not supported on this device:", err);
    }
    setZoomLevel(newZoom);
  }, [zoomCapabilities]);

  const handleCapture = useCallback(() => {
    if (!videoRef.current) return;
    const canvas = document.createElement('canvas');
    canvas.width = videoRef.current.videoWidth;
    canvas.height = videoRef.current.videoHeight;
    const context = canvas.getContext('2d');
    if (context) {
        context.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
        setCapturedImage(canvas.toDataURL('image/jpeg'));
    }
  }, []);

  const handleCropConfirm = useCallback((croppedDataUrl: string) => {
    onPhotoTaken(croppedDataUrl);
  }, [onPhotoTaken]);

  if (capturedImage) {
      return (
          <ImageCropper 
            imageSrc={capturedImage}
            onConfirm={handleCropConfirm}
            onRetake={() => setCapturedImage(null)}
            onClose={onClose}
          />
      );
  }

  return (
    <div className="fixed inset-0 bg-black z-50 flex flex-col items-center justify-center">
      <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover" />
      {error && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/70">
            <div className="bg-red-900/80 p-4 rounded-lg text-white text-center">
                <p className="font-bold">Camera Error</p><p>{error}</p>
            </div>
        </div>
      )}
      <div className="absolute inset-0 flex flex-col justify-between p-6 pointer-events-none">
        <div className="flex justify-between w-full">
            {devices.length > 1 ? (
                <button onClick={handleSwitchCamera} className="bg-black/50 text-white rounded-full p-3 hover:bg-black/75 transition-colors pointer-events-auto" aria-label="Switch camera"><SwitchCameraIcon /></button>
            ) : <div />}
            <button onClick={onClose} className="bg-black/50 text-white rounded-full p-3 hover:bg-black/75 transition-colors pointer-events-auto" aria-label="Close camera"><CloseIcon /></button>
        </div>

        <div className="flex flex-col items-center w-full">
            {zoomCapabilities && (
                <div className="w-full max-w-xs bg-black/50 p-2 rounded-full mb-6 pointer-events-auto">
                    <input type="range"
                        min={zoomCapabilities.min}
                        max={zoomCapabilities.max}
                        step={zoomCapabilities.step}
                        value={zoomLevel}
                        onChange={handleZoomChange}
                        className="w-full h-2 bg-gray-600 rounded-lg appearance-none cursor-pointer"
                    />
                </div>
            )}
            <div className="flex items-center justify-center pointer-events-auto">
                <button onClick={handleCapture} className="w-20 h-20 rounded-full border-4 border-white bg-white/30 hover:bg-white/50 transition-colors" aria-label="Take photo" />
            </div>
        </div>
      </div>
    </div>
  );
};
