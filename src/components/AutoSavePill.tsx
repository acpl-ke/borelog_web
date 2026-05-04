import React from 'react';

interface AutoSavePillProps {
  state: 'idle' | 'saving' | 'saved' | 'error';
}

export const AutoSavePill: React.FC<AutoSavePillProps> = ({ state }) => {
  if (state === 'idle') return null;

  const messages = {
    saving: 'Saving…',
    saved: 'Saved · just now',
    error: 'Save failed — retrying',
  };

  return (
    <div className={`autosave-pill state-${state}`}>
      <span className={`dot ${state === 'error' ? 'err' : ''}`}></span>
      <span>{messages[state]}</span>
    </div>
  );
};
