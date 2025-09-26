import React, { useState, useEffect } from 'react';
import { Button } from './common/Button.tsx';
import { Modal } from './common/Modal.tsx';
import { AppSettings } from '../App.tsx';
import { getTranslator } from '../services/translator.ts';
import { languages } from '../services/translations.ts';

interface SettingsProps {
  isOpen: boolean;
  onClose: () => void;
  settings: AppSettings;
  onThemeChange: (theme: 'light' | 'dark') => void;
  onUsernameChange: (name: string) => void;
  onSystemInstructionChange: (instruction: string) => void;
  onAiVoiceChange: (voiceURI: string | null) => void;
  onAiSpeedChange: (speed: number) => void;
  onAiPitchChange: (pitch: number) => void;
  onLanguageChange: (language: string) => void;
  onExportData: () => void;
  onResetApplication: () => void;
}

const SettingsSection: React.FC<{ title: string; children: React.ReactNode; description?: string }> = ({ title, children, description }) => (
    <div className="py-4 border-b border-border-color last:border-b-0">
        <h3 className="text-lg font-semibold text-text-primary">{title}</h3>
        {description && <p className="text-sm text-text-secondary mt-1 mb-3">{description}</p>}
        <div className="space-y-4 mt-3">{children}</div>
    </div>
);

const Label: React.FC<{ htmlFor: string; text: string }> = ({ htmlFor, text }) => (
    <label htmlFor={htmlFor} className="block text-sm font-medium text-text-secondary">{text}</label>
);

export const Settings: React.FC<SettingsProps> = ({
    isOpen, onClose, settings, onThemeChange, onUsernameChange,
    onSystemInstructionChange, onAiVoiceChange,
    onAiSpeedChange, onAiPitchChange, onLanguageChange,
    onExportData, onResetApplication
}) => {
    const [systemInstruction, setSystemInstruction] = useState(settings.systemInstruction);
    const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
    const { t } = getTranslator(settings.language);

    useEffect(() => {
        const loadVoices = () => {
            const availableVoices = window.speechSynthesis.getVoices();
            if (availableVoices.length > 0) {
                setVoices(availableVoices); 
            }
        };
        // Voices may load asynchronously
        loadVoices();
        window.speechSynthesis.onvoiceschanged = loadVoices;
        return () => { window.speechSynthesis.onvoiceschanged = null; };
    }, []);
    
    useEffect(() => {
        // Update local state if settings change from outside
        setSystemInstruction(settings.systemInstruction);
    }, [settings.systemInstruction, isOpen]);

    const handleInstructionBlur = () => {
        onSystemInstructionChange(systemInstruction);
    };

    const handleTestVoice = () => {
        window.speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance("Hello, this is a test of the selected voice.");
        if (settings.aiVoiceURI) {
            const voice = voices.find(v => v.voiceURI === settings.aiVoiceURI);
            if (voice) utterance.voice = voice;
        }
        utterance.rate = settings.aiSpeed;
        utterance.pitch = settings.aiPitch;
        window.speechSynthesis.speak(utterance);
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={t('settings.title')}>
            <div className="space-y-2">
                
                <SettingsSection title={t('settings.appearance')}>
                    <div>
                        <Label htmlFor="theme" text={t('settings.theme')} />
                        <div className="flex gap-2 mt-1">
                            <Button onClick={() => onThemeChange('light')} variant={settings.theme === 'light' ? 'primary' : 'secondary'}>{t('settings.theme.light')}</Button>
                            <Button onClick={() => onThemeChange('dark')} variant={settings.theme === 'dark' ? 'primary' : 'secondary'}>{t('settings.theme.dark')}</Button>
                        </div>
                    </div>
                    <div>
                        <Label htmlFor="language" text={t('settings.language')} />
                        <select
                            id="language"
                            value={settings.language}
                            onChange={(e) => onLanguageChange(e.target.value)}
                            className="w-full bg-background-dark border border-border-color p-2 rounded-md text-text-primary mt-1"
                        >
                            {Object.entries(languages).map(([code, name]) => (
                                <option key={code} value={code}>{name}</option>
                            ))}
                        </select>
                    </div>
                </SettingsSection>

                <SettingsSection title={t('settings.profile')}>
                    <div>
                        <Label htmlFor="displayName" text={t('settings.displayName')} />
                        <input
                            id="displayName"
                            type="text"
                            value={settings.username}
                            onChange={(e) => onUsernameChange(e.target.value)}
                            className="w-full bg-background-dark border border-border-color p-2 rounded-md text-text-primary mt-1"
                        />
                    </div>
                </SettingsSection>

                <SettingsSection title={t('settings.aiPersona')} description={t('settings.aiPersona.description')}>
                    <textarea
                        value={systemInstruction}
                        onChange={(e) => setSystemInstruction(e.target.value)}
                        onBlur={handleInstructionBlur}
                        rows={6}
                        className="w-full bg-background-dark border border-border-color p-2 rounded-md text-text-primary text-sm font-mono resize-y"
                    />
                </SettingsSection>

                <SettingsSection title={t('settings.aiVoice')}>
                    <div>
                        <Label htmlFor="voice" text={t('settings.voice')} />
                        <div className="flex items-center gap-2">
                            <select
                                id="voice"
                                value={settings.aiVoiceURI || ''}
                                onChange={(e) => onAiVoiceChange(e.target.value || null)}
                                className="flex-grow bg-background-dark border border-border-color p-2 rounded-md text-text-primary mt-1"
                            >
                                <option value="">{t('settings.voice.default')}</option>
                                {voices.map(voice => (
                                    <option key={voice.voiceURI} value={voice.voiceURI}>{voice.name} ({voice.lang})</option>
                                ))}
                            </select>
                            <Button onClick={handleTestVoice} variant="secondary" size="sm" className="mt-1">Test</Button>
                        </div>
                    </div>
                    <div>
                        <Label htmlFor="speed" text={`${t('settings.speed')}: ${settings.aiSpeed.toFixed(1)}x`} />
                        <input id="speed" type="range" min="0.5" max="2" step="0.1" value={settings.aiSpeed} onChange={e => onAiSpeedChange(parseFloat(e.target.value))} className="w-full" />
                    </div>
                     <div>
                        <Label htmlFor="pitch" text={`${t('settings.pitch')}: ${settings.aiPitch.toFixed(1)}`} />
                        <input id="pitch" type="range" min="0" max="2" step="0.1" value={settings.aiPitch} onChange={e => onAiPitchChange(parseFloat(e.target.value))} className="w-full" />
                    </div>
                </SettingsSection>

                <SettingsSection title={t('settings.dataManagement')}>
                    <div className="p-3 bg-background-dark rounded-lg">
                        <p className="text-sm text-text-secondary">{t('settings.dataManagement.export.description')}</p>
                        <Button onClick={onExportData} variant="secondary" size="sm" className="mt-2">{t('settings.dataManagement.export.button')}</Button>
                    </div>
                     <div className="p-3 bg-danger/10 border border-danger/30 rounded-lg">
                        <p className="text-sm text-red-200">{t('settings.dataManagement.reset.description')}</p>
                        <Button onClick={onResetApplication} variant="danger" size="sm" className="mt-2">{t('settings.dataManagement.reset.button')}</Button>
                    </div>
                </SettingsSection>
            </div>
        </Modal>
    );
};