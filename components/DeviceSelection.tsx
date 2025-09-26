import React, { useState, useEffect } from 'react';
import { Modal } from './common/Modal.tsx';
import { Button } from './common/Button.tsx';

interface DeviceSelectionProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (deviceId: string) => void;
  deviceType: 'audioinput' | 'videoinput';
}

export const DeviceSelection: React.FC<DeviceSelectionProps> = ({ isOpen, onClose, onSelect, deviceType }) => {
    const [devices, setDevices] = useState<MediaDeviceInfo[]>([]);
    
    useEffect(() => {
        if (isOpen) {
            navigator.mediaDevices.enumerateDevices()
                .then(allDevices => {
                    setDevices(allDevices.filter(d => d.kind === deviceType));
                });
        }
    }, [isOpen, deviceType]);
    
    return (
        <Modal isOpen={isOpen} onClose={onClose} title={`Select ${deviceType === 'videoinput' ? 'Camera' : 'Microphone'}`}>
            <div className="space-y-2">
                {devices.length === 0 && <p>No devices found.</p>}
                {devices.map(device => (
                    <button
                        key={device.deviceId}
                        onClick={() => { onSelect(device.deviceId); onClose(); }}
                        className="w-full text-left p-2 hover:bg-overlay rounded-md"
                    >
                        {device.label || `${deviceType === 'videoinput' ? 'Camera' : 'Microphone'} ${devices.indexOf(device) + 1}`}
                    </button>
                ))}
            </div>
        </Modal>
    );
};

export default DeviceSelection;
