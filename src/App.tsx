/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { 
  BuildingType, 
  ActionCard, 
  TileData, 
  GameStats, 
  ResearchNode, 
  Quest, 
  Species, 
  TerrainType,
  ClimateEvent,
  ClimateEventChoice
} from './types';
import {
  BUILDINGS_CATALOG,
  INITIAL_ACTION_CARDS,
  RESEARCH_TECH_TREE,
  BIOTOP_SPECIES,
  CLIMATE_EVENTS_DATA,
  STAKEHOLDER_QUESTS_DATA,
  TUTORIAL_STEPS,
  FACTORY_MODES,
  getEffectiveCost,
  rotateActionCard
} from './gameData';
import { GameEndScreen } from './components/GameEndScreen';
import { IsometricMap } from './components/IsometricMap';
import { ResearchPanel } from './components/ResearchPanel';
import { SpeciesTracker } from './components/SpeciesTracker';
import { SchoellershammerConsole } from './components/SchoellershammerConsole';
import { BuildCatalog } from './components/BuildCatalog';
import { EventModal } from './components/EventModal';
import { Undo, HelpCircle, BarChart3, MapPin, Crown, Lightbulb, ArrowRight } from 'lucide-react';
import { GameFeedbackOverlay, GameNotification, GameNotificationDetail } from './components/GameFeedbackOverlay';

const COLS = 16;
const ROWS = 16;

const SEASONS = ['FRÜHJAHR', 'SOMMER', 'HERBST', 'WINTER'];

