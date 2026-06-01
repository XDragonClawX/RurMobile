/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { ClimateEvent, ClimateEventChoice } from '../types';

interface EventModalProps {
  event: ClimateEvent;
  budget: number;
  researchPoints: number;
  onChoice: (choice: ClimateEventChoice) => void;
}

export const EventModal: React.FC<EventModalProps> = ({
  event,
  budget,
  researchPoints,
  onChoice
}) => {
  return (
    <div className="fixed inset-0 bg-ink-0/60 backdrop-blur-sm z-[9999] flex items-center justify-center p-4">
      <div 
        className="bg-parch-0 border-2 border-ink-1 rounded-xl shadow-2xl max-w-lg w-full overflow-hidden relative paper-card"
        id="climate-crisis-modal"
      >
        {/* Corner Marks */}
        <div className="absolute top-2 left-2 w-3 h-3 border-t border-l border-ink-3" />
        <div className="absolute top-2 right-2 w-3 h-3 border-t border-r border-ink-3" />
        <div className="absolute bottom-2 left-2 w-3 h-3 border-b border-l border-ink-3" />
        <div className="absolute bottom-2 right-2 w-3 h-3 border-b border-r border-ink-3" />

        {/* Top Header Tag */}
        <div className="bg-ink-1 px-4 py-3 text-center border-b border-ink-0">
          <span className="font-mono text-[10px] text-parch-3 tracking-widest uppercase font-bold">
            ⚠ SPEZIAL-EVENT: {event.type}
          </span>
          <h2 className="font-serif font-bold text-parch-1 text-md sm:text-lg tracking-wide mt-1">
            {event.title}
          </h2>
        </div>

        {/* Event Body */}
        <div className="p-4 sm:p-5 flex flex-col gap-4">
          <p className="text-sm text-ink-1 italic leading-relaxed text-center font-sans">
            "{event.description}"
          </p>

          <hr className="border-ink-4/30" />

          <div className="flex flex-col gap-3">
            <span className="font-mono text-[10px] text-ink-3 uppercase block tracking-wider">
              Treffe eine Entscheidung:
            </span>

            {event.choices.map((choice, i) => {
              const hasBudget = budget >= choice.cost;
              const hasResearch = !choice.researchCost || researchPoints >= choice.researchCost;
              const isEligible = hasBudget && hasResearch;

              return (
                <button
                  key={i}
                  disabled={!isEligible}
                  onClick={() => onChoice(choice)}
                  className={`w-full text-left p-3 rounded-lg border transition-all flex flex-col ${
                    isEligible
                      ? 'bg-parch-1 border-ink-4 hover:border-ink-1 active:bg-parch-2 shadow-sm'
                      : 'bg-parch-2/40 border-ink-1/10 opacity-55 cursor-not-allowed'
                  }`}
                >
                  <div className="flex items-start justify-between w-full gap-2">
                    <span className="font-serif font-bold text-xs sm:text-sm text-ink-0 max-w-[70%]">
                      {choice.text}
                    </span>
                    <div className="flex gap-1.5 flex-shrink-0">
                      {choice.cost > 0 && (
                        <span className="font-mono text-[10px] bg-fau-primary/10 text-fau-primary border border-fau-primary/20 px-1.5 py-0.5 rounded font-bold">
                          −{choice.cost} €
                        </span>
                      )}
                      {choice.researchCost && (
                        <span className="font-mono text-[10px] bg-res-primary/10 text-res-primary border border-res-primary/20 px-1.5 py-0.5 rounded font-bold">
                          −{choice.researchCost} 🧪
                        </span>
                      )}
                      {choice.cost === 0 && !choice.researchCost && (
                        <span className="font-mono text-[10px] bg-eco-primary/10 text-eco-primary border border-eco-primary/20 px-1.5 py-0.5 rounded font-bold">
                          Gratis
                        </span>
                      )}
                    </div>
                  </div>

                  <p className="text-xs text-ink-2 mt-2 leading-relaxed italic border-t border-dashed border-ink-4/30 pt-1.5">
                    {choice.effectText}
                  </p>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
