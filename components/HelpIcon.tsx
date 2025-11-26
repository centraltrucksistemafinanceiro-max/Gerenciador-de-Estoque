import React from 'react';
import { InfoIcon } from './icons/Icon';

interface HelpIconProps {
  text: string;
}

const HelpIcon: React.FC<HelpIconProps> = ({ text }) => {
  return (
    <div className="help-icon-container relative flex items-center">
      <InfoIcon className="w-5 h-5 text-gray-500" />
      <div
        className="help-tooltip absolute left-1/2 -translate-x-1/2 bottom-full mb-2 w-max max-w-xs p-2 text-sm text-white rounded shadow-lg opacity-0 transition-opacity duration-300 z-30"
        style={{ backgroundColor: 'var(--color-card)', border: '1px solid var(--color-border)', pointerEvents: 'none' }}
      >
        {text}
      </div>
    </div>
  );
};

export default HelpIcon;
