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
  const buildFlowSteps = [
    { label: 'Aktion', done: selectedCardId === 'act_build', active: selectedCardId !== 'act_build' },
    { label: 'Massnahme', done: Boolean(selectedBuilding), active: selectedCardId === 'act_build' && !selectedBuilding },
    { label: 'Kachel', done: Boolean(selectedBuilding && selectedCoord), active: Boolean(selectedBuilding) },
    { label: 'Bestaetigen', done: false, active: Boolean(selectedBuilding && selectedCoord) }
  ];

  return (
    <div className="relative w-screen min-h-dvh h-dvh flex flex-col md:grid md:grid-rows-[auto_1fr_auto] bg-parch-1 font-sans select-none paper-overlay overflow-hidden">
      
      {/* ── TOPBAR: Key Landscape Indices ── */}
      {/* ── HUD: Kartentisch-Stil — dunkler Balken, Playfair Wortmarke ── */}
      <header
        className="flex flex-wrap items-center justify-between gap-2 sm:gap-3 z-30 mx-4 mt-4 px-4 py-3 sm:px-5 rounded-2xl"
        style={{
          background: 'rgba(34,40,42,0.94)',
          boxShadow: '0 1px 0 rgba(250,247,240,.08) inset, 0 4px 20px rgba(0,0,0,.22)',
          backdropFilter: 'blur(8px)'
        }}
      >
        <div className="flex flex-col">
          <div className="flex items-center gap-1.5">
            <span className="font-serif font-medium text-base sm:text-lg lg:text-xl tracking-tight" style={{ color: '#FAF7F0', letterSpacing: '-0.01em' }}>
              RurNova
            </span>
            <span className="text-[9px] sm:text-[9px] px-1.5 py-0.5 rounded font-sans font-semibold uppercase tracking-widest hidden sm:inline" style={{ background: 'rgba(250,247,240,.12)', color: 'rgba(250,247,240,.55)', fontSize: '8.5px', letterSpacing: '.14em' }}>
              TABLET PRO
            </span>
          </div>
          <span className="hidden md:block" style={{ font: '400 8.5px/1.3 "Inter", sans-serif', letterSpacing: '.04em', color: 'rgba(250,247,240,.45)', marginTop: '3px' }}>
            Anstalt für Gewässermanagement Kreis Düren, NRW
          </span>
        </div>

        {/* Turn Season Banner */}
        <div className="flex items-center gap-1.5 sm:gap-2 border-l border-ink-1/10 pl-2 sm:pl-3">
          {/* Season + Runde — CD HUD style */}
          <div className="hidden sm:flex items-center gap-3">
            <div style={{ textAlign: 'center' }}>
              <div style={{ font: '500 17px/1 "Playfair Display", serif', color: '#FAF7F0', letterSpacing: '-0.01em' }}>
                {stats.year}
              </div>
              <div style={{ font: '600 8px/1 "Inter", sans-serif', letterSpacing: '.14em', textTransform: 'uppercase', color: 'rgba(250,247,240,.5)', marginTop: '4px' }}>
                {SEASONS[stats.season]}
              </div>
            </div>
            <div style={{ width: 1, height: 26, background: 'rgba(250,247,240,.15)' }} />
            <div style={{ font: '500 9.5px/1 "JetBrains Mono", monospace', color: 'rgba(250,247,240,.5)', letterSpacing: '.04em' }}>
              RND <span style={{ font: '500 14px/1 "Playfair Display", serif', color: '#FAF7F0' }}>{stats.round}</span>
            </div>
          </div>
          {/* Mobile */}
          <div className="flex sm:hidden flex-col items-center gap-0.5">
            <span style={{ font: '500 14px/1 "Playfair Display", serif', color: '#FAF7F0' }}>{stats.year}</span>
            <span style={{ font: '600 7.5px/1 "Inter", sans-serif', letterSpacing: '.12em', textTransform: 'uppercase', color: 'rgba(250,247,240,.5)' }}>{SEASONS[stats.season].slice(0,4)}</span>
          </div>
        </div>

        {/* Resource Indicators (Always compact, perfect for mobile and desktop) */}
        <div className="flex items-center gap-1.5 sm:gap-2">
          {/* Budget — Glyph-Ring §04 */}
          <div className="flex items-center gap-2">
            <span className="glyph-ring" style={{ width: 30, height: 30, fontSize: 13, color: '#D9BC7E' }}>€</span>
            <div className="flex flex-col">
              <span style={{ font: '500 15px/1 "Playfair Display", serif', color: '#FAF7F0', letterSpacing: '-0.01em' }}>
                {stats.budget}
              </span>
              <span style={{ font: '600 8px/1 "Inter", sans-serif', letterSpacing: '.14em', textTransform: 'uppercase', color: 'rgba(250,247,240,.5)', marginTop: '3px' }} className="hidden sm:block">
                Budget
              </span>
            </div>
          </div>

          <div style={{ width: 1, height: 26, background: 'rgba(250,247,240,.15)' }} />

          {/* Forschung — Glyph-Ring */}
          <div className="flex items-center gap-2">
            <span className="glyph-ring" style={{ width: 30, height: 30, fontSize: 13, color: '#B89A78' }}>R</span>
            <div className="flex flex-col">
              <span style={{ font: '500 15px/1 "Playfair Display", serif', color: '#FAF7F0', letterSpacing: '-0.01em' }}>
                {stats.researchPoints}
              </span>
              <span style={{ font: '600 8px/1 "Inter", sans-serif', letterSpacing: '.14em', textTransform: 'uppercase', color: 'rgba(250,247,240,.5)', marginTop: '3px' }} className="hidden sm:block">
                Forschung
              </span>
            </div>
          </div>
        </div>

        {/* Mobile Toggle for Statistics */}
        <button
          onClick={() => setIsHeaderExpanded(!isHeaderExpanded)}
          aria-expanded={isHeaderExpanded}
          aria-label="Landschaftsindizes ein- oder ausklappen"
          className="flex lg:hidden min-h-11 items-center gap-1 rounded-lg px-3 py-2 text-xs font-sans font-semibold transition-colors ml-auto select-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-eco-primary"
          style={{ background: 'rgba(250,247,240,.10)', border: '1px solid rgba(250,247,240,.18)', color: 'rgba(250,247,240,.8)', letterSpacing: '.06em' }}
        >
          <span className="text-sm">📊</span>
          <BarChart3 className="w-4 h-4" aria-hidden="true" />
          <span className="hidden sm:inline">Indizes</span>
          <svg 
            className={`w-3 h-3 text-ink-3 transition-transform duration-300 ${isHeaderExpanded ? 'rotate-180' : 'rotate-0'}`} 
            fill="none" 
            stroke="currentColor" 
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19 9l-7 7-7-7" />
          </svg>
        </button>

        {/* Global Statistics Indices - Desktop inline / Mobile Collapsible */}
        <div className={`
          ${isHeaderExpanded ? 'flex' : 'hidden'} 
          lg:flex items-center w-full lg:w-auto mt-2 lg:mt-0 pt-2 lg:pt-0 border-t lg:border-t-0 border-ink-1/10 border-dashed max-w-full overflow-x-auto tablet-scroll py-0.5
        `}>
          <div className="flex flex-wrap lg:flex-nowrap items-center gap-1.5 sm:gap-2 w-full lg:w-auto">
            {[
              { label: 'Güte (WRRL)',       value: stats.globalWrrl,  barColor: '#2A6F7E', textColor: '#2A6F7E' },
              { label: 'Artenschutz (FFH)', value: stats.globalFfh,   barColor: '#4A7A3A', textColor: '#4A7A3A' },
              { label: 'Durchgängigkeit',   value: stats.continuity,  barColor: '#A7853A', textColor: '#A7853A' },
              { label: 'Klimarisiko',       value: stats.climateRisk, barColor: '#9C3A22', textColor: '#9C3A22' }
            ].map(score => (
              <div
                key={score.label}
                style={{
                  background: 'rgba(250,247,240,.10)',
                  border: '1px solid rgba(250,247,240,.14)',
                  borderRadius: 10,
                  padding: '8px 12px',
                  minWidth: 90,
                  flex: 1,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 5
                }}
              >
                <span style={{ font: '600 8px/1 "Inter", sans-serif', letterSpacing: '.12em', textTransform: 'uppercase', color: 'rgba(250,247,240,.45)' }}>
                  {score.label}
                </span>
                <span style={{ font: '500 16px/1 "Playfair Display", serif', color: '#FAF7F0', letterSpacing: '-0.01em' }}>
                  {score.value}%
                </span>
                <div style={{ height: 4, background: 'rgba(250,247,240,.14)', borderRadius: 999, overflow: 'hidden' }}>
                  <div style={{ width: `${score.value}%`, height: '100%', background: score.barColor, borderRadius: 999, transition: 'width .4s cubic-bezier(.3,.7,.4,1)' }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </header>

      {/* ── MAIN WORKSPACE: Split Sidebars ── */}
      {/* Main — Kartentisch: warmer Pergament-Hintergrund mit subtiler Rasterstruktur */}
      <main className="flex-1 min-h-0 flex flex-col md:grid md:grid-cols-[104px_1fr_360px] gap-3 md:gap-4 p-3 md:p-4 overflow-hidden map-tisch">
        
        {/* LEFT COLUMN: Arche Nova Power Actions Strip */}
        <aside className="rur-panel rounded-xl md:rounded-2xl p-2.5 md:p-3.5 flex flex-row md:flex-col gap-2.5 items-stretch justify-between overflow-x-auto md:overflow-y-auto tablet-scroll z-10 w-full md:w-auto">
          <div className="flex flex-row md:flex-col gap-2.5 w-full">
            <span className="font-serif font-bold text-[9px] text-ink-3 tracking-widest uppercase text-center hidden md:block">
              Aktionen
            </span>
            {cards.map(card => {
              const isSelected = selectedCardId === card.id;
              return (
                <button
                  key={card.id}
                  onClick={() => handlePlayCard(card.id)}
                  aria-pressed={isSelected}
                  aria-label={`${card.name}, Staerke ${card.strength}`}
                  className={`act-slot flex-1 md:flex-initial min-h-20 text-center flex flex-col items-center justify-between gap-1.5 select-none min-w-[76px] focus-visible:outline focus-visible:outline-2 focus-visible:outline-eco-primary ${isSelected ? 'active' : ''}`}
                >
                  {/* Glyph-Ring mit Karten-Buchstabe */}
                  <span className="glyph-ring mt-0.5" style={{ width: 28, height: 28, fontSize: 13, color: 'var(--color-eco-primary)' }}>
                    {card.name.charAt(0)}
                  </span>
                  <div className="flex flex-col items-center gap-0.5">
                    <span style={{ font: '500 17px/1 "Playfair Display", serif', color: '#22282A', letterSpacing: '-0.01em' }}>
                      {card.strength}
                    </span>
                    <span style={{ font: '600 7px/1 "Inter", sans-serif', letterSpacing: '.1em', textTransform: 'uppercase', color: '#8A8F95' }}>
                      Stärke
                    </span>
                  </div>

                  {/* CD Pips — dünne Balken */}
                  <div className="act-slot pips w-full px-1">
                    {[1, 2, 3, 4, 5].map(idx => (
                      <i key={idx} className={idx <= card.strength ? 'on' : ''} style={idx <= card.strength ? { background: 'var(--color-eco-primary)' } : {}} />
                    ))}
                  </div>

                  <span style={{ font: '500 9px/1 "Inter", sans-serif', letterSpacing: '.04em', textTransform: 'uppercase', color: '#4E545A', maxWidth: 58, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {card.name.split(' ')[0]}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Quick Info & Static Map Legends at Left Hand Bottom */}
          <div className="hidden md:flex flex-col items-center gap-1 opacity-70">
            <button 
              onClick={() => {
                setShowTutorial(true);
                setTutorialStep(0);
              }}
              className="min-h-11 min-w-11 p-2 rounded-full text-ink-3 hover:text-ink-0 active:bg-parch-3 focus-visible:outline focus-visible:outline-2 focus-visible:outline-eco-primary"
              title="Anleitung"
              aria-label="Anleitung oeffnen"
            >
              <HelpCircle className="w-5 h-5" />
            </button>
            <span className="text-[9px] font-serif text-ink-3">Guide</span>
          </div>
        </aside>

        {/* CENTER COLUMN: The Dynamic Interactive Sandbox Hex Map */}
        {/* Map — Kartentisch: schwerer Rahmen, warme Tischfarbe */}
        <section
          className="relative flex-1 min-h-[320px] overflow-hidden flex flex-col"
          style={{ borderRadius: 6, border: '3px solid #22282A', boxShadow: 'inset 0 0 0 1px rgba(250,247,240,.25), 0 14px 30px -12px rgba(34,40,42,.4)' }}
        >
          {/* Map Filters Overlay */}
          <div className="absolute top-3 left-3 right-3 sm:right-auto z-40 flex items-center gap-1.5 p-1.5 overflow-x-auto tablet-scroll" style={{ background: 'rgba(34,40,42,.88)', border: '1px solid rgba(250,247,240,.12)', borderRadius: 9, backdropFilter: 'blur(6px)' }}>
            <span style={{ font: '600 8px/1 "Inter", sans-serif', letterSpacing: '.16em', textTransform: 'uppercase', color: 'rgba(250,247,240,.45)', marginRight: 4, whiteSpace: 'nowrap' }}>
              Atlas-Filter
            </span>
            {(
              [
                { id: 'none', label: 'Kein' },
                { id: 'wrrl', label: 'WRRL-Güte' },
                { id: 'ffh', label: 'Biotope (FFH)' },
                { id: 'flood', label: 'Flutrisiko' }
              ] as const
            ).map(overlay => (
              <button
                key={overlay.id}
                onClick={() => setActiveOverlay(overlay.id)}
                aria-pressed={activeOverlay === overlay.id}
                className="shrink-0 focus-visible:outline focus-visible:outline-2 focus-visible:outline-eco-primary"
                style={{
                  font: '600 9px/1 "Inter", sans-serif',
                  letterSpacing: '.04em',
                  padding: '5px 10px',
                  borderRadius: 999,
                  border: activeOverlay === overlay.id ? '1px solid rgba(250,247,240,.5)' : '1px solid rgba(250,247,240,.18)',
                  background: activeOverlay === overlay.id ? '#FAF7F0' : 'rgba(250,247,240,.08)',
                  color: activeOverlay === overlay.id ? '#22282A' : 'rgba(250,247,240,.65)',
                  minHeight: 30
                }}
              >
                {overlay.label}
              </button>
            ))}
          </div>

          <div className="absolute left-3 bottom-3 z-40 max-w-[calc(100%-1.5rem)] bg-parch-0/95 border border-parch-4/60 rounded-lg backdrop-blur-sm px-3 py-2" style={{ boxShadow: '0 2px 12px rgba(0,0,0,0.5)' }}>
            <div className="flex flex-wrap items-center gap-2 text-[11px] font-mono text-ink-2">
              <span className="font-serif text-xs font-bold text-ink-1">Legende</span>
              <span className="inline-flex items-center gap-1"><i className="w-3 h-3 rounded-sm bg-[#3a82be]" /> Wasser</span>
              <span className="inline-flex items-center gap-1"><i className="w-3 h-3 rounded-sm bg-[#73cf45]" /> Wiese</span>
              <span className="inline-flex items-center gap-1"><i className="w-3 h-3 rounded-sm bg-[#235c1d]" /> Auwald</span>
              <span className="inline-flex items-center gap-1"><i className="w-3 h-3 rounded-sm bg-[#e07638]" /> Siedlung</span>
            </div>
          </div>

          <div className="flex-1 w-full h-full relative" id="isometric-canvas-wrapper">
            {grid.length > 0 && (
              <IsometricMap
                grid={grid}
                selectedTile={selectedCoord}
                selectedBuilding={selectedBuilding}
                onSelectTile={(gx, gy) => {
                  setSelectedCoord({ gx, gy });
                  setSelectedCardId('act_build');
                  if (selectedBuilding) {
                    handleBuildDirectly(gx, gy, selectedBuilding);
                  }
                }}
                activeOverlay={activeOverlay}
              />
            )}
          </div>
        </section>

        {/* RIGHT COLUMN: Ledger Details Console Sidebar */}
        <aside className="rur-panel rounded-xl md:rounded-2xl p-3 md:p-4 flex flex-col gap-3.5 overflow-y-auto tablet-scroll shrink-0 w-full md:w-[360px] max-h-[34dvh] md:max-h-none">
          
          {/* Cell Inspection Detail card */}
          {selectedCoord && selectedTile && (
            <div className="bg-parch-2 border border-parch-4 rounded-lg flex flex-col transition-all duration-300" style={{ boxShadow: '0 1px 2px rgba(34,40,42,.06)' }}>
              {/* Clickable Header */}
              <button 
                onClick={() => setIsInspectionOpen(!isInspectionOpen)}
                className="flex items-center justify-between w-full p-3 hover:bg-parch-2/50 text-left transition-colors font-serif font-bold text-sm text-ink-0 uppercase tracking-wider rounded-t-lg"
              >
                <div className="flex items-center gap-1.5 select-none text-ink-1">
                  <MapPin className="w-4 h-4" aria-hidden="true" />
                  <span>📍 Kachel-Inspektion</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-[9px] text-ink-3">
                    X={selectedCoord.gx} Y={selectedCoord.gy}
                  </span>
                  <svg 
                    className={`w-4 h-4 text-ink-3 transition-transform duration-300 ${isInspectionOpen ? 'rotate-180' : 'rotate-0'}`} 
                    fill="none" 
                    stroke="currentColor" 
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
              </button>

              {/* Collapsible Content */}
              <div className={`overflow-hidden transition-all duration-300 ${isInspectionOpen ? 'max-h-[500px] p-3 pt-0 border-t border-ink-1/10' : 'max-h-0'}`}>
                <div className="flex flex-col gap-2.5 mt-2.5">
                  <div className="flex items-start gap-2.5">
                    <span className="text-3xl bg-parch-2 p-1.5 rounded border border-ink-1/10 shadow-sm leading-none flex-shrink-0">
                      {selectedCoord.gx === 3 && selectedCoord.gy === 8 ? '🏭' :
                       grid[selectedCoord.gy][selectedCoord.gx].terrain === 'Water' ? '🌊' :
                       grid[selectedCoord.gy][selectedCoord.gx].terrain === 'Auwald' ? '🌲' :
                       grid[selectedCoord.gy][selectedCoord.gx].terrain === 'Acker' ? '🌾' : '🌾'}
                    </span>
                    <div className="flex flex-col">
                      <div className="font-serif font-bold text-sm text-ink-0">
                        {selectedTile.cityName || 'Freies Ufer / Offenland'}
                      </div>
                      <span className="text-xs text-ink-2 font-serif italic mt-0.5">
                        {selectedCoord.gy < 5 ? 'Jülicher Tiefland' : selectedCoord.gy < 11 ? 'Düren Mitte' : 'Eifel Oberlauf'}
                      </span>
                    </div>
                  </div>

                  {/* Local Tile metrics */}
                  <div className="grid grid-cols-2 gap-2 mt-1">
                    <div className="bg-parch-1/70 border border-ink-1/10 rounded p-1.5">
                      <span className="font-mono text-[8px] text-ink-3 uppercase block leading-none">Güte (WRRL)</span>
                      <span className="font-serif text-md font-bold mt-1 text-ink-1 block">
                        Klasse {selectedTile.wrrl_quality.toFixed(1)}
                      </span>
                    </div>
                    <div className="bg-parch-1/70 border border-ink-1/10 rounded p-1.5">
                      <span className="font-mono text-[8px] text-ink-3 uppercase block leading-none">Biodiversität</span>
                      <span className="font-serif text-md font-bold mt-1 text-ink-1 block">
                        {selectedTile.ffh_value}%
                      </span>
                    </div>
                  </div>

                  {/* Secondary data */}
                  <div className="text-xs text-ink-1 flex flex-col gap-1 border-t border-ink-1/10 pt-2 font-mono">
                    <div>Fahrflutrisiko: <span className="font-bold">{selectedTile.flood_risk}</span></div>
                    {selectedTile.buildingId && (
                      <div className="text-eco-primary font-serif font-bold text-[11px] mt-0.5 bg-eco-primary/5 p-1 rounded border border-eco-primary/15">
                        Aktive Belegung: {BUILDINGS_CATALOG.find(b => b.id === selectedTile.buildingId)?.name || 'Papierfabrik'}
                      </div>
                    )}
                  </div>

                  {/* Action builder trigger button */}
                  {selectedBuilding && (
                    <div className="mt-1 bg-eco-primary/10 border border-eco-primary/30 rounded-lg p-2 flex flex-col gap-1.5">
                      <div className="text-xs text-eco-primary font-bold">
                        Baue: {selectedBuilding.name}
                      </div>
                      <button
                        onClick={handleBuildMeasureOnSelected}
                        className="w-full py-1.5 text-center font-serif text-xs font-bold text-white bg-eco-primary rounded-md shadow hover:brightness-105 active:brightness-95"
                      >
                        Maßnahme anlegen (€)
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Schoellershammer Control System */}
          <SchoellershammerConsole
            currentMode={stats.paperFactoryMode}
            onModeChange={handleFactoryModeChange}
            isRenaturierungUnlocked={isLachsRenaturierungUnlocked || false}
          />

          {/* Species Tracker */}
          <SpeciesTracker species={speciesList} />

          {/* Research Progress node Tree in Sidebar */}
          <ResearchPanel
            nodes={researchNodes}
            researchPoints={stats.researchPoints}
            onUnlockNode={handleUnlockResearch}
          />

          {/* Active Quests box ledger */}
          <div className="bg-parch-1 border border-ink-1/20 rounded-lg shadow-md flex flex-col transition-all duration-300">
            {/* Clickable Header for Collapse/Expand */}
            <button 
              onClick={() => setIsQuestsOpen(!isQuestsOpen)}
              className="flex items-center justify-between w-full p-3 hover:bg-parch-2/50 text-left transition-colors font-serif font-bold text-sm text-ink-0 uppercase tracking-wider rounded-t-lg"
            >
              <div className="flex items-center gap-1.5 select-none">
                <Crown className="w-4 h-4" aria-hidden="true" />
                <span>👑 Behörden-Aufträge</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="font-mono text-[9px] text-ink-3 bg-parch-3/60 px-1.5 py-0.5 rounded font-bold">
                  {quests.filter(q => q.status !== 'completed').length} Aktiv
                </span>
                <svg 
                  className={`w-4 h-4 text-ink-3 transition-transform duration-300 ${isQuestsOpen ? 'rotate-180' : 'rotate-0'}`} 
                  fill="none" 
                  stroke="currentColor" 
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19 9l-7 7-7-7" />
                </svg>
              </div>
            </button>

            {/* Collapsible Content */}
            <div className={`overflow-hidden transition-all duration-300 ${isQuestsOpen ? 'max-h-[500px] p-3 pt-0 border-t border-ink-1/10' : 'max-h-0'}`}>
              <div className="flex flex-col gap-1.5 max-h-[220px] overflow-y-auto tablet-scroll pr-1 mt-2.5">
                {quests.map(q => (
                  <div
                    key={q.id}
                    className={`p-2.5 rounded-lg border text-left flex flex-col transition-all ${
                      q.status === 'completed'
                        ? 'bg-eco-primary/5 border-eco-primary/20 text-eco-primary/60 opacity-70'
                        : 'bg-parch-2 border-parch-4/40 text-ink-0'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-1.5">
                      <span className="font-serif font-bold text-xs">
                        {q.title}
                      </span>
                      {q.status === 'completed' ? (
                        <span className="text-[9px] font-mono font-bold bg-eco-primary/20 text-eco-primary rounded px-1 uppercase shrink-0">ERLEDIGT ✓</span>
                      ) : (
                        <span className="text-[9px] font-mono font-bold bg-fau-primary/15 text-fau-primary rounded px-1 uppercase shrink-0">AKTIV</span>
                      )}
                    </div>
                    <p className="text-xs text-ink-2 mt-1 leading-normal">
                      {q.description}
                    </p>
                    <span className="text-[10px] font-mono text-ink-3 mt-1 block italic">{q.rewardText}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

        </aside>
      </main>

      {/* ── FOOTER: Baukatalog / measures ribbon & End Turn Button ── */}
      <footer className="rur-panel rounded-xl md:rounded-2xl p-3 md:p-3.5 mx-3 md:mx-4 mb-3 md:mb-4 flex flex-col md:grid md:grid-cols-[1fr_240px] gap-3 md:gap-4 items-stretch justify-between z-20">
        
        {/* Horizontal scrollable measures catalog selection */}
        <div className="flex items-center gap-3">
          {selectedCardId === 'act_build' ? (
            <div className="w-full">
              <div className="mb-2 flex flex-wrap items-center gap-2 rounded-lg border border-eco-primary/20 bg-eco-primary/5 px-3 py-2">
                {buildFlowSteps.map((step, index) => (
                  <div key={step.label} className="flex items-center gap-2">
                    <span className={`flex h-6 w-6 items-center justify-center rounded-full border text-[11px] font-mono font-bold ${
                      step.done
                        ? 'bg-eco-primary text-white border-eco-primary'
                        : step.active
                          ? 'bg-parch-0 text-eco-primary border-eco-primary'
                          : 'bg-parch-2 text-ink-3 border-ink-1/10'
                    }`}>
                      {index + 1}
                    </span>
                    <span className={`text-xs font-serif font-bold ${step.done || step.active ? 'text-ink-0' : 'text-ink-3'}`}>
                      {step.label}
                    </span>
                    {index < buildFlowSteps.length - 1 && <ArrowRight className="w-3 h-3 text-ink-3" aria-hidden="true" />}
                  </div>
                ))}
                {selectedBuilding && (
                  <span className="ml-auto text-xs font-mono text-eco-primary font-bold">
                    Gewaehlt: {selectedBuilding.name}
                  </span>
                )}
              </div>
              <BuildCatalog
                onSelectBuilding={b => setSelectedBuilding(b)}
                selectedBuildingId={selectedBuilding?.id || null}
                budget={stats.budget}
                activeCardStrength={activeBuildCard?.strength || 1}
                unlockedResearchIds={researchNodes.filter(n => n.unlocked).map(n => n.id)}
              />
            </div>
          ) : (
            <div className="flex items-center justify-center p-4 bg-parch-3/30 border border-ink-1/10 rounded-xl w-full text-center py-5">
              <p className="font-serif italic text-ink-2 text-sm">
                <Lightbulb className="w-4 h-4 inline mr-1 text-fau-primary" aria-hidden="true" />
                💡 Wähle die Aktionskarte <span className="font-bold text-ink-1">"Bauen & Errichten (🏗️)"</span> links aus, um den Baukatalog zu öffnen und Projekte an der Rur anzulegen.
              </p>
            </div>
          )}
        </div>

        {/* Global Turn Controls */}
        <div className="flex flex-col justify-between p-2.5 rounded-xl shrink-0" style={{ background: '#F2EDE0', border: '1px solid #E2DBC8' }}>
          <div className="flex items-center justify-between gap-1 border-b border-dashed border-ink-1/10 pb-1.5 px-1.5">
            <div className="flex flex-col text-left">
              <span className="text-[9px] text-ink-3 font-mono leading-none font-bold">CO₂-FUẞABDRUCK</span>
              <span className={`text-[11px] font-serif font-bold leading-none mt-1 ${getCO2Rating(stats.co2Footprint).style}`}>
                {stats.co2Footprint}t ({getCO2Rating(stats.co2Footprint).text})
              </span>
            </div>
            
            <div className="flex flex-col text-right">
              <span className="text-[9px] text-ink-3 font-mono leading-none font-bold">AKZEPTANZ</span>
              <span className={`text-[11px] font-serif font-style font-semibold leading-none ${getAcceptanceLabel(stats.citizenAcceptance).style}`}>
                {stats.citizenAcceptance}% ({getAcceptanceLabel(stats.citizenAcceptance).text})
              </span>
            </div>
          </div>

          <div className="flex gap-2.5 mt-2">
            {/* Undo Action */}
            <button
              onClick={handleUndo}
              disabled={undoHistory.length === 0}
              className={`p-2.5 rounded-lg border flex items-center justify-center font-serif text-xs font-bold shrink-0 transition-all ${
                undoHistory.length > 0
                  ? 'ru-btn secondary'
                  : 'ru-btn ghost opacity-40 cursor-not-allowed'
              }`}
              title="Undoletzter Schritt"
            >
              <Undo className="w-5 h-5" />
            </button>

            {/* End Turn — CD primary button */}
            <button
              onClick={handleEndTurn}
              className="ru-btn primary flex-1 justify-center"
              style={{ fontSize: 12, letterSpacing: '.08em' }}
            >
              Nächste Runde <span style={{ marginLeft: 2 }}>›</span>
            </button>
          </div>
        </div>

      </footer>

      {/* ── MODAL: CLIMATE EVENTS ── */}
      {activeEvent && (
        <EventModal
          event={activeEvent}
          budget={stats.budget}
          researchPoints={stats.researchPoints}
          onChoice={handleResolveEvent}
        />
      )}

      {/* ── MODAL: TABLET WELCOME TUTORIAL ── */}
      {showTutorial && (
        <div className="fixed inset-0 bg-ink-0/70 backdrop-blur-sm z-[99999] flex items-center justify-center p-4">
          <div
          className="bg-parch-0 border-2 border-parch-4 rounded-xl p-5 max-w-md w-full relative sm:p-6 paper-card"
          style={{ boxShadow: '0 0 0 1px rgba(14,201,124,0.2), 0 24px 60px rgba(0,0,0,0.7), 0 0 40px rgba(14,201,124,0.08)' }}
        >
            {/* Corners */}
            <div className="absolute top-2 left-2 w-3 h-3 border-t border-l border-ink-3" />
            <div className="absolute top-2 right-2 w-3 h-3 border-t border-r border-ink-3" />
            
            <h2 className="font-serif font-bold text-lg text-ink-0 text-center tracking-medium mt-1">
              {TUTORIAL_STEPS[tutorialStep].title}
            </h2>

            <p className="text-sm text-ink-1 italic leading-relaxed text-center font-sans mt-4">
              {TUTORIAL_STEPS[tutorialStep].text}
            </p>

            <div className="flex items-center justify-between mt-6">
              <span className="font-mono text-xs text-ink-3">
                {tutorialStep + 1} von {TUTORIAL_STEPS.length}
              </span>
              
              <button
                onClick={() => {
                  if (tutorialStep < TUTORIAL_STEPS.length - 1) {
                    setTutorialStep(prev => prev + 1);
                  } else {
                    setShowTutorial(false);
                  }
                }}
                className="px-4 py-2 rounded bg-eco-primary text-white font-serif font-bold text-xs tracking-wide shadow-md"
              >
                {tutorialStep === TUTORIAL_STEPS.length - 1 ? 'Starten' : 'Weiter →'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL: ACTION GAME FEEDBACK ── */}
      <GameFeedbackOverlay
        notification={pendingFeedback}
        onClose={() => setPendingFeedback(null)}
        onConfirm={handleConfirmStagedAction}
        onCancel={handleCancelStagedAction}
      />

      {/* ── GAME END SCREEN (2040 Endwertung) ── */}
      {(stats.gamePhase === 'end_win' || stats.gamePhase === 'end_collapse') && (
        <GameEndScreen
          won={stats.gamePhase === 'end_win'}
          stats={stats}
          speciesList={speciesList}
          onRestart={() => {
            initGrid();
            setStats({
              round: 1, year: 2026, season: 0,
              budget: 25, researchPoints: 3, naturePoints: 0,
              globalWrrl: 42, globalFfh: 61, continuity: 12,
              climateRisk: 35, citizenAcceptance: 73, biosecurity: 62,
              renewableEnergy: 8, co2Footprint: 142,
              paperFactoryMode: 'Vollbetrieb',
              factoryCooldown: 0,
              gamePhase: 'playing',
            });
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
