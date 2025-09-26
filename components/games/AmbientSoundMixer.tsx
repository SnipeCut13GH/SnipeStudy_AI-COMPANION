import React, { useState, useRef, useEffect } from 'react';

const sounds = [
    { id: 'rain', name: 'Rain', icon: '🌧️', url: 'https://cdn.pixabay.com/audio/2022/11/17/audio_8aaa2632b0.mp3' },
    { id: 'forest', name: 'Forest', icon: '🌳', url: 'https://cdn.pixabay.com/audio/2022/02/04/audio_a11c332128.mp3' },
    { id: 'fire', name: 'Fireplace', icon: '🔥', url: 'https://cdn.pixabay.com/audio/2021/09/06/audio_34963334d7.mp3' },
];

export const AmbientSoundMixer: React.FC = () => {
    const audioRefs = useRef<Record<string, HTMLAudioElement | null>>({});
    const [volumes, setVolumes] = useState<Record<string, number>>({ rain: 0, forest: 0, fire: 0 });

    useEffect(() => {
        sounds.forEach(sound => {
            const audio = new Audio(sound.url);
            audio.loop = true;
            audioRefs.current[sound.id] = audio;
        });

        return () => {
            // Fix: Add explicit type to 'audio' to resolve 'unknown' type error from Object.values().
            Object.values(audioRefs.current).forEach((audio: HTMLAudioElement | null) => audio?.pause());
        };
    }, []);

    const handleVolumeChange = (id: string, volume: number) => {
        const audio = audioRefs.current[id];
        if (audio) {
            setVolumes(prev => ({ ...prev, [id]: volume }));
            audio.volume = volume / 100;
            if (volume > 0 && audio.paused) {
                audio.play().catch(e => console.error("Audio play failed:", e));
            } else if (volume === 0 && !audio.paused) {
                audio.pause();
            }
        }
    };

    return (
        <div className="flex flex-col items-center justify-center h-full bg-background-dark p-4 rounded-lg">
            <div className="w-full max-w-sm space-y-6">
                <h2 className="text-2xl font-bold text-center text-text-primary">Ambient Sound Mixer</h2>
                {sounds.map(sound => (
                    <div key={sound.id}>
                        <label htmlFor={sound.id} className="flex items-center text-lg text-text-secondary mb-2">
                            <span className="text-2xl mr-3">{sound.icon}</span> {sound.name}
                        </label>
                        <div className="flex items-center gap-4">
                             <input
                                id={sound.id}
                                type="range"
                                min="0"
                                max="100"
                                value={volumes[sound.id]}
                                onChange={(e) => handleVolumeChange(sound.id, parseInt(e.target.value, 10))}
                                className="w-full h-2 bg-overlay rounded-lg appearance-none cursor-pointer"
                            />
                            <span className="w-10 text-right">{volumes[sound.id]}%</span>
                        </div>
                    </div>
                ))}
                 <p className="text-xs text-text-secondary text-center pt-4">
                    Sounds from Pixabay. Please ensure you have a stable internet connection for audio to load.
                </p>
            </div>
        </div>
    );
};