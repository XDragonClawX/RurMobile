/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';

type FactoryMode = 'Vollbetrieb' | 'Umrüstung' | 'Stilllegung' | 'Renaturierung';

interface SchoellershammerConsoleProps {
  currentMode: FactoryMode;
  onModeChange: (mode: FactoryMode) => void;
  isRenaturierungUnlocked: boolean; // Depends on research
}

interface ModeDetails {
  title: string;
  desc: string;
  borderCol: string;
  txtCol: string;
  bgCol: string;
}

const MODES: Record<FactoryMode, ModeDetails> = {
  Vollbetrieb: {
    title: 'Vollbetrieb',
    desc: '+15 € Einnahmen · +10% Bürgerakzeptanz · ⚠ -15% WRRL-Güte',
    borderCol: 'border-rose-500',
    txtCol: 'text-rose-700',
    bgCol: 'bg-rose-50/60',
  },
  Umrüstung: {
    title: 'Modernisierung / Umrüstung',
    desc: '+5 € Einnahmen · +1 🧪 Forschungs-Kooperation · Keine WRRL-Schäden',
    borderCol: 'border-amber-500',
    txtCol: 'text-amber-700',
    bgCol: 'bg-amber-50/60',
  },
  Stilllegung: {
    title: 'Temporäre Stilllegung',
    desc: '0 € Einnahmen · −15% Bürgerakzeptanz (Stellenabbau) · WRRL neutral',
    borderCol: 'border-ink-2',
    txtCol: 'text-ink-1',
    bgCol: 'bg-parch-2/45',
  },
  Renaturierung: {
    title: 'Rückbau & Renaturierung',
    desc: '−4 € Abbaukosten · +15% WRRL-Güte · +25% Lachs-Ansiedlungserfolg',
    borderCol: 'border-eco-primary',
    txtCol: 'text-eco-primary',
    bgCol: 'bg-emerald-50/60',
  },
};

export const SchoellershammerConsole: React.FC<SchoellershammerConsoleProps> = ({
  currentMode,
  onModeChange,
  isRenaturierungUnlocked
}) => {
  const [isOpen, setIsOpen] = useState(true);
  const activeDetails = MODES[currentMode];

  return (
    <div className="bg-parch-1 border border-ink-1/20 rounded-lg shadow-md flex flex-col transition-all duration-300">
      {/* Clickable Header for Collapse/Expand */}
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center justify-between w-full p-3 hover:bg-parch-2/50 text-left transition-colors font-serif font-bold text-sm text-ink-0 uppercase tracking-wider rounded-t-lg"
      >
        <div className="flex items-center gap-1.5 select-none">
          <span className="text-lg">🏭</span>
          <span>Firma Schoellershammer</span>
        </div>
        <svg 
          className={`w-4 h-4 text-ink-3 transition-transform duration-300 ${isOpen ? 'rotate-180' : 'rotate-0'}`} 
          fill="none" 
          stroke="currentColor" 
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* Collapsible Content */}
      <div className={`overflow-hidden transition-all duration-300 ${isOpen ? 'max-h-[500px] p-3 pt-0 border-t border-ink-1/10' : 'max-h-0'}`}>
        <div className="flex flex-col gap-2.5 mt-2.5">
          <div
            className={`border-l-4 p-2.5 rounded-r-md transition-all ${activeDetails.bgCol} ${activeDetails.borderCol}`}
          >
            <span className={`font-serif text-[11px] font-bold uppercase tracking-wide block ${activeDetails.txtCol}`}>
              Aktueller Betriebsmodus: {activeDetails.title}
            </span>
            <p className="text-xs text-ink-1 leading-relaxed mt-1 italic">
              {activeDetails.desc}
            </p>
          </div>

          <div className="grid grid-cols-2 gap-1.5 mt-1 border-t border-dashed border-ink-4/30 pt-2.5">
            {(Object.keys(MODES) as FactoryMode[]).map(mode => {
              const isSelected = mode === currentMode;
              const isRestoration = mode === 'Renaturierung';
              const isLocked = isRestoration && !isRenaturierungUnlocked;

              return (
                <button
                  key={mode}
                  disabled={isLocked}
                  onClick={() => onModeChange(mode)}
                  className={`py-2 px-2.5 rounded-md text-xs font-serif font-bold transition-all border text-center flex flex-col items-center justify-center min-h-[44px] ${
                    isSelected
                      ? 'bg-ink-1 text-parch-1 border-ink-1 shadow-inner'
                      : isLocked
                        ? 'bg-parch-2/40 text-ink-3/45 border-ink-1/10 opacity-55 cursor-not-allowed'
                        : 'bg-parch-0 text-ink-1 border-ink-1/15 hover:border-ink-1'
                  }`}
                >
                  <span>{mode}</span>
                  {isLocked && <span className="text-[9px] font-mono font-normal uppercase text-rose-700 tracking-tight">🔒 Forschung nötig</span>}
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