export default function App() {
  // ── States ──
  const [grid, setGrid] = useState<TileData[][]>([]);
  const [stats, setStats] = useState<GameStats>({
    round: 1,
    year: 2026,
    season: 0,
    budget: 25,
    researchPoints: 3,
    naturePoints: 0,
    globalWrrl: 42,
    globalFfh: 61,
    continuity: 12,
    climateRisk: 35,
    citizenAcceptance: 73,
    biosecurity: 62,
    renewableEnergy: 8,
    co2Footprint: 142,
    paperFactoryMode: 'Vollbetrieb',
    factoryCooldown: 0,
    gamePhase: 'playing',
  });

  const [cards, setCards] = useState<ActionCard[]>(INITIAL_ACTION_CARDS);
  const [selectedCardId, setSelectedCardId] = useState<string | null>(null);
  const [selectedCoord, setSelectedCoord] = useState<{ gx: number; gy: number } | null>({ gx: 10, gy: 8 });
  
  const [researchNodes, setResearchNodes] = useState<ResearchNode[]>(RESEARCH_TECH_TREE);
  const [speciesList, setSpeciesList] = useState<Species[]>(BIOTOP_SPECIES);
  const [quests, setQuests] = useState<Quest[]>(STAKEHOLDER_QUESTS_DATA);
  const [activeOverlay, setActiveOverlay] = useState<'none' | 'wrrl' | 'ffh' | 'flood'>('none');

  const [selectedBuilding, setSelectedBuilding] = useState<BuildingType | null>(null);

  // Undo Cache Stack
  const [undoHistory, setUndoHistory] = useState<{
    stats: GameStats;
    grid: TileData[][];
    cards: ActionCard[];
    researchNodes: ResearchNode[];
    speciesList: Species[];
    quests: Quest[];
  }[]>([]);

  // Modals / Overlays
  const [activeEvent, setActiveEvent] = useState<ClimateEvent | null>(null);
  const [showTutorial, setShowTutorial] = useState(true);
  const [pendingFeedback, setPendingFeedback] = useState<GameNotification | null>(null);
  const [stagedAction, setStagedAction] = useState<{
    type: 'play_card' | 'build_direct';
    payload: any;
  } | null>(null);
  const [tutorialStep, setTutorialStep] = useState(0);
  const [showReport, setShowReport] = useState(false);
  const [generalRulesOpen, setGeneralRulesOpen] = useState(false);
  const [isInspectionOpen, setIsInspectionOpen] = useState(true);
  const [isQuestsOpen, setIsQuestsOpen] = useState(true);
  const [isHeaderExpanded, setIsHeaderExpanded] = useState(false);

  // ── River mapping ──
  // Determines exact winding path of the Rur flussabwärts (y=0 is north, y=15 is south)
  const getRiverCenter = (y: number) => {
    return 3.5 + (y / 15) * 5.6 + Math.sin(y * 0.7 + 0.5) * 0.55;
  };

  // ── Grid Initializer ──
  const initGrid = () => {
    const tempGrid: TileData[][] = [];
    
    for (let y = 0; y < ROWS; y++) {
      tempGrid[y] = [];
      const rc = getRiverCenter(y);

      for (let x = 0; x < COLS; x++) {
        const dist = Math.abs(x - rc);
        let terrain: TerrainType = 'Wiese';
        let baseTerrain: TerrainType = 'Wiese';

        // Map terrain bands
        if (dist < 0.95 || (y >= 13 && dist < 1.5)) {
          terrain = 'Water';
          baseTerrain = 'Water';
        } else if (dist < 1.8) {
          terrain = 'Auwald';
          baseTerrain = 'Auwald';
        } else if (y >= 5 && y <= 10) {
          // Düren segment is highly industrial
          terrain = Math.random() < 0.18 ? 'Gewerbe' : 'Wiese';
          baseTerrain = terrain;
        } else if (y < 5) {
          // Jülich is intensive farming
          terrain = Math.random() < 0.35 ? 'Acker' : Math.random() < 0.08 ? 'Siedlung' : 'Wiese';
          baseTerrain = terrain;
        } else {
          // Eifel is forests & wilderness
          terrain = Math.random() < 0.15 ? 'Auwald' : 'Wiese';
          baseTerrain = terrain;
        }

        // Initialize tile metrics
        let wrrl = 2.2 + Math.random() * 2.5; // ranges 1.0 to 5.0
        if (terrain === 'Water') {
          // River quality is better near the Eifel source, worse down in Jülich
          wrrl = y < 5 ? 4.1 : y < 11 ? 3.5 : 1.9;
        }
        const ffh = Math.round(18 + Math.random() * 64);
        const flood: 'Niedrig' | 'Mittel' | 'Hoch' = terrain === 'Water' ? 'Hoch' : dist < 2.5 ? 'Mittel' : 'Niedrig';

        tempGrid[y][x] = {
          x,
          y,
          terrain,
          baseTerrain,
          wrrl_quality: wrrl,
          ffh_value: ffh,
          flood_risk: flood,
          moisture: terrain === 'Water' ? 100 : Math.round(30 + Math.random() * 50),
          biodiversity: terrain === 'Auwald' ? 85 : terrain === 'Siedlung' || terrain === 'Gewerbe' ? 20 : 50,
          buildingId: null,
          cityName: null,
          hasRiverConnection: terrain === 'Water' || dist < 1.3
        };
      }
    }

    // Place preplaced cities
    tempGrid[14][12].cityName = 'Heimbach';
    tempGrid[12][4].cityName = 'Kreuzau';
    tempGrid[8][10].cityName = 'Düren Zentrum';
    tempGrid[4][9].cityName = 'Jülich';
    tempGrid[1][2].cityName = 'Linnich';

    // Place preplaced factory
    tempGrid[8][3].terrain = 'Gewerbe';
    tempGrid[8][3].buildingId = 'factory';
    tempGrid[8][3].cityName = 'Schoellershammer';

    setGrid(tempGrid);
  };

  useEffect(() => {
    initGrid();
  }, []);

  // Recalculates stats whenever grid changes
  useEffect(() => {
    if (grid.length === 0) return;

    let totalWaterTiles = 0;
    let sumWaterWrrl = 0;
    let totalTiles = 0;
    let sumFfh = 0;
    let totalForests = 0;

    for (let y = 0; y < ROWS; y++) {
      for (let x = 0; x < COLS; x++) {
        const cell = grid[y][x];
        totalTiles++;
        sumFfh += cell.ffh_value;

        if (cell.terrain === 'Water') {
          totalWaterTiles++;
          sumWaterWrrl += cell.wrrl_quality;
        }

        if (cell.terrain === 'Auwald' || cell.buildingId === 'auenwald') {
          totalForests++;
        }
      }
    }

    // Translate water quality average to global performance percentage
    const avgWrrl = sumWaterWrrl / totalWaterTiles; // ranges ~1.0 to 5.0
    const globalWrrlPerc = Math.max(0, Math.min(100, Math.round(100 - (avgWrrl - 1) * 25)));

    const avgFfh = Math.round(sumFfh / totalTiles);

    // Calculate river continuity based on fish passes & sohlgleiten built
    let countHydrologyMeasures = 0;
    for (let y = 0; y < ROWS; y++) {
      for (let x = 0; x < COLS; x++) {
        const cell = grid[y][x];
        if (cell.buildingId === 'fischpass' || cell.buildingId === 'sohlgleite' || cell.buildingId === 'altarm') {
          countHydrologyMeasures++;
        }
      }
    }
    const currentContinuity = Math.max(12, Math.min(100, 12 + countHydrologyMeasures * 14));

    // Update species populations based on biotope goals
    const updatedSpecies = speciesList.map(sp => {
      let pct = sp.pct;
      
      if (sp.name.includes('Bachforelle')) {
        // Boosted by Gravel Kieslaichbett & water quality of Upper segment
        const upperWaterCells = [grid[12]?.[8], grid[13]?.[9], grid[14]?.[8]].filter(Boolean);
        const avgUpperWrrl = upperWaterCells.reduce((acc, c) => acc + c.wrrl_quality, 0) / (upperWaterCells.length || 1);
        const wrrlCheck = avgUpperWrrl < 2.5;
        
        let countKiesbett = 0;
        grid.forEach(row => row.forEach(c => {
          if (c.buildingId === 'kiesbett') countKiesbett++;
        }));

        pct = Math.min(100, Math.max(10, 45 + (wrrlCheck ? 15 : -5) + countKiesbett * 10));
      }

      if (sp.name.includes('Biber')) {
        // Boosted by Auenwald count (>3) and Biber protector station
        let countForest = totalForests;
        let countBiberStation = 0;
        grid.forEach(row => row.forEach(c => {
          if (c.buildingId === 'biber_station') countBiberStation++;
        }));

        const isBiberManagementUnlocks = researchNodes.find(n => n.id === 'biber_management')?.unlocked;

        pct = Math.min(100, Math.max(5, 30 + (countForest >= 5 ? 15 : 0) + countBiberStation * 20 + (isBiberManagementUnlocks ? 10 : 0)));
      }

      if (sp.name.includes('Feuerfalter')) {
        // Boosted by Insektenhotel and extensive pastures
        let countHotels = 0;
        let countWeide = 0;
        grid.forEach(row => row.forEach(c => {
          if (c.buildingId === 'insektenhotel') countHotels++;
          if (c.buildingId === 'extensive_weide') countWeide++;
        }));

        pct = Math.min(100, Math.max(5, 20 + countHotels * 15 + countWeide * 12));
      }

      if (sp.name.includes('Eisvogel')) {
        // Boosted by Nisthilfen and Uferentfesselungen
        let countNisthilfe = 0;
        let countEntfesselung = 0;
        grid.forEach(row => row.forEach(c => {
          if (c.buildingId === 'eisvogel_nist') countNisthilfe++;
          if (c.buildingId === 'ufer_entfesselung') countEntfesselung++;
        }));

        pct = Math.min(100, Math.max(10, 55 + countNisthilfe * 15 + countEntfesselung * 10));
      }

      if (sp.name.includes('Lachs')) {
        // Unlock if continuity >= 60% & Zuchtstation built & factory transformed/modernized
        const zuchtBuilt = grid.some(row => row.some(c => c.buildingId === 'lachs_zucht'));
        const lachsForschung = researchNodes.find(n => n.id === 'lachs_nrw')?.unlocked;
        const acceptableFactory = stats.paperFactoryMode !== 'Vollbetrieb';

        const satisfiesLocked = currentContinuity >= 60 && zuchtBuilt && acceptableFactory && lachsForschung;
        
        pct = satisfiesLocked
          ? Math.min(100, Math.max(5, 10 + (currentContinuity - 60) * 1.5 + (stats.paperFactoryMode === 'Renaturierung' ? 25 : 0)))
          : 2; // stays locked at 2% if criteria not met
      }

      return {
        ...sp,
        pct,
        locked: sp.name.includes('Lachs') ? (currentContinuity < 60 || !grid.some(row => row.some(c => c.buildingId === 'lachs_zucht'))) : false,
      };
    });

    setSpeciesList(updatedSpecies);

    // Compute nature points from restoration benchmarks
    let computedNaturePoints = Math.round((globalWrrlPerc * 1.2) + (avgFfh * 1.5) + (currentContinuity * 0.8));
    
    setStats(prev => ({
      ...prev,
      globalWrrl: globalWrrlPerc,
      globalFfh: avgFfh,
      continuity: currentContinuity,
      naturePoints: computedNaturePoints
    }));

    // Check Quests triggers
    const updatedQuests = quests.map(q => {
      if (q.status === 'completed') return q;

      let met = false;
      if (q.id === 'quest_schoellershammer') {
        met = stats.paperFactoryMode !== 'Vollbetrieb';
      } else if (q.requiredBuildingId) {
        met = grid.some(row => row.some(c => c.buildingId === q.requiredBuildingId));
      }

      if (met) {
        // Apply rewards
        setStats(prev => ({
          ...prev,
          budget: prev.budget + (q.reward.budget || 0),
          researchPoints: prev.researchPoints + (q.reward.research || 0),
          citizenAcceptance: Math.min(100, prev.citizenAcceptance + (q.reward.acceptance || 0)),
          naturePoints: prev.naturePoints + (q.reward.nature || 0)
        }));

        return { ...q, status: 'completed' as const };
      }

      return q;
    });

    // Check if any quest actually toggled to completed, if so execute state save
    const hasChange = updatedQuests.some((q, i) => q.status !== quests[i].status);
    if (hasChange) {
      setQuests(updatedQuests);
    }
  }, [grid, stats.paperFactoryMode]);

  // ── Save Current State to Undo Cache ──
  const recordUndo = (currentGrid = grid, currentCards = cards, currentStats = stats, currentNodes = researchNodes, currentSpecies = speciesList, currentQuests = quests) => {
    setUndoHistory(prev => [
      ...prev,
      {
        stats: { ...currentStats },
        grid: JSON.parse(JSON.stringify(currentGrid)),
        cards: JSON.parse(JSON.stringify(currentCards)),
        researchNodes: JSON.parse(JSON.stringify(currentNodes)),
        speciesList: JSON.parse(JSON.stringify(currentSpecies)),
        quests: JSON.parse(JSON.stringify(currentQuests))
      }
    ]);
  };

  const handleUndo = () => {
    if (undoHistory.length === 0) return;
    const previous = undoHistory[undoHistory.length - 1];
    
    setStats(previous.stats);
    setGrid(previous.grid);
    setCards(previous.cards);
    setResearchNodes(previous.researchNodes);
    setSpeciesList(previous.speciesList);
    setQuests(previous.quests);
    setSelectedBuilding(null);

    setUndoHistory(prev => prev.slice(0, -1));
  };


  // ── Arche Nova Action Cards Slide Handler ──
  const handlePlayCard = (cardId: string) => {
    const card = cards.find(c => c.id === cardId);
    if (!card) return;

    if (card.type === 'BUILD') {
      setSelectedCardId(cardId);
      setSelectedBuilding(null);
      return;
    }

    const strength = card.strength;

    if (card.type === 'FUNDING') {
      const reward = Math.round(4 + strength * 2.5);
      setStagedAction({
        type: 'play_card',
        payload: { cardId, reward, type: 'FUNDING' }
      });
      setPendingFeedback({
        type: 'card',
        title: 'Finanzierung freigeben?',
        subtitle: `Aktionskarte "${card.name}" ausspielen? (Stärke ${strength})`,
        icon: card.emoji || '💶',
        badgeText: 'AKTIONSCARD BESTÄTIGEN',
        requiresConfirmation: true,
        details: [
          { label: 'Erwartetes Budget erhalten', value: `+${reward} €`, changeType: 'positive' }
        ],
        flavorText: 'Über Fördertöpfe der Europäischen Union und des Landes NRW fließen finanzielle Mittel in dein Projektbudget.'
      });
    } else if (card.type === 'RESEARCH') {
      const reward = Math.ceil(strength / 1.5);
      setStagedAction({
        type: 'play_card',
        payload: { cardId, reward, type: 'RESEARCH' }
      });
      setPendingFeedback({
        type: 'card',
        title: 'Forschungskampagne starten?',
        subtitle: `Aktionskarte "${card.name}" ausspielen? (Stärke ${strength})`,
        icon: card.emoji || '🧪',
        badgeText: 'AKTIONSCARD BESTÄTIGEN',
        requiresConfirmation: true,
        details: [
          { label: 'Erwartete Forschungspunkte', value: `+${reward} 🧪`, changeType: 'positive' }
        ],
        flavorText: 'Bürgerwissenschaftler und Institute erfassen wichtige Daten an der Rur zur Optimierung von Renaturierungsansätzen.'
      });
    }
  };


  // ── Execute Constructing / Building Measure on Map (Unified API for both direct click and button trigger) ──
  const handleBuildDirectly = (gx: number, gy: number, building: BuildingType): boolean => {
    const cell = grid[gy]?.[gx];
    if (!cell) return false;

    // Terrain eligibility check via allowedTerrain whitelist
    if (building.allowedTerrain && !building.allowedTerrain.includes(cell.terrain)) {
      alert(`"${building.name}" kann nicht auf ${cell.terrain}-Terrain platziert werden!\nErlaubt: ${building.allowedTerrain.join(', ')}`);
      return false;
    }

    if (cell.buildingId) {
      alert('Diese Kachel besitzt bereits eine Schutzmaßnahme! Beseitige diese zuerst.');
      return false;
    }

    // Deduct cost taking strength discount + research discounts into account
    const buildCard = cards.find(c => c.id === 'act_build');
    const strength = buildCard?.strength || 1;
    const finalCost = getEffectiveCost(building, strength, researchNodes);

    if (stats.budget < finalCost) {
      alert('Budget ungenügend!');
      return false;
    }

    // Logistics / Rurtalbahn discount checks: if near a rurtalbahn_halt, return 1€ cashback
    let applyLogisticsCashback = false;
    for (let dy = -1; dy <= 1; dy++) {
      for (let dx = -1; dx <= 1; dx++) {
        const neighbor = grid[gy + dy]?.[gx + dx];
        if (neighbor && neighbor.buildingId === 'rurtalbahn_halt') {
          applyLogisticsCashback = true;
        }
      }
    }

    const buildDetails: GameNotificationDetail[] = [
      { label: 'Erwartete Investition', value: `-${finalCost} €`, changeType: 'negative' }
    ];
    if (applyLogisticsCashback) {
      buildDetails.push({ label: 'Rurtalbahn-Rabatt', value: '+1 €', changeType: 'positive' });
    }
    if (building.category === 'ecology') {
      buildDetails.push({ label: 'Erwartete Biodiversität (FFH)', value: '+15 Punkte', changeType: 'positive' });
      if (cell.hasRiverConnection) {
        buildDetails.push({ label: 'Gewässer-Güte (WRRL)', value: '+0.8 Punkte', changeType: 'positive' });
      }
    } else if (building.category === 'water') {
      buildDetails.push({ label: 'Gewässer-Güte (WRRL)', value: '+1.2 Punkte', changeType: 'positive' });
    } else if (building.id === 'auenwald') {
      buildDetails.push({ label: 'Biotop-Struktur', value: 'Renaturierung zu Auwald 🌲', changeType: 'neutral' });
    }

    setStagedAction({
      type: 'build_direct',
      payload: { gx, gy, buildingId: building.id }
    });

    setPendingFeedback({
      type: 'build',
      title: 'Maßnahme errichten?',
      subtitle: `Möchtest du "${building.name}" auf Kachel (${gx}, ${gy}) errichten?`,
      icon: building.icon || '🏗️',
      badgeText: 'BAUPROJEKT BESTÄTIGEN',
      requiresConfirmation: true,
      details: buildDetails,
      flavorText: building.description || building.effect
    });

    return true;
  };

  const handleBuildMeasureOnSelected = () => {
    if (!selectedCoord || !selectedBuilding) return;
    handleBuildDirectly(selectedCoord.gx, selectedCoord.gy, selectedBuilding);
  };

  const handleConfirmStagedAction = () => {
    if (!stagedAction) return;

    recordUndo();

    if (stagedAction.type === 'play_card') {
      const { cardId, reward, type } = stagedAction.payload;
      const card = cards.find(c => c.id === cardId);
      if (!card) return;

      const strength = card.strength;

      // Apply effects
      if (type === 'FUNDING') {
        setStats(prev => ({
          ...prev,
          budget: prev.budget + reward
        }));
      } else if (type === 'RESEARCH') {
        setStats(prev => ({
          ...prev,
          researchPoints: prev.researchPoints + reward
        }));
      }

      // Card sliding sequence (Arche Nova rule via rotateActionCard helper)
      const updatedCards = rotateActionCard(cards, cardId);
      setCards(updatedCards);
      setSelectedCardId(cardId);
      setSelectedBuilding(null);

      // Trigger post-confirm success announcement
      setPendingFeedback({
        type: 'card',
        title: type === 'FUNDING' ? 'Finanzierung verbucht!' : 'Kampagne gestartet!',
        subtitle: `Erfolgreich ausgespielt mit Stärke ${strength}`,
        icon: type === 'FUNDING' ? '💶' : '🧪',
        badgeText: 'ERFOLG',
        details: [
          { 
            label: type === 'FUNDING' ? 'Budget erhalten' : 'Forschungspunkte erhalten', 
            value: type === 'FUNDING' ? `+${reward} €` : `+${reward} 🧪`, 
            changeType: 'positive' 
          }
        ],
        flavorText: type === 'FUNDING' 
          ? 'Das europäische und regionale Fördergeld wurde deinem Budget gutgeschrieben.'
          : 'Die Felduntersuchungen der Institute an der Rur laufen planmäßig an.'
      });

    } else if (stagedAction.type === 'build_direct') {
      const { gx, gy, buildingId } = stagedAction.payload;
      const building = BUILDINGS_CATALOG.find(b => b.id === buildingId);
      if (!building) return;

      const cell = grid[gy]?.[gx];
      if (!cell) return;

      // Deduct budget taking strength + research discounts into account
      const buildCard = cards.find(c => c.id === 'act_build');
      const strength = buildCard?.strength || 1;
      const finalCost = getEffectiveCost(building, strength, researchNodes);

      // Apply build to grid
      const updatedGrid = JSON.parse(JSON.stringify(grid)) as TileData[][];
      const targetCell = updatedGrid[gy][gx];
      targetCell.buildingId = building.id;

      if (building.category === 'ecology') {
        targetCell.ffh_value = Math.min(100, targetCell.ffh_value + 15);
        if (targetCell.hasRiverConnection) {
          targetCell.wrrl_quality = Math.max(1.0, targetCell.wrrl_quality - 0.8);
        }
      } else if (building.category === 'water') {
        targetCell.wrrl_quality = Math.max(1.0, targetCell.wrrl_quality - 1.2);
      } else if (building.id === 'auenwald') {
        targetCell.terrain = 'Auwald';
      }

      // Logistics / Rurtalbahn discount checks: if near a rurtalbahn_halt, return 1€ cashback
      let applyLogisticsCashback = false;
      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          const neighbor = grid[gy + dy]?.[gx + dx];
          if (neighbor && neighbor.buildingId === 'rurtalbahn_halt') {
            applyLogisticsCashback = true;
          }
        }
      }

      setGrid(updatedGrid);
      setStats(prev => ({
        ...prev,
        budget: prev.budget - finalCost + (applyLogisticsCashback ? 1 : 0),
      }));

      // Slide sequence for BUILD card (Arche Nova rules via rotateActionCard helper)
      if (buildCard) {
        setCards(rotateActionCard(cards, 'act_build'));
      }

      const buildDetailsConfirmed: GameNotificationDetail[] = [
        { label: 'Investitionssumme', value: `-${finalCost} €`, changeType: 'negative' }
      ];
      if (applyLogisticsCashback) {
        buildDetailsConfirmed.push({ label: 'Rurtalbahn-Rabatt', value: '+1 €', changeType: 'positive' });
      }
      if (building.category === 'ecology') {
        buildDetailsConfirmed.push({ label: 'Flora-Fauna-Habitat (FFH)', value: '+15 Punkte', changeType: 'positive' });
        if (targetCell.hasRiverConnection) {
          buildDetailsConfirmed.push({ label: 'Gewässer-Güte (WRRL)', value: '+0.8 Punkte', changeType: 'positive' });
        }
      } else if (building.category === 'water') {
        buildDetailsConfirmed.push({ label: 'Gewässer-Güte (WRRL)', value: '+1.2 Punkte', changeType: 'positive' });
      } else if (building.id === 'auenwald') {
        buildDetailsConfirmed.push({ label: 'Biotop-Struktur', value: 'Renaturiert zu Auwald 🌲', changeType: 'neutral' });
      }

      setPendingFeedback({
        type: 'build',
        title: 'Maßnahme erfolgreich errichtet!',
        subtitle: `${building.name} im Rurtal etabliert`,
        icon: building.icon || '🏗️',
        badgeText: 'BAUMASSNAHME ERFOLG',
        details: buildDetailsConfirmed,
        flavorText: building.description || building.effect
      });

      setSelectedBuilding(null);
      setSelectedCardId(null);
    }

    setStagedAction(null);
  };

  const handleCancelStagedAction = () => {
    setStagedAction(null);
    setPendingFeedback(null);
  };


  // ── Factory Mode Selection ──
  const handleFactoryModeChange = (mode: 'Vollbetrieb' | 'Umrüstung' | 'Stilllegung' | 'Renaturierung') => {
    // Guard: cooldown active?
    if (stats.factoryCooldown > 0) {
      alert(`Umrüstung gesperrt – noch ${stats.factoryCooldown} Runde(n) Abkühlzeit.`);
      return;
    }
    recordUndo();

    const modeDef = FACTORY_MODES[mode];

    setStats(prev => ({
      ...prev,
      paperFactoryMode: mode,
      budget: Math.max(0, prev.budget - modeDef.switchCost),
      citizenAcceptance: Math.min(100, Math.max(0, prev.citizenAcceptance + modeDef.acceptanceBonus)),
      factoryCooldown: modeDef.cooldownRounds,
    }));

    const detailsList: GameNotificationDetail[] = [];
    if (modeDef.switchCost > 0) {
      detailsList.push({ label: 'Einmalige Umrüstungskosten', value: `-${modeDef.switchCost} €`, changeType: 'negative' });
    }
    detailsList.push({
      label: 'Bürgerakzeptanz',
      value: modeDef.acceptanceBonus >= 0 ? `+${modeDef.acceptanceBonus}%` : `${modeDef.acceptanceBonus}%`,
      changeType: modeDef.acceptanceBonus >= 0 ? 'positive' : 'negative'
    });
    if (modeDef.cooldownRounds > 0) {
      detailsList.push({ label: 'Abkühlzeit', value: `${modeDef.cooldownRounds} Runde(n)`, changeType: 'neutral' });
    }

    setPendingFeedback({
      type: 'mode',
      title: `Werk Schoellershammer umgestellt!`,
      subtitle: `Status: ${modeDef.label} ${modeDef.icon}`,
      icon: modeDef.icon,
      badgeText: 'WERKSMANAGEMENT',
      details: [
        ...detailsList,
        { label: 'Rundeneffekt', value: modeDef.description, changeType: 'neutral' }
      ],
      flavorText: modeDef.flavor
    });
  };


  // ── Research Node Unlock ──
  const handleUnlockResearch = (id: string) => {
    const node = researchNodes.find(n => n.id === id);
    if (!node || node.unlocked || stats.researchPoints < node.cost) return;

    recordUndo();

    const updatedNodes = researchNodes.map(n => {
      if (n.id === id) {
        return {
          ...n,
          unlocked: true,
          progress: 100
        };
      }
      return n;
    });

    setResearchNodes(updatedNodes);
    setStats(prev => {
      // Energiewende or other research effects
      let renewAdd = 0;
      if (id === 'green_energy_tech') renewAdd = 15;

      return {
        ...prev,
        researchPoints: prev.researchPoints - node.cost,
        renewableEnergy: prev.renewableEnergy + renewAdd
      };
    });

    const techDetails: GameNotificationDetail[] = [
      { label: 'Investierte Forschung', value: `-${node.cost} 🧪`, changeType: 'negative' }
    ];
    if (id === 'green_energy_tech') {
      techDetails.push({ label: 'Erneuerbare Energien', value: `+15%`, changeType: 'positive' });
    }

    setPendingFeedback({
      type: 'research',
      title: 'Forschungszweig freigeschaltet!',
      subtitle: `Technologie "${node.name}" erforscht`,
      icon: '🧪',
      badgeText: 'WISSENSCHAFT',
      details: techDetails,
      flavorText: node.effect
    });
  };


  // ── Turn Change Loop (Season increment, budgets, climate storms trigger) ──
  const handleEndTurn = () => {
    recordUndo();

    // Advance turn stats
    const nextSeason = (stats.season + 1) % 4;
    const nextYear = nextSeason === 0 ? stats.year + 1 : stats.year;
    const nextRound = stats.round + 1;

    // 1. Calculate turn earnings (using FACTORY_MODES data)
    const currentModeDef = FACTORY_MODES[stats.paperFactoryMode];
    let roundIncome = 10 + currentModeDef.roundIncome; // BASE income + factory contribution

    // Add extra tourism earnings based on built properties
    let countTourism = 0;
    grid.forEach(row => row.forEach(c => {
      if (c.buildingId === 'oeko_tourismus' || c.buildingId === 'campingplatz' || c.buildingId === 'kanuverleih') {
        countTourism += 1;
      }
      if (c.buildingId === 'besucherzentrum') {
        countTourism += 2;
      }
    }));
    roundIncome += countTourism;

    // 2. Local WRRL damage or repair based on factory mode (from FACTORY_MODES)
    const updatedGrid = JSON.parse(JSON.stringify(grid)) as TileData[][];

    // Düren Mittellauf wrrl changes
    if (currentModeDef.wrrlEffectPerTurn !== 0) {
      for (let x = 0; x < COLS; x++) {
        const cell = updatedGrid[8][x];
        if (cell.terrain === 'Water') {
          cell.wrrl_quality = Math.min(5.0, Math.max(1.0, cell.wrrl_quality + currentModeDef.wrrlEffectPerTurn));
        }
      }
    }

    // 3. Environmental CO₂ and Climate vulnerability calculation
    let currentCO2 = 142;
    // Each Solarpark, windkraft, auenwald decreases CO2 impact
    let cleanEnergyCount = 0;
    grid.forEach(row => row.forEach(c => {
      if (c.buildingId === 'solarpark') cleanEnergyCount += 1;
      if (c.buildingId === 'windkraft') cleanEnergyCount += 1.5;
      if (c.terrain === 'Auwald') cleanEnergyCount += 0.25;
    }));

    currentCO2 = Math.max(30, 142 - Math.round(cleanEnergyCount * 8));

    // Climate risks grow based on global levels, unless dampened by research or retention areas
    let countRetention = 0;
    grid.forEach(row => row.forEach(c => {
      if (c.buildingId === 'polder') countRetention += 1;
    }));

    const isAuenVitalisierungUnlocked = researchNodes.find(n => n.id === 'auen_vitalisierung')?.unlocked;
    const isDürenerconcept = researchNodes.find(n => n.id === 'green_energy_tech')?.unlocked;

    const riskDamping = countRetention * 15 + (isAuenVitalisierungUnlocked ? 10 : 0);
    const rawRisk = Math.max(5, 35 + (stats.year - 2026) * 6 - riskDamping);

    // NIMBY effect starting 2027 if citizen acceptability is lower than threshold
    let nimbyFee = 0;
    if (nextYear > 2026 && stats.citizenAcceptance < 40) {
      nimbyFee = 2; // Protest surcharge fee
    }

    // Let game grid persist state
    setGrid(updatedGrid);

    // Apply stats changes
    setStats(prev => ({
      ...prev,
      season: nextSeason,
      year: nextYear,
      round: nextRound,
      budget: Math.max(0, prev.budget + roundIncome - nimbyFee),
      researchPoints: prev.researchPoints + currentModeDef.researchPerRound,
      climateRisk: Math.min(100, Math.round(rawRisk)),
      co2Footprint: currentCO2,
      factoryCooldown: Math.max(0, prev.factoryCooldown - 1),
      // Check win/collapse conditions at year end
      gamePhase: nextYear >= 2041
        ? (prev.globalWrrl >= 65 && prev.citizenAcceptance >= 55 ? 'end_win' : 'end_collapse')
        : prev.gamePhase,
    }));

    // Trigger seasonal report popup
    const seasonIcons = ['🌸', '☀️', '🍂', '❄️'];
    const currentSeasonIcon = seasonIcons[stats.season];
    
    const seasonDetailsColors: GameNotificationDetail[] = [
      { label: 'Einnahmen Basis', value: '+10 €', changeType: 'positive' }
    ];
    if (currentModeDef.roundIncome !== 0) {
      seasonDetailsColors.push({
        label: `Schoellershammer (${currentModeDef.label})`,
        value: currentModeDef.roundIncome > 0 ? `+${currentModeDef.roundIncome} €` : `${currentModeDef.roundIncome} €`,
        changeType: currentModeDef.roundIncome > 0 ? 'positive' : 'negative'
      });
    }

    if (countTourism > 0) {
      seasonDetailsColors.push({ label: 'Naherholung & Tourismus', value: `+${countTourism} €`, changeType: 'positive' });
    }

    if (nimbyFee > 0) {
      seasonDetailsColors.push({ label: 'NIMBY-Protestgebühr', value: `-${nimbyFee} €`, changeType: 'negative' });
    }

    seasonDetailsColors.push({ label: 'Netto-Quartalsbudget', value: `+${roundIncome - nimbyFee} €`, changeType: 'positive' });

    if (currentModeDef.researchPerRound > 0) {
      seasonDetailsColors.push({ label: 'Forschungsdirektive', value: `+${currentModeDef.researchPerRound} 🧪`, changeType: 'positive' });
    }

    seasonDetailsColors.push({ label: 'CO₂-Ausstoß', value: `${currentCO2}t`, changeType: currentCO2 < 100 ? 'positive' : 'negative' });
    seasonDetailsColors.push({ label: 'Erwartetes Klimarisiko', value: `${Math.round(rawRisk)}%`, changeType: rawRisk < 45 ? 'positive' : 'neutral' });

    setPendingFeedback({
      type: 'season',
      title: 'Quartal abgeschlossen!',
      subtitle: `${SEASONS[stats.season]} ${stats.year} erfolgreich beendet`,
      icon: currentSeasonIcon,
      badgeText: `BERICHT RUNDE ${stats.round}`,
      details: seasonDetailsColors,
      flavorText: 'Die Natur an der Rur atmet auf. Plane deine verbleibenden Aktionskarten im Ribbon-Band mit Bedacht!'
    });

    // Trigger random event (35% probability or high risk threshold)
    if (Math.random() < 0.4 || rawRisk > 55) {
      const unusedEvents = CLIMATE_EVENTS_DATA;
      const index = Math.floor(Math.random() * unusedEvents.length);
      setActiveEvent(unusedEvents[index]);
    }
  };


  // ── Handle Climate Event Choice ──
  const handleResolveEvent = (choice: ClimateEventChoice) => {
    if (!activeEvent) return;

    recordUndo();

    setStats(prev => ({
      ...prev,
      budget: Math.max(0, prev.budget + (choice.effect.budgetChange || 0)),
      researchPoints: Math.max(0, prev.researchPoints + (choice.effect.researchChange || 0)),
      naturePoints: Math.max(0, prev.naturePoints + (choice.effect.natureChange || 0)),
      citizenAcceptance: Math.min(100, Math.max(0, prev.citizenAcceptance + (choice.effect.acceptanceChange || 0))),
      ffh_value: Math.min(100, prev.globalFfh + (choice.effect.ffhChange || 0)),
      climateRisk: Math.min(100, Math.max(0, prev.climateRisk + (choice.effect.riskChange || 0))),
    }));

    setActiveEvent(null);
  };

  // Status categories helpers
  const getAcceptanceLabel = (acc: number) => {
    if (acc >= 75) return { text: 'Enthusiastisch', style: 'text-eco-primary bg-eco-primary/10 border-eco-primary/30' };
    if (acc >= 45) return { text: 'Kooperativ', style: 'text-ink-1 bg-parch-2 border-parch-4/50' };
    return { text: 'Widerständig (⚠️ NIMBY)', style: 'text-red-400 bg-red-900/25 border-red-700/40 animate-pulse' };
  };

  const getCO2Rating = (tons: number) => {
    if (tons < 60) return { text: 'Exzellent (Kompensiert)', style: 'text-eco-primary font-bold' };
    if (tons < 110) return { text: 'Moderat', style: 'text-ink-1' };
    return { text: 'Kritisch (Treibhaus)', style: 'text-red-400 font-bold' };
  };

  const isLachsRenaturierungUnlocked = researchNodes.find(n => n.id === 'schoeller_renat')?.unlocked;
  const activeBuildCard = cards.find(c => c.id === 'act_build');
  const selectedTile = selectedCoord ? grid[selectedCoord.gy]?.[selectedCoord.gx] : null;

  // ── Navigation & Sheet State ──────────────────────────
  const [activeNavTab, setActiveNavTab] = useState<'simulation' | 'stats' | 'history' | 'build'>('simulation');
  const [buildSheetTab, setBuildSheetTab] = useState<'aktionen' | 'bauen'>('aktionen');
  const [sheetExpanded, setSheetExpanded] = useState(false);

  // ── Derived helpers ──────────────────────────────────
  const wrrlLabel = stats.globalWrrl >= 70 ? 'EXC' : stats.globalWrrl >= 45 ? 'OK' : 'LOW';
  const ffhLabel  = stats.globalFfh  >= 70 ? 'EXC' : stats.globalFfh  >= 45 ? 'STB' : 'LOW';

  return (
    <div style={{ position: 'fixed', inset: 0, display: 'flex', flexDirection: 'column', background: '#0d1417', fontFamily: '"Inter", system-ui, sans-serif', overflow: 'hidden' }}>

      {/* ══ TOP HEADER ══ */}
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 16px', background: 'rgba(36,43,46,0.82)', backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)', borderBottom: '1px solid rgba(255,255,255,0.10)', boxShadow: '0 4px 20px rgba(0,0,0,0.28)', flexShrink: 0, zIndex: 30 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span className="material-symbols-outlined" style={{ color: '#9ed1bd', fontSize: 22 }}>eco</span>
          <span style={{ fontFamily: '"Plus Jakarta Sans", sans-serif', fontWeight: 800, fontSize: 18, color: '#9ed1bd', letterSpacing: '-0.02em' }}>RurNova</span>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1 }}>
          <span className="label-caps" style={{ color: '#c0c9c3' }}>RUNDE {stats.round}/40</span>
          <span className="label-caps" style={{ color: '#9ed1bd' }}>{SEASONS[stats.season]} {stats.year}</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <button
            onClick={handleUndo}
            disabled={undoHistory.length === 0}
            style={{ width: 36, height: 36, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', background: undoHistory.length > 0 ? 'rgba(158,209,189,.12)' : 'rgba(255,255,255,.04)', border: '1px solid rgba(255,255,255,.10)', color: undoHistory.length > 0 ? '#9ed1bd' : '#404945', transition: 'all .14s' }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: 18 }}>undo</span>
          </button>
          <div style={{ width: 34, height: 34, borderRadius: '50%', background: 'rgba(158,209,189,.14)', border: '1.5px solid rgba(158,209,189,.35)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <span className="material-symbols-outlined" style={{ fontSize: 20, color: '#9ed1bd' }}>account_circle</span>
          </div>
        </div>
      </header>

      {/* ══ STAT HUD ROW ══ */}
      <div style={{ padding: '8px 12px 0', flexShrink: 0, zIndex: 20 }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
          <div className="stat-card earth">
            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <span className="material-symbols-outlined" style={{ fontSize: 14, color: '#A68966' }}>payments</span>
              <span className="label-caps" style={{ color: '#8a938e' }}>BUDGET</span>
            </div>
            <div className="data-num" style={{ color: '#dde4e7' }}>{stats.budget}€</div>
            <div style={{ fontSize: 10, color: '#A68966', fontFamily: '"JetBrains Mono", monospace' }}>{stats.researchPoints} 🧪</div>
          </div>
          <div className="stat-card eco">
            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <span className="material-symbols-outlined" style={{ fontSize: 14, color: '#76C043' }}>diversity_3</span>
              <span className="label-caps" style={{ color: '#8a938e' }}>BIO</span>
            </div>
            <div className="data-num" style={{ color: '#dde4e7' }}>{stats.globalFfh}%</div>
            <div style={{ fontSize: 10, color: '#76C043', fontFamily: '"JetBrains Mono", monospace' }}>{ffhLabel}</div>
          </div>
          <div className="stat-card water">
            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <span className="material-symbols-outlined" style={{ fontSize: 14, color: '#4EB3D3' }}>water_drop</span>
              <span className="label-caps" style={{ color: '#8a938e' }}>H2O</span>
            </div>
            <div className="data-num" style={{ color: '#dde4e7' }}>{stats.globalWrrl}%</div>
            <div style={{ fontSize: 10, color: '#4EB3D3', fontFamily: '"JetBrains Mono", monospace' }}>{wrrlLabel}</div>
          </div>
        </div>
      </div>

      {/* ══ MAIN AREA ══ */}
      <main style={{ position: 'relative', flex: 1, overflow: 'hidden', minHeight: 0 }}>

        {/* MAP */}
        {activeNavTab === 'simulation' && grid.length > 0 && (
          <IsometricMap
            grid={grid}
            selectedCoord={selectedCoord}
            onSelectTile={(gx, gy) => {
              setSelectedCoord({ gx, gy });
              if (selectedBuilding) {
                handleBuildDirectly(gx, gy, selectedBuilding);
              }
            }}
            activeOverlay={activeOverlay}
          />
        )}

        {/* STATS PANEL */}
        {activeNavTab === 'stats' && (
          <div style={{ height: '100%', overflowY: 'auto', padding: '16px 16px 80px' }} className="dark-scroll animate-fade-in">
            <p style={{ fontFamily: '"Plus Jakarta Sans",sans-serif', fontWeight: 700, fontSize: 16, color: '#dde4e7', marginBottom: 16 }}>Ökologische Indizes</p>
            {[
              { label: 'WRRL Gewässerqualität', value: stats.globalWrrl,         color: '#4EB3D3', icon: 'water_drop' },
              { label: 'FFH Biodiversität',     value: stats.globalFfh,          color: '#76C043', icon: 'diversity_3' },
              { label: 'Durchgängigkeit',       value: stats.continuity,         color: '#9ed1bd', icon: 'swap_vert' },
              { label: 'Klimarisiko',           value: stats.climateRisk,        color: '#ffb4ab', icon: 'thermostat' },
              { label: 'Bürgerakzeptanz',       value: stats.citizenAcceptance,  color: '#A68966', icon: 'people' },
              { label: 'Erneuerbare Energie',   value: stats.renewableEnergy,    color: '#76C043', icon: 'energy_savings_leaf' },
            ].map(m => (
              <div key={m.label} style={{ marginBottom: 14 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span className="material-symbols-outlined" style={{ fontSize: 16, color: m.color }}>{m.icon}</span>
                    <span style={{ fontSize: 12, color: '#c0c9c3' }}>{m.label}</span>
                  </div>
                  <span style={{ fontFamily: '"JetBrains Mono",monospace', fontSize: 13, fontWeight: 600, color: m.color }}>{m.value}%</span>
                </div>
                <div style={{ height: 6, background: 'rgba(255,255,255,.08)', borderRadius: 99, overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: `${m.value}%`, background: m.color, borderRadius: 99, transition: 'width .4s cubic-bezier(.3,.7,.4,1)' }} />
                </div>
              </div>
            ))}
            <div style={{ marginTop: 20, padding: 14, background: 'rgba(47,54,57,.5)', borderRadius: 12, border: '1px solid rgba(255,255,255,.06)' }}>
              <p className="label-caps" style={{ color: '#8a938e', marginBottom: 8 }}>KLIMABILANZ</p>
              <div className="data-num" style={{ color: stats.co2Footprint < 100 ? '#76C043' : '#ffb4ab' }}>{stats.co2Footprint}t CO₂</div>
              <p style={{ fontSize: 11, color: '#8a938e', marginTop: 4 }}>Erneuerbare Anlagen, Auwald & Klärwerk-Upgrades senken den Ausstoß</p>
            </div>
            <div style={{ marginTop: 12, padding: 14, background: 'rgba(47,54,57,.5)', borderRadius: 12, border: '1px solid rgba(255,255,255,.06)' }}>
              <p className="label-caps" style={{ color: '#8a938e', marginBottom: 8 }}>FABRIK SCHOELLERSHAMMER</p>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                <span style={{ fontFamily: '"Plus Jakarta Sans",sans-serif', fontWeight: 700, fontSize: 14, color: '#dde4e7' }}>{stats.paperFactoryMode}</span>
                {stats.factoryCooldown > 0 && (
                  <span className="tag-pill" style={{ color: '#ffb4ab', borderColor: 'rgba(255,180,171,.3)', background: 'rgba(255,180,171,.08)' }}>⏳ {stats.factoryCooldown} Runden</span>
                )}
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                {(['Vollbetrieb','Umrüstung','Stilllegung','Renaturierung'] as const).map(m => (
                  <button
                    key={m}
                    onClick={() => handleFactoryModeChange(m)}
                    style={{ padding: '8px 10px', borderRadius: 10, fontSize: 11, fontWeight: 600, background: stats.paperFactoryMode === m ? 'rgba(158,209,189,.18)' : 'rgba(255,255,255,.04)', border: `1px solid ${stats.paperFactoryMode === m ? 'rgba(158,209,189,.4)' : 'rgba(255,255,255,.08)'}`, color: stats.paperFactoryMode === m ? '#9ed1bd' : '#8a938e', fontFamily: '"Inter",sans-serif', transition: 'all .14s', cursor: 'pointer' }}
                  >{m}</button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* HISTORY / LOG */}
        {activeNavTab === 'history' && (
          <div style={{ height: '100%', overflowY: 'auto', padding: '16px 16px 80px' }} className="dark-scroll animate-fade-in">
            <p style={{ fontFamily: '"Plus Jakarta Sans",sans-serif', fontWeight: 700, fontSize: 16, color: '#dde4e7', marginBottom: 16 }}>Missions & Protokoll</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {quests.map(q => (
                <div key={q.id} style={{ padding: '12px 14px', background: 'rgba(47,54,57,.5)', borderRadius: 12, border: `1px solid ${q.status === 'completed' ? 'rgba(118,192,67,.3)' : 'rgba(255,255,255,.06)'}` }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
                    <span style={{ fontSize: 13, fontWeight: 600, color: '#dde4e7' }}>{q.title}</span>
                    <span className="tag-pill" style={{ flexShrink: 0, color: q.status === 'completed' ? '#76C043' : '#9ed1bd', borderColor: q.status === 'completed' ? 'rgba(118,192,67,.3)' : 'rgba(158,209,189,.25)', background: q.status === 'completed' ? 'rgba(118,192,67,.1)' : 'rgba(158,209,189,.06)' }}>
                      {q.status === 'completed' ? '✓ FERTIG' : 'AKTIV'}
                    </span>
                  </div>
                  <p style={{ fontSize: 12, color: '#8a938e', marginTop: 5, lineHeight: 1.5 }}>{q.description}</p>
                  <p style={{ fontSize: 11, color: '#9ed1bd', marginTop: 4 }}>{q.rewardText}</p>
                </div>
              ))}
              <div style={{ padding: '12px 14px', background: 'rgba(47,54,57,.5)', borderRadius: 12, border: '1px solid rgba(255,255,255,.06)', marginTop: 4 }}>
                <p className="label-caps" style={{ color: '#4EB3D3', marginBottom: 10 }}>BIOTRACK — WIEDERANSIEDLUNG</p>
                {speciesList.map(sp => (
                  <div key={sp.name} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '7px 0', borderBottom: '1px solid rgba(255,255,255,.04)' }}>
                    <div style={{ width: 8, height: 8, borderRadius: '50%', background: sp.dotColor, flexShrink: 0 }} />
                    <span style={{ fontSize: 12, color: sp.locked ? '#404945' : '#c0c9c3', flex: 1 }}>{sp.name.replace(' 🔒', '')}</span>
                    <div style={{ width: 60, height: 4, background: 'rgba(255,255,255,.08)', borderRadius: 2, overflow: 'hidden' }}>
                      <div style={{ height: '100%', width: `${sp.pct}%`, background: sp.locked ? '#404945' : sp.dotColor }} />
                    </div>
                    <span style={{ fontFamily: '"JetBrains Mono",monospace', fontSize: 11, color: sp.locked ? '#404945' : '#9ed1bd', width: 32, textAlign: 'right' }}>{sp.pct}%</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* RESEARCH (Build tab) */}
        {activeNavTab === 'build' && (
          <div style={{ height: '100%', overflowY: 'auto', padding: '16px 16px 80px' }} className="dark-scroll animate-fade-in">
            <p style={{ fontFamily: '"Plus Jakarta Sans",sans-serif', fontWeight: 700, fontSize: 16, color: '#dde4e7', marginBottom: 4 }}>Forschungsbaum</p>
            <p style={{ fontSize: 12, color: '#8a938e', marginBottom: 16 }}>Forschungspunkte: <span style={{ color: '#9ed1bd', fontFamily: '"JetBrains Mono",monospace', fontWeight: 600 }}>{stats.researchPoints} 🧪</span></p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {researchNodes.map(node => {
                const prereqsMet = node.requirements.every(r => researchNodes.find(n => n.id === r)?.unlocked);
                const canUnlock = !node.unlocked && prereqsMet && stats.researchPoints >= node.cost;
                return (
                  <div key={node.id} style={{ padding: '12px 14px', borderRadius: 12, background: node.unlocked ? 'rgba(27,77,62,.35)' : 'rgba(47,54,57,.5)', border: `1px solid ${node.unlocked ? 'rgba(158,209,189,.3)' : 'rgba(255,255,255,.06)'}`, opacity: (!node.unlocked && !prereqsMet) ? 0.42 : 1 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
                      <span style={{ fontSize: 13, fontWeight: 600, color: node.unlocked ? '#9ed1bd' : '#dde4e7' }}>{node.name}</span>
                      {node.unlocked
                        ? <span className="tag-pill" style={{ color: '#76C043', borderColor: 'rgba(118,192,67,.3)', background: 'rgba(118,192,67,.1)', flexShrink: 0 }}>✓</span>
                        : <button onClick={() => handleUnlockResearch(node.id)} disabled={!canUnlock} style={{ padding: '5px 12px', borderRadius: 8, fontSize: 11, fontWeight: 600, background: canUnlock ? 'rgba(158,209,189,.18)' : 'rgba(255,255,255,.04)', border: `1px solid ${canUnlock ? 'rgba(158,209,189,.4)' : 'rgba(255,255,255,.08)'}`, color: canUnlock ? '#9ed1bd' : '#404945', fontFamily: '"JetBrains Mono",monospace', flexShrink: 0, cursor: canUnlock ? 'pointer' : 'default' }}>{node.cost} 🧪</button>
                      }
                    </div>
                    <p style={{ fontSize: 12, color: '#8a938e', marginTop: 5, lineHeight: 1.4 }}>{node.effect}</p>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Left Map Tool Sidebar */}
        {activeNavTab === 'simulation' && (
          <div style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', display: 'flex', flexDirection: 'column', gap: 8, zIndex: 20 }}>
            {(['none','wrrl','ffh','flood'] as const).map((ov, i) => {
              const icons = ['layers','water_drop','park','flood'] as const;
              return (
                <button key={ov} className={`map-tool-btn${activeOverlay === ov ? ' active' : ''}`} onClick={() => setActiveOverlay(activeOverlay === ov ? 'none' : ov)}>
                  <span className="material-symbols-outlined" style={{ fontSize: 20 }}>{icons[i]}</span>
                </button>
              );
            })}
          </div>
        )}

        {/* Bottom Build Sheet */}
        {activeNavTab === 'simulation' && (
          <div
            className="bottom-sheet"
            style={{
              position: 'absolute', bottom: 0, left: 0, right: 0, zIndex: 30,
              padding: '14px 16px 16px',
              maxHeight: sheetExpanded ? '52vh' : 'auto',
              transition: 'max-height .3s cubic-bezier(.3,.7,.4,1)',
              overflowY: sheetExpanded ? 'auto' : 'hidden',
            }}
          >
            {/* Sheet Header Row */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
              <div style={{ display: 'flex', gap: 20 }}>
                {(['aktionen','bauen'] as const).map(t => (
                  <button key={t} onClick={() => setBuildSheetTab(t)} style={{ background: 'none', border: 'none', paddingBottom: 6, borderBottom: buildSheetTab === t ? '2px solid #9ed1bd' : '2px solid transparent', color: buildSheetTab === t ? '#9ed1bd' : '#8a938e', fontFamily: '"JetBrains Mono",monospace', fontSize: 10, fontWeight: 500, letterSpacing: '.08em', textTransform: 'uppercase', cursor: 'pointer', transition: 'color .14s' }}>
                    {t.toUpperCase()}
                  </button>
                ))}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                {selectedBuilding && (
                  <span className="tag-pill" style={{ color: '#9ed1bd', borderColor: 'rgba(158,209,189,.3)', background: 'rgba(158,209,189,.08)', fontSize: 9 }}>
                    {selectedBuilding.icon} {getEffectiveCost(selectedBuilding, activeBuildCard?.strength || 1, researchNodes)}€
                  </span>
                )}
                <button onClick={() => setSheetExpanded(!sheetExpanded)} style={{ background: 'none', border: 'none', color: '#8a938e', cursor: 'pointer', lineHeight: 1, padding: 4 }}>
                  <span className="material-symbols-outlined" style={{ fontSize: 22 }}>{sheetExpanded ? 'expand_more' : 'expand_less'}</span>
                </button>
              </div>
            </div>

            {/* AKTIONEN tab */}
            {buildSheetTab === 'aktionen' && (
              <div style={{ display: 'flex', gap: 10, overflowX: 'auto', paddingBottom: 4 }} className="no-scrollbar">
                {cards.map(card => (
                  <div key={card.id} className={`build-card${selectedCardId === card.id ? ' selected' : ''}`} onClick={() => { handlePlayCard(card.id); setBuildSheetTab('bauen'); }}>
                    <div style={{ width: 52, height: 52, borderRadius: 12, background: selectedCardId === card.id ? 'rgba(158,209,189,.15)' : 'rgba(255,255,255,.06)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24 }}>
                      {card.emoji}
                    </div>
                    <span className="label-caps" style={{ color: '#c0c9c3', textAlign: 'center', fontSize: 9 }}>{card.type}</span>
                    <div style={{ display: 'flex', gap: 2 }}>
                      {[1,2,3,4,5].map(i => (
                        <div key={i} style={{ width: 10, height: 3, borderRadius: 2, background: i <= card.strength ? '#9ed1bd' : 'rgba(255,255,255,.12)' }} />
                      ))}
                    </div>
                  </div>
                ))}
                {/* End Turn card */}
                <div className="build-card" onClick={handleEndTurn} style={{ borderColor: 'rgba(158,209,189,.25)', background: 'rgba(27,77,62,.35)' }}>
                  <div style={{ width: 52, height: 52, borderRadius: 12, background: 'rgba(158,209,189,.12)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <span className="material-symbols-outlined" style={{ fontSize: 26, color: '#9ed1bd' }}>arrow_forward</span>
                  </div>
                  <span className="label-caps" style={{ color: '#9ed1bd', textAlign: 'center', fontSize: 9 }}>RUNDE</span>
                  <span className="label-caps" style={{ color: '#9ed1bd', textAlign: 'center', fontSize: 9 }}>BEENDEN</span>
                </div>
              </div>
            )}

            {/* BAUEN tab */}
            {buildSheetTab === 'bauen' && (
              <div style={{ display: 'flex', gap: 10, overflowX: 'auto', paddingBottom: 4 }} className="no-scrollbar">
                {BUILDINGS_CATALOG.map(b => {
                  const resNode = b.researchRequired ? researchNodes.find(n => n.id === b.researchRequired) : null;
                  const locked = resNode ? !resNode.unlocked : false;
                  const cost = getEffectiveCost(b, activeBuildCard?.strength || 1, researchNodes);
                  return (
                    <div
                      key={b.id}
                      className={`build-card${selectedBuilding?.id === b.id ? ' selected' : ''}${locked ? ' locked' : ''}`}
                      onClick={() => {
                        if (locked) return;
                        setSelectedBuilding(selectedBuilding?.id === b.id ? null : b);
                        setSelectedCardId('act_build');
                      }}
                    >
                      <div style={{ width: 52, height: 52, borderRadius: 12, background: b.category === 'water' ? 'rgba(78,179,211,.12)' : b.category === 'ecology' || b.category === 'fauna' ? 'rgba(118,192,67,.10)' : 'rgba(166,137,102,.10)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24 }}>
                        {b.icon}
                      </div>
                      <span className="label-caps" style={{ color: '#c0c9c3', textAlign: 'center', fontSize: 8, lineHeight: 1.3 }}>
                        {b.name.slice(0, 14).toUpperCase()}
                      </span>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
                        <span className="material-symbols-outlined" style={{ fontSize: 10, color: '#9ed1bd' }}>payments</span>
                        <span className="label-caps" style={{ color: '#9ed1bd', fontSize: 9 }}>{cost}€</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </main>

      {/* ══ BOTTOM NAVIGATION ══ */}
      <nav className="bottom-nav" style={{ flexShrink: 0, display: 'flex', justifyContent: 'space-around', alignItems: 'center', padding: '6px 4px 10px', zIndex: 40 }}>
        {([
          { id: 'simulation', icon: 'map',          label: 'Karte' },
          { id: 'stats',      icon: 'analytics',    label: 'Stats' },
          { id: 'history',    icon: 'history_edu',  label: 'Missionen' },
          { id: 'build',      icon: 'science',      label: 'Forschung' },
        ] as const).map(tab => (
          <button key={tab.id} className={`nav-item${activeNavTab === tab.id ? ' active' : ''}`} onClick={() => setActiveNavTab(tab.id)} style={{ border: 'none', cursor: 'pointer' }}>
            <span className="material-symbols-outlined" style={{ fontSize: 22 }}>{tab.icon}</span>
            <span className="label-caps" style={{ fontSize: 9 }}>{tab.label}</span>
          </button>
        ))}
      </nav>

      {/* ══ MODALS ══ */}

      {activeEvent && (
        <EventModal event={activeEvent} onChoice={handleResolveEvent} />
      )}

      {showTutorial && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 80, background: 'rgba(13,20,23,.85)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
          <div style={{ background: '#1a2124', border: '1px solid rgba(255,255,255,.14)', borderRadius: 20, padding: 24, maxWidth: 380, width: '100%' }} className="animate-slide-up">
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
              <span className="material-symbols-outlined" style={{ color: '#9ed1bd', fontSize: 22 }}>eco</span>
              <span style={{ fontFamily: '"Plus Jakarta Sans",sans-serif', fontWeight: 800, fontSize: 15, color: '#9ed1bd' }}>RurNova</span>
              <span className="label-caps" style={{ color: '#8a938e', marginLeft: 'auto', fontSize: 9 }}>{tutorialStep + 1}/{TUTORIAL_STEPS.length}</span>
            </div>
            <h2 style={{ fontFamily: '"Plus Jakarta Sans",sans-serif', fontWeight: 700, fontSize: 18, color: '#dde4e7', marginBottom: 10 }}>{TUTORIAL_STEPS[tutorialStep].title}</h2>
            <p style={{ fontSize: 14, color: '#c0c9c3', lineHeight: 1.6 }}>{TUTORIAL_STEPS[tutorialStep].text}</p>
            <div style={{ display: 'flex', gap: 4, marginTop: 16 }}>
              {TUTORIAL_STEPS.map((_, i) => (
                <div key={i} style={{ height: 3, flex: 1, borderRadius: 2, background: i <= tutorialStep ? '#9ed1bd' : 'rgba(255,255,255,.12)' }} />
              ))}
            </div>
            <button
              onClick={() => tutorialStep < TUTORIAL_STEPS.length - 1 ? setTutorialStep(p => p + 1) : setShowTutorial(false)}
              style={{ width: '100%', marginTop: 16, padding: '12px', borderRadius: 12, background: 'rgba(158,209,189,.18)', border: '1px solid rgba(158,209,189,.4)', color: '#9ed1bd', fontFamily: '"Plus Jakarta Sans",sans-serif', fontWeight: 700, fontSize: 14, cursor: 'pointer' }}
            >
              {tutorialStep === TUTORIAL_STEPS.length - 1 ? '🌿 Simulation starten' : 'Weiter →'}
            </button>
          </div>
        </div>
      )}

      <GameFeedbackOverlay
        notification={pendingFeedback}
        onClose={() => setPendingFeedback(null)}
        onConfirm={handleConfirmStagedAction}
        onCancel={handleCancelStagedAction}
      />

      {(stats.gamePhase === 'end_win' || stats.gamePhase === 'end_collapse') && (
        <GameEndScreen
          won={stats.gamePhase === 'end_win'}
          stats={stats}
          speciesList={speciesList}
          onRestart={() => {
            initGrid();
            setStats({ round: 1, year: 2026, season: 0, budget: 25, researchPoints: 3, naturePoints: 0, globalWrrl: 42, globalFfh: 61, continuity: 12, climateRisk: 35, citizenAcceptance: 73, biosecurity: 62, renewableEnergy: 8, co2Footprint: 142, paperFactoryMode: 'Vollbetrieb', factoryCooldown: 0, gamePhase: 'playing' });
            setCards(INITIAL_ACTION_CARDS);
            setResearchNodes(RESEARCH_TECH_TREE);
            setSpeciesList(BIOTOP_SPECIES);
            setQuests(STAKEHOLDER_QUESTS_DATA);
            setUndoHistory([]);
          }}
        />
      )}

    </div>
  );
}