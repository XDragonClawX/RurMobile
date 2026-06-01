/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Species } from '../types';

interface SpeciesTrackerProps {
  species: Species[];
}

export const SpeciesTracker: React.FC<SpeciesTrackerProps> = ({ species }) => {
  const [isOpen, setIsOpen] = useState(true);

  return (
    <div className="bg-parch-1 border border-ink-1/20 rounded-lg shadow-md flex flex-col transition-all duration-300">
      {/* Clickable Header for Collapse/Expand */}
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center justify-between w-full p-3 hover:bg-parch-2/50 text-left transition-colors font-serif font-bold text-sm text-ink-0 uppercase tracking-wider rounded-t-lg"
      >
        <div className="flex items-center gap-2 select-none">
          <span className="text-lg">🦫</span>
          <span>Artenschutz & Biodiversität</span>
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
      <div className={`overflow-hidden transition-all duration-300 ${isOpen ? 'max-h-[600px] p-3 pt-0 border-t border-ink-1/10' : 'max-h-0'}`}>
        <div className="flex flex-col gap-3 max-h-[300px] overflow-y-auto tablet-scroll pr-1 mt-2.5">
          {species.map(sp => (
            <div
              key={sp.name}
              className={`p-2 rounded-md transition-all border ${
                sp.locked
                  ? 'bg-parch-2/40 border-ink-1/10 opacity-70'
                  : 'bg-parch-0 border-ink-1/15 shadow-sm'
              }`}
            >
              <div className="flex items-center justify-between mb-1.5">
                <div className="flex items-center gap-2">
                  <div
                    className="w-2.5 h-2.5 rounded-full"
                    style={{ backgroundColor: sp.dotColor }}
                  />
                  <span className="font-serif text-sm font-bold text-ink-0 italic">
                    {sp.name}
                  </span>
                </div>
                <span
                  className="font-mono text-xs font-bold"
                  style={{ color: sp.dotColor }}
                >
                  {Math.round(sp.pct)}%
                </span>
              </div>

              {/* Custom styled progress bar */}
              <div className="w-full h-2 bg-parch-3 rounded-full overflow-hidden border border-ink-1/10 relative">
                <div
                  className="h-full rounded-full transition-all duration-1000 relative"
                  style={{
                    width: `${sp.pct}%`,
                    backgroundColor: sp.dotColor,
                  }}
                >
                  {/* Ripple glow on progress end */}
                  <div className="absolute right-0 top-0 bottom-0 w-2 bg-white/40 rounded-full" />
                </div>
              </div>

              <div className="mt-1 text-[11px] text-ink-2 italic leading-tight">
                <span className="font-semibold text-ink-1">Ziel-Bedingung:</span> {sp.requirementsText}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
