/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type TerrainType = 'Water' | 'Wiese' | 'Auwald' | 'Acker' | 'Gewerbe' | 'Siedlung';

export type ActionCardType = 'BUILD' | 'PLANT' | 'HYDROLOGY' | 'FUNDING' | 'RESEARCH';

export interface ActionCard {
  id: string;
  type: ActionCardType;
  name: string;
  emoji: string;
  strength: number; // 1 to 5
  position: number; // 0 to 4 inside the action ribbon
}

export interface TileData {
  x: number;
  y: number;
  terrain: TerrainType;
  baseTerrain: TerrainType;
  wrrl_quality: number; // 1.0 (sehr gut) bis 5.0 (sehr schlecht)
  ffh_value: number; // 0 bis 100
  flood_risk: 'Niedrig' | 'Mittel' | 'Hoch';
  moisture: number; // 0 bis 100
  biodiversity: number; // 0 bis 100
  buildingId: string | null;
  cityName: string | null;
  hasRiverConnection: boolean;
  upgradeLevel?: number;
}

export interface BuildingType {
  id: string;
  name: string;
  cost: number;
  category: 'ecology' | 'water' | 'fauna' | 'economy' | 'infrastructure' | 'tourism';
  icon: string;
  description: string;
  effect: string;
  researchRequired?: string | null;
  /** Terrain types this building may be placed on. Undefined = no restriction. */
  allowedTerrain?: TerrainType[];
}

export interface ResearchNode {
  id: string;
  name: string;
  cost: number; // in 🧪
  unlocked: boolean;
  requirements: string[]; // ids of predecessor research
  effect: string;
  progress: number; // 0 to 100
  /** Flat cost reduction (in €) applied to a specific building via getEffectiveCost(). */
  buildingCostReduction?: { buildingId: string; reduction: number };
}

export interface GameStats {
  round: number;
  year: number;
  season: number; // 0 = FRÜHJAHR, 1 = SOMMER, 2 = HERBST, 3 = WINTER
  budget: number;
  researchPoints: number;
  naturePoints: number;
  globalWrrl: number; // 0 to 100%
  globalFfh: number; // 0 to 100%
  continuity: number; // 0 to 100%
  climateRisk: number; // 0 to 100%
  citizenAcceptance: number; // 0 to 100%
  biosecurity: number; // 0 to 100%
  renewableEnergy: number; // 0 to 100%
  co2Footprint: number; // in tons
  paperFactoryMode: 'Vollbetrieb' | 'Umrüstung' | 'Stilllegung' | 'Renaturierung';
  /** Rounds remaining until factory mode can be changed again (0 = free). */
  factoryCooldown: number;
  /** Current game phase — controls which UI layers are visible. */
  gamePhase: 'playing' | 'end_win' | 'end_collapse';
}

export interface ClimateEventChoice {
  text: string;
  cost: number;
  researchCost?: number;
  effectText: string;
  effect: {
    budgetChange?: number;
    researchChange?: number;
    natureChange?: number;
    wrrlChange?: number;
    ffhChange?: number;
    acceptanceChange?: number;
    riskChange?: number;
    biosecurityChange?: number;
  };
}

export interface ClimateEvent {
  id: string;
  title: string;
  type: string;
  description: string;
  choices: ClimateEventChoice[];
}

export interface Quest {
  id: string;
  title: string;
  description: string;
  rewardText: string;
  status: 'available' | 'active' | 'completed';
  requiredBuildingId?: string;
  reward: {
    budget?: number;
    research?: number;
    nature?: number;
    acceptance?: number;
  };
}

export interface Species {
  name: string;
  pct: number; // current percentage 0 to 100
  color: string;
  dotColor: string;
  locked: boolean;
  requirementsText: string;
}
