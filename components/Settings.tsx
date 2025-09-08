import React, { useState, useEffect } from 'react';
import { Button } from './common/Button';
import { Modal } from './common/Modal';
import { AppSettings } from '../../App.tsx';

interface SettingsProps {
  isOpen: boolean;
  onClose: () => void;
  settings: AppSettings;
  onThemeChange: (theme: 'light' | 'dark') => void;
  onUsernameChange: (name: string) => void;
  onFontSizeChange: (size: number) => void;
  onSystemInstructionChange: (instruction: string) => void;
  onAiVoiceChange: (voiceURI: string | null) => void;
  onAiSpeedChange: (speed: number) => void;
  onAiPitchChange: (pitch: number) => void;
  onExportData: () => void;
  onResetApplication: () => void;
}

const SettingsSection: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
    <div className="py-4 border-b border-border-color last:border-b-0">
        <h3 className="text-lg font-semibold text-text-primary mb-3">{title}</h3>
        <div className="space-y-3">{children}</div>
    </div>
);

export const Settings: React.FC<SettingsProps> = ({ 
    isOpen, onClose, settings, 
    onThemeChange, onUsernameChange, onFontSizeChange, onSystemInstructionChange,
    onAiVoiceChange, onAiSpeedChange, onAiPitchChange,
    onExportData, onResetApplication
}) => {
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);

  useEffect(() => {
    if (isOpen) {
      const loadVoices = () => {
        const availableVoices = window.speechSynthesis.getVoices();
        setVoices(availableVoices);
      };
      loadVoices();
      // Voices are loaded asynchronously
      window.speechSynthesis.onvoiceschanged = loadVoices;
      return () => {
        window.speechSynthesis.onvoiceschanged = null;
      };
    }
  }, [isOpen]);

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Application Settings">
      <div className="space-y-2">
        <SettingsSection title="Appearance">
            <div className="flex items-center justify-between">
                <label className="text-text-secondary">Theme</label>
                <div className="flex gap-2">
                    <Button onClick={() => onThemeChange('light')} variant={settings.theme === 'light' ? 'primary' : 'secondary'} size="sm">Light</Button>
                    <Button onClick={() => onThemeChange('dark')} variant={settings.theme === 'dark' ? 'primary' : 'secondary'} size="sm">Dark</Button>
                </div>
            </div>
        </SettingsSection>
        
        <SettingsSection title="Profile">
             <div className="flex items-center justify-between">
                <label htmlFor="username" className="text-text-secondary">Display Name</label>
                <input
                    id="username"
                    type="text"
                    value={settings.username}
                    onChange={(e) => onUsernameChange(e.target.value)}
                    className="w-48 bg-background-dark border border-border-color p-2 rounded-md text-text-primary"
                />
            </div>
        </SettingsSection>
        
        <SettingsSection title="AI Persona">
            <p className="text-text-secondary text-sm">Customize the chatbot's personality and response style.</p>
            <textarea
                value={settings.systemInstruction}
                onChange={(e) => onSystemInstructionChange(e.target.value)}
                rows={3}
                className="w-full bg-background-dark border border-border-color p-2 rounded-md text-text-primary"
                placeholder="e.g., You are a friendly and encouraging tutor."
            />
            <div className="flex flex-wrap gap-2">
                <Button onClick={() => onSystemInstructionChange('You are a formal and precise academic expert.')} size="sm" variant="secondary">Formal</Button>
                <Button onClick={() => onSystemInstructionChange('You are a friendly and encouraging study buddy.')} size="sm" variant="secondary">Friendly</Button>
                <Button onClick={() => onSystemInstructionChange('You are an enthusiastic and motivational coach.')} size="sm" variant="secondary">Enthusiastic</Button>
            </div>
        </SettingsSection>

         <SettingsSection title="AI Voice (Live Mode)">
            <div className="flex items-center justify-between">
                <label htmlFor="ai-voice" className="text-text-secondary">Voice</label>
                <select
                    id="ai-voice"
                    value={settings.aiVoiceURI ?? ''}
                    onChange={(e) => onAiVoiceChange(e.target.value)}
                    className="w-48 bg-background-dark border border-border-color p-2 rounded-md text-text-primary"
                >
                    <option value="">Default</option>
                    {voices.map((voice) => (
                        <option key={voice.voiceURI} value={voice.voiceURI}>
                            {voice.name} ({voice.lang})
                        </option>
                    ))}
                </select>
            </div>
             <div className="flex items-center justify-between">
                <label htmlFor="ai-speed" className="text-text-secondary">Speed</label>
                 <div className="flex items-center gap-2">
                    <input id="ai-speed" type="range" min="0.5" max="2" step="0.1" value={settings.aiSpeed} onChange={(e) => onAiSpeedChange(Number(e.target.value))} className="w-32" />
                    <span className="text-text-primary w-8 text-center">{settings.aiSpeed.toFixed(1)}x</span>
                </div>
            </div>
             <div className="flex items-center justify-between">
                <label htmlFor="ai-pitch" className="text-text-secondary">Pitch</label>
                 <div className="flex items-center gap-2">
                    <input id="ai-pitch" type="range" min="0" max="2" step="0.1" value={settings.aiPitch} onChange={(e) => onAiPitchChange(Number(e.target.value))} className="w-32" />
                    <span className="text-text-primary w-8 text-center">{settings.aiPitch.toFixed(1)}</span>
                </div>
            </div>
        </SettingsSection>

        <SettingsSection title="Accessibility">
             <div className="flex items-center justify-between">
                <label htmlFor="fontsize" className="text-text-secondary">Font Size</label>
                <div className="flex items-center gap-2">
                    <input
                        id="fontsize"
                        type="range"
                        min="12" max="20" step="1"
                        value={settings.fontSize}
                        onChange={(e) => onFontSizeChange(Number(e.target.value))}
                        className="w-32"
                    />
                    <span className="text-text-primary w-8 text-center">{settings.fontSize}px</span>
                </div>
            </div>
        </SettingsSection>

        <SettingsSection title="Data Management">
            <div className="flex items-center justify-between">
                <p className="text-text-secondary text-sm">Export all your projects and data to a JSON file.</p>
                <Button onClick={onExportData} variant="secondary">Export Data</Button>
            </div>
             <div className="flex items-center justify-between">
                <p className="text-danger/80 text-sm">Permanently delete all projects and settings.</p>
                <Button onClick={onResetApplication} variant="danger">Reset Application</Button>
            </div>
        </SettingsSection>

        <div className="flex justify-end pt-4">
          <Button onClick={onClose}>Close</Button>
        </div>
      </div>
    </Modal>
  );
};