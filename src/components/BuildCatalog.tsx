/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { BuildingType, ResearchNode } from '../types';
import { BUILDINGS_CATALOG } from '../gameData';

interface BuildCatalogProps {
  onSelectBuilding: (building: BuildingType | null) => void;
  selectedBuildingId: string | null;
  budget: number;
  activeCardStrength: number;
  unlockedResearchIds: string[];
}

type CatalogCategory = 'all' | 'ecology' | 'water' | 'fauna' | 'economy_tourism';

export const BuildCatalog: React.FC<BuildCatalogProps> = ({
  onSelectBuilding,
  selectedBuildingId,
  budget,
  activeCardStrength,
  unlockedResearchIds
}) => {
  const [activeCategory, setActiveCategory] = useState<CatalogCategory>('all');

  const filteredBuildings = BUILDINGS_CATALOG.filter(b => {
    if (activeCategory === 'all') return true;
    if (activeCategory === 'ecology') return b.category === 'ecology';
    if (activeCategory === 'water') return b.category === 'water';
    if (activeCategory === 'fauna') return b.category === 'fauna';
    if (activeCategory === 'economy_tourism') return b.category === 'economy' || b.category === 'tourism';
    return true;
  });

  // Calculate dynamic build limitations based on Arche Nova action cards strength
  // Stärke 1 -> max 4 €
  // Stärke 2 -> max 6 €
  // Stärke 3 -> max 8 € (mit −1€ Rabatt)
  // Stärke 4 -> max 10 € (mit −1€ Rabatt)
  // Stärke 5 -> unbegrenzt (mit −2€ Rabatt)
  const getMaxSpendable = (strength: number) => {
    if (strength === 1) return 4;
    if (strength === 2) return 6;
    if (strength === 3) return 8;
    if (strength === 4) return 10;
    return 1000; // unlimited
  };

  const getDiscount = (strength: number) => {
    if (strength === 3 || strength === 4) return 1;
    if (strength === 5) return 2;
    return 0;
  };

  const maxSp = getMaxSpendable(activeCardStrength);
  const discount = getDiscount(activeCardStrength);

  return (
    <div className="flex flex-col gap-2 w-full">
      {/* Catalog Category Filters */}
      <div className="flex items-center justify-between gap-2 overflow-x-auto tablet-scroll pb-1">
        <span className="font-serif font-bold text-[11px] text-ink-2 uppercase tracking-wider flex-shrink-0">
          Filter:
        </span>
        <div className="flex items-center gap-1.5 flex-nowrap">
          {(
            [
              { id: 'all', label: 'Alle', style: 'border-ink-1 text-ink-1' },
              { id: 'ecology', label: '🌿 Öko', style: 'border-eco-primary text-eco-primary' },
              { id: 'water', label: '🌊 Wasser', style: 'border-wat-primary text-wat-primary' },
              { id: 'fauna', label: '🦫 Fauna', style: 'border-fau-primary text-fau-primary' },
              { id: 'economy_tourism', label: '⚡ Wirtsch.', style: 'border-res-primary text-res-primary' }
            ] as const
          ).map(cat => (
            <button
              key={cat.id}
              onClick={() => setActiveCategory(cat.id)}
              className={`px-3 py-1.5 rounded-full text-[11px] font-serif font-bold border transition-all ${
                activeCategory === cat.id
                  ? 'bg-ink-1 text-parch-0 border-ink-1 shadow-md'
                  : 'bg-parch-0/70 text-ink-2 hover:border-ink-2 shadow-sm'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>
      </div>

      {/* Ribbon Horizontal Catalog view */}
      <div className="flex gap-2.5 overflow-x-auto tablet-scroll pb-1.5 pt-0.5 px-0.5 scroll-smooth" id="catalog-row">
        {filteredBuildings.map(b => {
          // Dynamic cost deduction
          const finalCost = Math.max(1, b.cost - discount);
          const pointsRequired = b.researchRequired;
          const isResearchLocked = pointsRequired && !unlockedResearchIds.includes(pointsRequired);

          // Check if eligible
          const strengthEligible = b.cost <= maxSp;
          const budgetEligible = budget >= finalCost;
          const canBuild = strengthEligible && budgetEligible && !isResearchLocked;

          const isSelected = selectedBuildingId === b.id;

          return (
            <button
              key={b.id}
              disabled={isResearchLocked}
              onClick={() => {
                if (isSelected) onSelectBuilding(null);
                else if (canBuild) onSelectBuilding(b);
              }}
              className={`flex-shrink-0 w-[114px] p-2.5 rounded-lg border-2 text-left relative flex flex-col justify-between transition-all select-none h-[116px] ${
                isSelected
                  ? 'bg-parch-0 border-eco-primary ring-2 ring-eco-primary/30 shadow-lg scale-98 translate-y-[-2px]'
                  : !canBuild
                    ? 'bg-parch-2/40 border-ink-1/10 shadow-sm opacity-55'
                    : 'bg-parch-0 border-ink-1/15 hover:border-ink-1 shadow-sm hover:translate-y-[-1px]'
              }`}
            >
              {/* Top color indicator line */}
              <div 
                className={`absolute top-0 left-0 right-0 h-1.5 rounded-t-sm ${
                  b.category === 'ecology' ? 'bg-eco-primary' :
                  b.category === 'water' ? 'bg-wat-primary' :
                  b.category === 'fauna' ? 'bg-fau-primary' : 'bg-res-primary'
                }`} 
              />

              <div className="flex flex-col gap-1 w-full pt-1.5 overflow-hidden">
                <div className="flex items-center justify-between gap-1 w-full">
                  <span className="text-xl leading-none">{b.icon}</span>
                  {!canBuild && !isResearchLocked && (
                    <span className="text-[8px] font-mono font-bold bg-red-600/10 text-red-700 px-1 rounded">
                      {!strengthEligible ? '⚡ Stärke' : '💶 Geld'}
                    </span>
                  )}
                  {isResearchLocked && (
                    <span className="text-[8px] font-mono font-bold bg-red-600 text-white px-1 rounded uppercase flex items-center gap-0.5">
                      🔒 R&D
                    </span>
                  )}
                </div>

                <div className="font-serif font-bold text-[11px] leading-tight text-ink-0 line-clamp-2">
                  {b.name}
                </div>
              </div>

              {/* Cost layout */}
              <div className="flex items-end justify-between w-full mt-1.5 border-t border-dashed border-ink-4/30 pt-1">
                <span className="font-mono text-[9px] text-ink-2 uppercase tracking-wide">
                  Netto:
                </span>
                <span className={`font-mono text-xs font-bold ${canBuild ? 'text-ink-0' : 'text-red-700/80'}`}>
                  {finalCost} €
                </span>
              </div>
            </button>
          );
        })}
      </div>

      {/* Prompt summary detailing strengths and build permissions */}
      <div className="text-[10px] sm:text-xs text-ink-2 font-mono flex items-center justify-between p-1 bg-parch-2/40 rounded border border-ink-1/10">
        <div>
          <span>Aktionsstärke: </span>
          <span className="font-bold text-ink-1">{activeCardStrength}</span>
          <span> (Fördert max: </span>
          <span className="font-bold text-ink-1">{maxSp === 1000 ? 'unbegrenzt' : `${maxSp} €`}</span>
          <span>)</span>
        </div>
        <div>
          <span>Rabatt: </span>
          <span className="font-bold text-eco-primary">−{discount} €</span>
        </div>
      </div>
    </div>
  );
};
