/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { ResearchNode } from '../types';

interface ResearchPanelProps {
  nodes: ResearchNode[];
  researchPoints: number;
  onUnlockNode: (id: string) => void;
}

export const ResearchPanel: React.FC<ResearchPanelProps> = ({
  nodes,
  researchPoints,
  onUnlockNode
}) => {
  const [isOpen, setIsOpen] = useState(true);

  return (
    <div className="bg-parch-1 border border-ink-1/20 rounded-lg shadow-md flex flex-col transition-all duration-300">
      {/* Clickable Header for Collapse/Expand */}
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center justify-between w-full p-3 hover:bg-parch-2/50 text-left transition-colors font-serif font-bold text-sm text-ink-0 uppercase tracking-wider rounded-t-lg"
      >
        <div className="flex items-center gap-2 select-none">
          <span className="text-xl">🔬</span>
          <span>Forschung & Wissenschaft</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="font-mono text-[10px] bg-res-primary/10 border border-res-primary/20 text-res-primary px-2 py-0.5 rounded-full font-bold">
            {researchPoints} 🧪
          </span>
          <svg 
            className={`w-4 h-4 text-ink-3 transition-transform duration-300 ${isOpen ? 'rotate-180' : 'rotate-0'}`} 
            fill="none" 
            stroke="currentColor" 
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </button>

      {/* Collapsible Content */}
      <div className={`overflow-hidden transition-all duration-300 ${isOpen ? 'max-h-[800px] p-3.5 pt-0 border-t border-ink-1/10' : 'max-h-0'}`}>
        <div className="text-xs text-ink-2 italic leading-relaxed mb-3 mt-2.5 pb-2 border-b border-ink-1/10">
          Investiere Forschungspunkte (🧪) aus Feldstudien, um spezialisierte Programme für das Rurtal freizugeben.
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-[340px] overflow-y-auto tablet-scroll pr-1">
          {nodes.map(node => {
            // Check if parent requirements are met
            const requirementsMet = node.requirements.every(reqId =>
              nodes.find(n => n.id === reqId)?.unlocked
            );

            const isAffordable = researchPoints >= node.cost;
            const statusText = node.unlocked 
              ? 'Freigeschaltet' 
              : !requirementsMet 
                ? 'Gesperrt' 
                : `Erforschen (${node.cost} 🧪)`;

            return (
              <div
                key={node.id}
                className={`border rounded-lg p-2.5 transition-all flex flex-col justify-between ${
                  node.unlocked
                    ? 'bg-res-primary/5 border-res-primary text-ink-0 shadow-inner'
                    : !requirementsMet
                      ? 'bg-parch-2/40 border-ink-1/15 opacity-55'
                      : 'bg-parch-0 border-ink-1/20 hover:border-res-primary/75'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between gap-1 mb-1">
                    <span className={`font-serif text-sm font-bold ${node.unlocked ? 'text-res-primary' : 'text-ink-1'}`}>
                      {node.name}
                    </span>
                    {node.unlocked && <span className="text-res-primary text-[10px] uppercase font-mono font-bold">✓</span>}
                  </div>

                  <p className="text-xs text-ink-2 leading-relaxed mb-2">
                    {node.effect}
                  </p>

                  {node.requirements.length > 0 && (
                    <div className="text-[10px] font-mono text-ink-3 mb-2">
                      Voraussetzung: {node.requirements.map(reqId => nodes.find(n => n.id === reqId)?.name).join(', ')}
                    </div>
                  )}
                </div>

                {!node.unlocked && (
                  <button
                    disabled={!requirementsMet || !isAffordable}
                    onClick={() => onUnlockNode(node.id)}
                    className={`w-full py-1 text-center font-mono text-xs font-bold rounded-md transition-all border ${
                      requirementsMet && isAffordable
                        ? 'bg-res-primary text-white border-res-primary shadow-sm hover:brightness-110 active:brightness-95'
                        : 'bg-parch-2 border-ink-1/10 text-ink-3 cursor-not-allowed'
                    }`}
                  >
                    {statusText}
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
