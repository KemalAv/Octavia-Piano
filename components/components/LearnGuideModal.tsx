import React from 'react';
import LearnArticleView from './LearnArticleView';
import { AppLanguage } from '../types';

interface LearnGuideModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectSubMode?: (mode: 'sheet' | 'falling' | 'fingering' | 'roblox' | 'theory', lessonId?: string) => void;
  onOpenMidiEditor?: () => void;
  appLanguage?: AppLanguage;
}

export const LearnGuideModal: React.FC<LearnGuideModalProps> = ({
  isOpen,
  onClose,
  onSelectSubMode,
  onOpenMidiEditor,
  appLanguage = 'en',
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-3 md:p-6 animate-fadeIn">
      <LearnArticleView
        onBackToMainMenu={onClose}
        isModal={true}
        onCloseModal={onClose}
        appLanguage={appLanguage}
        onOpenMidiEditor={() => {
          if (onOpenMidiEditor) {
            onOpenMidiEditor();
          }
          onClose();
        }}
        onLaunchInGamePractice={(lessonId, subMode) => {
          if (onSelectSubMode) {
            onSelectSubMode(subMode, lessonId);
          }
          onClose();
        }}
      />
    </div>
  );
};

export default LearnGuideModal;
