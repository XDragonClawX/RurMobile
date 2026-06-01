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
  TUTORIAL_STEPS 
} from './gameData';
import { IsometricMap } from './components/IsometricMap';
import { ResearchPanel } from './components/ResearchPanel';
import { SpeciesTracker } from './components/SpeciesTracker';
import { SchoellershammerConsole } from './components/SchoellershammerConsole';
import { BuildCatalog } from './components/BuildCatalog';
import { EventModal } from './components/EventModal';
import { Undo, RefreshCw, HelpCircle, BookOpen } from 'lucide-react';
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

    // Eligibility check
    if (cell.terrain === 'Water' && building.category !== 'water' && building.category !== 'ecology' && building.category !== 'fauna') {
      alert('Maßnahme kann nicht direkt im Tiefenwasser platziert werden!');
      return false;
    }

    if (cell.buildingId) {
      alert('Diese Kachel besitzt bereits eine Schutzmaßnahme! Beseitige diese zuerst.');
      return false;
    }

    // Deduct cost taking strength discount of build card into account
    const buildCard = cards.find(c => c.id === 'act_build');
    const strength = buildCard?.strength || 1;
    const discount = strength === 3 || strength === 4 ? 1 : strength === 5 ? 2 : 0;
    const finalCost = Math.max(1, building.cost - discount);

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

      // Card sliding sequence (Arche Nova rule: played card falls to position 0/strength 1, lesser position cards shift up)
      const oldPosition = card.position;
      const updatedCards = cards.map(c => {
        if (c.id === cardId) {
          return {
            ...c,
            position: 0,
            strength: 1
          };
        }
        if (c.position < oldPosition) {
          const newPos = c.position + 1;
          return {
            ...c,
            position: newPos,
            strength: newPos + 1
          };
        }
        return c;
      });

      updatedCards.sort((a, b) => a.position - b.position);
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

      // Deduct budget taking discount into account
      const buildCard = cards.find(c => c.id === 'act_build');
      const strength = buildCard?.strength || 1;
      const discount = strength === 3 || strength === 4 ? 1 : strength === 5 ? 2 : 0;
      const finalCost = Math.max(1, building.cost - discount);

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

      // Slide sequence for BUILD card! Since building is playing the BUILD card, we should slide it! (Arche Nova rules)
      if (buildCard) {
        const oldPosition = buildCard.position;
        const updatedCards = cards.map(c => {
          if (c.id === 'act_build') {
            return {
              ...c,
              position: 0,
              strength: 1
            };
          }
          if (c.position < oldPosition) {
            const newPos = c.position + 1;
            return {
              ...c,
              position: newPos,
              strength: newPos + 1
            };
          }
          return c;
        });

        updatedCards.sort((a, b) => a.position - b.position);
        setCards(updatedCards);
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
    recordUndo();
    
    // Changing modes causes immediate citizen feedback or budget shifts
    let budgetCut = 0;
    if (mode === 'Renaturierung') {
      budgetCut = 4; // costs 4 € to demount
    }

    setStats(prev => ({
      ...prev,
      paperFactoryMode: mode,
      budget: Math.max(0, prev.budget - budgetCut),
      citizenAcceptance: Math.min(100, Math.max(0, prev.citizenAcceptance + (mode === 'Stilllegung' ? -15 : mode === 'Vollbetrieb' ? 10 : 5)))
    }));

    const modeDetailsInfo = {
      Vollbetrieb: { desc: '+15 €/Runde, +10% Akzeptanz, −15% WRRL im Fluss', flavor: 'Die Papierindustrie läuft unter Volldampf für maximale Wirtschaftlichkeit.' },
      Umrüstung: { desc: '+5 €/Runde, +1 🧪/Runde, keine Gewässerschäden mehr', flavor: 'Moderne Filteranlagen und ressourceneffiziente Kreisprozesse werden etabliert uns schonen die Rur.' },
      Stilllegung: { desc: '0 €/Runde, −15% Akzeptanz (Arbeitsplatzverlust), WRRL neutral', flavor: 'Eine temporäre Produktionspause entlastet das lokale Gewässerbiotop.' },
      Renaturierung: { desc: '−4 € Einmalkosten, +15% WRRL-Qualität, +25% Lachsansiedlung', flavor: 'Vollständiger Rückbau und Renaturierung der Industriebrache am Dürener Mittellauf.' }
    };

    const detailsList: GameNotificationDetail[] = [];
    if (budgetCut > 0) {
      detailsList.push({ label: 'Einmalige Rückbaukosten', value: `-${budgetCut} €`, changeType: 'negative' });
    }
    const accChange = mode === 'Stilllegung' ? -15 : mode === 'Vollbetrieb' ? 10 : 5;
    detailsList.push({ 
      label: 'Bürgerakzeptanz', 
      value: accChange >= 0 ? `+${accChange}%` : `${accChange}%`, 
      changeType: accChange >= 0 ? 'positive' : 'negative' 
    });

    setPendingFeedback({
      type: 'mode',
      title: `Werk Schoellershammer umgestellt!`,
      subtitle: `Status: ${mode}`,
      icon: '🏭',
      badgeText: 'WERKSMANAGEMENT',
      details: [
        ...detailsList,
        { label: 'Rundeneffekt', value: modeDetailsInfo[mode].desc, changeType: 'neutral' }
      ],
      flavorText: modeDetailsInfo[mode].flavor
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

    // 1. Calculate turn earnings
    let roundIncome = 10; // BASE income

    if (stats.paperFactoryMode === 'Vollbetrieb') {
      roundIncome += 15;
    } else if (stats.paperFactoryMode === 'Umrüstung') {
      roundIncome += 5;
    } else if (stats.paperFactoryMode === 'Renaturierung') {
      roundIncome -= 4; // restoration maintenance budget drain
    }

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

    // 2. Local WRRL damage or repair based on factory mode
    const updatedGrid = JSON.parse(JSON.stringify(grid)) as TileData[][];
    
    // Düren Mittellauf wrrl changes
    for (let x = 0; x < COLS; x++) {
      const cell = updatedGrid[8][x];
      if (cell.terrain === 'Water') {
        if (stats.paperFactoryMode === 'Vollbetrieb') {
          cell.wrrl_quality = Math.min(5.0, cell.wrrl_quality + 0.45); // dirties river!
        } else if (stats.paperFactoryMode === 'Renaturierung') {
          cell.wrrl_quality = Math.max(1.0, cell.wrrl_quality - 0.55); // purifies river!
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
      researchPoints: prev.researchPoints + (stats.paperFactoryMode === 'Umrüstung' ? 1 : 0),
      climateRisk: Math.min(100, Math.round(rawRisk)),
      co2Footprint: currentCO2
    }));

    // Trigger seasonal report popup
    const seasonIcons = ['🌸', '☀️', '🍂', '❄️'];
    const currentSeasonIcon = seasonIcons[stats.season];
    
    const seasonDetailsColors: GameNotificationDetail[] = [
      { label: 'Einnahmen Basis', value: '+10 €', changeType: 'positive' }
    ];
    if (stats.paperFactoryMode === 'Vollbetrieb') {
      seasonDetailsColors.push({ label: 'Industrieertrag (Schoellershammer)', value: '+15 €', changeType: 'positive' });
    } else if (stats.paperFactoryMode === 'Umrüstung') {
      seasonDetailsColors.push({ label: 'Modernisierungsvertrag', value: '+5 €', changeType: 'positive' });
    } else if (stats.paperFactoryMode === 'Renaturierung') {
      seasonDetailsColors.push({ label: 'Unterhalt Renaturierungszone', value: '-4 €', changeType: 'negative' });
    }

    if (countTourism > 0) {
      seasonDetailsColors.push({ label: 'Naherholung & Tourismus', value: `+${countTourism} €`, changeType: 'positive' });
    }

    if (nimbyFee > 0) {
      seasonDetailsColors.push({ label: 'NIMBY-Protestgebühr', value: `-${nimbyFee} €`, changeType: 'negative' });
    }

    seasonDetailsColors.push({ label: 'Netto-Quartalsbudget', value: `+${roundIncome - nimbyFee} €`, changeType: 'positive' });

    if (stats.paperFactoryMode === 'Umrüstung') {
      seasonDetailsColors.push({ label: 'Forschungsdirektive', value: '+1 🧪', changeType: 'positive' });
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
    if (acc >= 75) return { text: 'Enthusiastisch', style: 'text-green-700 bg-green-50 border-green-200' };
    if (acc >= 45) return { text: 'Kooperativ', style: 'text-ink-1 bg-parch-0 border-ink-1/10' };
    return { text: 'Widerständig (⚠️ NIMBY)', style: 'text-red-700 bg-red-50 border-red-200 animate-pulse' };
  };

  const getCO2Rating = (tons: number) => {
    if (tons < 60) return { text: 'Exzellent (Kompensiert)', style: 'text-green-700' };
    if (tons < 110) return { text: 'Moderat', style: 'text-ink-1' };
    return { text: 'Kritisch (Treibhaus)', style: 'text-red-600 font-bold' };
  };

  const isLachsRenaturierungUnlocked = researchNodes.find(n => n.id === 'schoeller_renat')?.unlocked;

  return (
    <div className="relative w-screen h-screen flex flex-col md:grid md:grid-rows-[auto_1fr_auto] bg-parch-1 font-sans select-none paper-overlay">
      
      {/* ── TOPBAR: Key Landscape Indices ── */}
      <header className="bg-parch-0/80 border border-ink-1/10 rounded-2xl px-3.5 py-2.5 sm:px-5 sm:py-3 flex flex-wrap items-center justify-between gap-2 sm:gap-3 shadow-lg z-30 mx-4 mt-4 backdrop-blur-md">
        <div className="flex flex-col">
          <div className="flex items-center gap-1.5">
            <span className="font-serif font-bold text-base sm:text-lg lg:text-xl text-ink-0 tracking-wide">
              RUR<span className="text-eco-primary">NOVA</span>
            </span>
            <span className="text-[9px] sm:text-[10px] bg-eco-primary/10 text-eco-primary border border-eco-primary/20 px-1 py-0.5 rounded font-mono font-bold uppercase tracking-tight hidden sm:inline">
              TABLET PRO
            </span>
          </div>
          <span className="text-[9px] sm:text-[10px] text-ink-2 font-medium italic block leading-none hidden md:block">
            Anstalt für Gewässermanagement Kreis Düren, NRW
          </span>
        </div>

        {/* Turn Season Banner */}
        <div className="flex items-center gap-1.5 sm:gap-2 border-l border-ink-1/10 pl-2 sm:pl-3">
          {/* Desktop/Tablet view */}
          <div className="hidden sm:flex items-center gap-2">
            <div className="bg-parch-0 border border-ink-1/15 rounded-lg px-2.5 py-1.5 text-center min-w-[85px] shadow-sm">
              <div className="font-serif font-bold text-[10px] text-eco-primary tracking-widest leading-none">
                {SEASONS[stats.season]}
              </div>
              <div className="font-serif font-bold text-base text-ink-1 leading-none mt-1">
                {stats.year}
              </div>
            </div>
            <div className="text-[9px] font-mono uppercase text-ink-3">
              Runde <span className="font-bold text-ink-1 text-sm block">{stats.round}</span>
            </div>
          </div>
          
          {/* Mobile view */}
          <div className="flex sm:hidden flex-col bg-parch-0 border border-ink-1/15 rounded-md px-2 py-0.5 shadow-sm text-center">
            <span className="font-serif font-bold text-[9px] text-eco-primary leading-tight uppercase tracking-wider">
              {SEASONS[stats.season].slice(0, 4)}. {stats.year}
            </span>
            <span className="font-mono text-[8px] text-ink-2 leading-tight">
              Runde <span className="font-bold text-ink-0 text-xs">{stats.round}</span>
            </span>
          </div>
        </div>

        {/* Resource Indicators (Always compact, perfect for mobile and desktop) */}
        <div className="flex items-center gap-1.5 sm:gap-2">
          {/* Cash coin */}
          <div className="bg-parch-0 border border-ink-1/15 rounded-full px-2.5 py-1 sm:px-3 sm:py-1.5 flex items-center gap-1.5 sm:gap-2 shadow-sm">
            <span className="text-base sm:text-lg">💶</span>
            <div className="flex flex-col">
              <span className="font-mono text-xs sm:text-sm md:text-base font-bold leading-none text-ink-0">
                {stats.budget} €
              </span>
              <span className="text-[8px] text-ink-3 uppercase font-mono tracking-wider leading-none hidden sm:inline">
                Budget
              </span>
            </div>
          </div>

          {/* Research Flask */}
          <div className="bg-parch-0 border border-ink-1/15 rounded-full px-2.5 py-1 sm:px-3 sm:py-1.5 flex items-center gap-1.5 sm:gap-2 shadow-sm">
            <span className="text-base sm:text-lg">🧪</span>
            <div className="flex flex-col">
              <span className="font-mono text-xs sm:text-sm md:text-base font-bold leading-none text-res-primary font-bold">
                {stats.researchPoints}
              </span>
              <span className="text-[8px] text-ink-3 uppercase font-mono tracking-wider leading-none hidden sm:inline">
                Forschung
              </span>
            </div>
          </div>
        </div>

        {/* Mobile Toggle for Statistics */}
        <button
          onClick={() => setIsHeaderExpanded(!isHeaderExpanded)}
          className="flex lg:hidden items-center gap-1 bg-parch-1 border border-ink-1/15 hover:bg-parch-2 rounded-lg px-2 py-1 text-xs font-serif font-bold text-ink-1 transition-colors shadow-sm ml-auto select-none"
        >
          <span className="text-sm">📊</span>
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
              { label: 'Güte (WRRL)', value: `${stats.globalWrrl}%`, color: 'text-wat-primary', width: stats.globalWrrl },
              { label: 'Artenschutz (FFH)', value: `${stats.globalFfh}%`, color: 'text-eco-primary', width: stats.globalFfh },
              { label: 'Durchgängigkeit', value: `${stats.continuity}%`, color: 'text-fau-primary', width: stats.continuity },
              { label: 'Klimarisiko', value: `${stats.climateRisk}%`, color: 'text-red-700/80', width: stats.climateRisk }
            ].map(score => (
              <div key={score.label} className="bg-parch-0 border border-ink-1/15 rounded-lg p-2 min-w-[85px] sm:min-w-[110px] flex-1 lg:flex-initial shadow-sm flex flex-col justify-between">
                <span className="font-serif font-bold text-[8px] sm:text-[9px] text-ink-3 tracking-wider uppercase block leading-none">
                  {score.label}
                </span>
                <span className={`font-serif text-sm sm:text-lg font-bold leading-none mt-1 block ${score.color}`}>
                  {score.value}
                </span>
                {/* Dynamic colored loading visual microbar */}
                <div className="w-full h-1 bg-parch-3 rounded-full overflow-hidden mt-1.5">
                  <div 
                    className="h-full rounded-full transition-all duration-700"
                    style={{
                      width: `${score.width}%`,
                      backgroundColor: score.color.includes('wat') ? '#4a8fc4' : score.color.includes('eco') ? '#4aab82' : score.color.includes('fau') ? '#c4763a' : '#c44040'
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </header>

      {/* ── MAIN WORKSPACE: Split Sidebars ── */}
      <main className="flex-1 flex flex-col md:grid md:grid-cols-[104px_1fr_360px] gap-4 p-4 overflow-hidden">
        
        {/* LEFT COLUMN: Arche Nova Power Actions Strip */}
        <aside className="bg-parch-0 border border-ink-1/10 rounded-2xl p-3.5 flex flex-row md:flex-col gap-2.5 items-stretch justify-between overflow-x-auto md:overflow-y-auto tablet-scroll z-10 w-full md:w-auto shadow-md">
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
                  className={`flex-1 md:flex-initial p-2.5 rounded-lg border-2 text-center flex flex-col items-center justify-between gap-1.5 transition-all select-none min-w-[70px] ${
                    isSelected
                      ? 'bg-ink-1 text-parch-1 border-ink-1 shadow-lg scale-95 md:scale-100 translate-x-[2px]'
                      : 'bg-parch-1 border-ink-1/20 hover:border-ink-2 shadow-sm'
                  }`}
                >
                  <span className="text-2xl mt-0.5 filter drop-shadow">{card.emoji}</span>
                  <div className="flex flex-col">
                    <span className="text-[9px] font-mono uppercase tracking-wide leading-none select-none">
                      Punkte
                    </span>
                    <span className="text-lg font-serif font-bold leading-none select-none">
                      {card.strength}
                    </span>
                  </div>

                  {/* Pips visual meters */}
                  <div className="flex gap-0.5 justify-center mt-1">
                    {[1, 2, 3, 4, 5].map(idx => (
                      <div
                        key={idx}
                        className={`w-1 h-3 rounded-full ${
                          idx <= card.strength
                            ? isSelected ? 'bg-parch-1' : 'bg-eco-primary'
                            : 'bg-parch-3/60'
                        }`}
                      />
                    ))}
                  </div>

                  <span className="text-[8px] font-mono leading-none uppercase select-none opacity-80 max-w-[50px] overflow-hidden text-ellipsis whitespace-nowrap">
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
              className="p-1 rounded-full text-ink-3 hover:text-ink-0 active:bg-parch-3"
              title="Anleitung"
            >
              <HelpCircle className="w-5 h-5" />
            </button>
            <span className="text-[9px] font-serif text-ink-3">Guide</span>
          </div>
        </aside>

        {/* CENTER COLUMN: The Dynamic Interactive Sandbox Hex Map */}
        <section className="relative flex-1 bg-parch-1 border border-ink-1/10 rounded-2xl overflow-hidden flex flex-col shadow-md">
          {/* Map Filters Overlay */}
          <div className="absolute top-3 left-3 z-40 bg-parch-0/90 border border-ink-1/10 rounded-md flex items-center gap-1.5 p-1 px-1.5 shadow-md scale-90 sm:scale-100 backdrop-blur-sm">
            <span className="font-serif font-bold text-[10px] text-ink-2 uppercase tracking-wide mr-1 select-none">
              Atlas-Filter:
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
                className={`px-2.5 py-1 rounded text-[10px] font-serif font-semibold border ${
                  activeOverlay === overlay.id
                    ? 'bg-ink-1 text-parch-0 border-ink-1 shadow-sm'
                    : 'bg-parch-2/60 text-ink-1 hover:border-ink-1 border-transparent'
                }`}
              >
                {overlay.label}
              </button>
            ))}
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
        <aside className="bg-parch-0 border border-ink-1/10 rounded-2xl p-4 flex flex-col gap-3.5 overflow-y-auto tablet-scroll shadow-lg shrink-0 w-full md:w-[360px]">
          
          {/* Cell Inspection Detail card */}
          {selectedCoord && grid[selectedCoord.gy]?.[selectedCoord.gx] && (
            <div className="bg-parch-1 border border-ink-1/20 rounded-lg shadow-md flex flex-col transition-all duration-300">
              {/* Clickable Header */}
              <button 
                onClick={() => setIsInspectionOpen(!isInspectionOpen)}
                className="flex items-center justify-between w-full p-3 hover:bg-parch-2/50 text-left transition-colors font-serif font-bold text-sm text-ink-0 uppercase tracking-wider rounded-t-lg"
              >
                <div className="flex items-center gap-1.5 select-none text-ink-1">
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
                        {grid[selectedCoord.gy][selectedCoord.gx].cityName || 'Freies Ufer / Offenland'}
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
                        Klasse {grid[selectedCoord.gy][selectedCoord.gx].wrrl_quality.toFixed(1)}
                      </span>
                    </div>
                    <div className="bg-parch-1/70 border border-ink-1/10 rounded p-1.5">
                      <span className="font-mono text-[8px] text-ink-3 uppercase block leading-none">Biodiversität</span>
                      <span className="font-serif text-md font-bold mt-1 text-ink-1 block">
                        {grid[selectedCoord.gy][selectedCoord.gx].ffh_value}%
                      </span>
                    </div>
                  </div>

                  {/* Secondary data */}
                  <div className="text-xs text-ink-1 flex flex-col gap-1 border-t border-ink-1/10 pt-2 font-mono">
                    <div>Fahrflutrisiko: <span className="font-bold">{grid[selectedCoord.gy][selectedCoord.gx].flood_risk}</span></div>
                    {grid[selectedCoord.gy][selectedCoord.gx].buildingId && (
                      <div className="text-eco-primary font-serif font-bold text-[11px] mt-0.5 bg-eco-primary/5 p-1 rounded border border-eco-primary/15">
                        Aktive Belegung: {BUILDINGS_CATALOG.find(b => b.id === grid[selectedCoord.gy][selectedCoord.gx].buildingId)?.name || 'Papierfabrik'}
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
                    className={`p-2.5 rounded-lg border text-left flex flex-col ${
                      q.status === 'completed'
                        ? 'bg-green-50/50 border-green-200 text-green-950 opacity-60'
                        : 'bg-parch-0 border-ink-1/10 text-ink-0'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-1.5">
                      <span className="font-serif font-bold text-xs">
                        {q.title}
                      </span>
                      {q.status === 'completed' ? (
                        <span className="text-[9px] font-mono font-bold bg-green-200 text-green-800 rounded px-1 uppercase shrink-0">ERLEDIGT</span>
                      ) : (
                        <span className="text-[9px] font-mono font-bold bg-parch-3 text-ink-3 rounded px-1 uppercase shrink-0">AKTIV</span>
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
      <footer className="bg-parch-0/80 border border-ink-1/10 rounded-2xl p-3.5 mx-4 mb-4 flex flex-col md:grid md:grid-cols-[1fr_240px] gap-4 items-stretch justify-between shadow-lg z-20 backdrop-blur-md">
        
        {/* Horizontal scrollable measures catalog selection */}
        <div className="flex items-center gap-3">
          {selectedCardId === 'act_build' ? (
            <div className="w-full">
              <BuildCatalog
                onSelectBuilding={b => setSelectedBuilding(b)}
                selectedBuildingId={selectedBuilding?.id || null}
                budget={stats.budget}
                activeCardStrength={cards.find(c => c.id === 'act_build')?.strength || 1}
                unlockedResearchIds={researchNodes.filter(n => n.unlocked).map(n => n.id)}
              />
            </div>
          ) : (
            <div className="flex items-center justify-center p-4 bg-parch-3/30 border border-ink-1/10 rounded-xl w-full text-center py-6">
              <p className="font-serif italic text-ink-2 text-xs sm:text-sm">
                💡 Wähle die Aktionskarte <span className="font-bold text-ink-1">"Bauen & Errichten (🏗️)"</span> links aus, um den Baukatalog zu öffnen und Projekte an der Rur anzulegen.
              </p>
            </div>
          )}
        </div>

        {/* Global Turn Controls */}
        <div className="flex flex-col justify-between p-2.5 bg-parch-3 border border-ink-1/10 rounded-xl shrink-0">
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
                  ? 'bg-parch-0 text-ink-1 border-ink-1/20 hover:border-ink-1 active:bg-parch-2'
                  : 'bg-parch-2/40 text-ink-3/30 border-ink-1/10 cursor-not-allowed opacity-55'
              }`}
              title="Undoletzter Schritt"
            >
              <Undo className="w-5 h-5" />
            </button>

            {/* End Turn trigger */}
            <button
              onClick={handleEndTurn}
              className="flex-1 py-2.5 rounded-lg font-serif font-bold text-xs uppercase tracking-widest text-white bg-eco-primary hover:brightness-105 active:brightness-95 shadow-md flex items-center justify-center gap-1.5"
            >
              Nächste Runde →
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
          <div className="bg-parch-0 border-2 border-ink-1 rounded-xl shadow-2xl p-5 max-w-md w-full relative sm:p-6 paper-card">
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

    </div>
  );
}
