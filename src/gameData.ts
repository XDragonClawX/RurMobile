/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { BuildingType, ActionCard, ResearchNode, Quest, ClimateEvent, Species, TerrainType } from './types';

export const BUILDINGS_CATALOG: BuildingType[] = [
  // 🌿 ecology
  {
    id: 'altarm',
    name: 'Altarm-Anschluss',
    cost: 8,
    category: 'ecology',
    icon: '〰️',
    description: 'Verbindet alte Flussschleifen wieder mit der Rur.',
    effect: '+5% WRRL-Güte, +8% FFH-Wert, +4% Durchgängigkeit.',
    allowedTerrain: ['Water', 'Auwald', 'Wiese'] as TerrainType[]
  },
  {
    id: 'auenwald',
    name: 'Auenwald',
    cost: 5,
    category: 'ecology',
    icon: '🌲',
    description: 'Pflanzt standortgerechte Erlen & Eschen am See/Flussufer.',
    effect: '+3% FFH, +5% Feuchtigkeit, speichert CO₂ (−5t).',
    allowedTerrain: ['Wiese', 'Auwald', 'Acker'] as TerrainType[]
  },
  {
    id: 'totholz',
    name: 'Totholz-Eintrag',
    cost: 3,
    category: 'ecology',
    icon: '🪵',
    description: 'Sorgt für Struktur & Verstecke im Flusslauf.',
    effect: '+6% Artenvielfalt, +3% WRRL-Güte, geringe Kosten.',
    allowedTerrain: ['Water', 'Auwald'] as TerrainType[]
  },
  {
    id: 'ufer_entfesselung',
    name: 'Ufer-Entfesselung',
    cost: 6,
    category: 'ecology',
    icon: '🏞️',
    description: 'Beseitigt steinerne Uferbefestigungen für mehr Dynamik.',
    effect: '+7% WRRL, +4% FFH-Wert, senkt Flutrisiko.',
    allowedTerrain: ['Water', 'Auwald', 'Wiese'] as TerrainType[]
  },
  {
    id: 'kiesbett',
    name: 'Kieslaichbett',
    cost: 4,
    category: 'ecology',
    icon: '🪨',
    description: 'Schüttet Flusskies an Ausgängen von Bächen auf.',
    effect: '+8% Forellen-Bestand, +2% WRRL-Güte, billig.',
    allowedTerrain: ['Water', 'Auwald'] as TerrainType[]
  },

  // 🌊 water
  {
    id: 'fischpass',
    name: 'Fischpass / Fischtreppe',
    cost: 7,
    category: 'water',
    icon: '🐟',
    description: 'Ermöglicht Fischen das Umgehen von Wehren.',
    effect: '+15% Durchgängigkeit des gesamten Flusses!',
    allowedTerrain: ['Water'] as TerrainType[]
  },
  {
    id: 'deichrueck',
    name: 'Deichrückverlegung',
    cost: 10,
    category: 'water',
    icon: '🌊',
    description: 'Gibt dem Strom Platz, sich bei Hochwasser auszubreiten.',
    effect: 'Maximaler Hochwasserschutz im gesamten Segment, +8% FFH.',
    allowedTerrain: ['Wiese', 'Acker', 'Auwald'] as TerrainType[]
  },
  {
    id: 'polder',
    name: 'Retentionsraum / Polder',
    cost: 9,
    category: 'water',
    icon: '💧',
    description: 'Gesteuerter Überflutungsbereich bei Starkregen.',
    effect: 'Senkt das Klimarisiko drastisch um 15%.',
    allowedTerrain: ['Wiese', 'Acker', 'Auwald'] as TerrainType[]
  },
  {
    id: 'sohlgleite',
    name: 'Rauhe Sohlgleite',
    cost: 5,
    category: 'water',
    icon: '〰️',
    description: 'Ersetzt stufenartige Abstürze im Flussbett.',
    effect: '+10% Durchgängigkeit, −1 € Rabatt ab Forschung.',
    allowedTerrain: ['Water'] as TerrainType[]
  },
  {
    id: 'regenbecken',
    name: 'Regenrückhaltebecken',
    cost: 6,
    category: 'water',
    icon: '⚗️',
    description: 'Puffert Schmutz- & Regenwassereintrag bei Extremwetter.',
    effect: '+5% Biotopsicherheit, stoppt akuten Bakterieneintrag.',
    allowedTerrain: ['Wiese', 'Acker', 'Gewerbe'] as TerrainType[]
  },

  // 🦫 fauna
  {
    id: 'biber_station',
    name: 'Biber-Schutzstation',
    cost: 5,
    category: 'fauna',
    icon: '🦫',
    description: 'Schafft Ruhezonen für den eurasischen Baumeister.',
    effect: '+15% Biber-Bestand, +5% Artenvielfalt.',
    allowedTerrain: ['Auwald', 'Wiese', 'Water'] as TerrainType[]
  },
  {
    id: 'lachs_zucht',
    name: 'Lachs-Zuchtstation',
    cost: 8,
    category: 'fauna',
    icon: '🐟',
    description: 'Züchtet Junglachse für die Auswilderung in der Rur.',
    effect: 'Erhöht Lachs-Vorkommen massiv (braucht Durchgängigkeit!)',
    researchRequired: 'lachs_nrw',
    allowedTerrain: ['Water', 'Auwald'] as TerrainType[]
  },
  {
    id: 'eisvogel_nist',
    name: 'Eisvogel-Nisthilfe',
    cost: 3,
    category: 'fauna',
    icon: '🐦',
    description: 'Steile Brutwände an abgelegenen Prallufern einrichten.',
    effect: '+20% Eisvogel-Bestand, hohe Symbolwirkung (+4% Akzeptanz).',
    allowedTerrain: ['Auwald', 'Water'] as TerrainType[]
  },
  {
    id: 'insektenhotel',
    name: 'Insektenhotel & Blühstreifen',
    cost: 2,
    category: 'fauna',
    icon: '🌸',
    description: 'Nahrungs- & Nistplätze für heimische Bestäuber.',
    effect: '+10% Feuerfalter, sehr billig zu bauen.',
    allowedTerrain: ['Wiese', 'Acker', 'Auwald'] as TerrainType[]
  },
  {
    id: 'natura_zentrum',
    name: 'Natura-2000 Infozentrum',
    cost: 12,
    category: 'fauna',
    icon: '🏕️',
    description: 'Bürgerbündnis & Lehrpfad für Umweltbildung.',
    effect: '+22% Bürgerakzeptanz, dämpft den NIMBY-Effekt.',
    allowedTerrain: ['Wiese', 'Auwald', 'Acker', 'Siedlung'] as TerrainType[]
  },

  // 🏕️ tourism
  {
    id: 'oeko_tourismus',
    name: 'Öko-Tourismus-Station',
    cost: 6,
    category: 'tourism',
    icon: '🏕️',
    description: 'Naturerbe-Pfad mit begrenztem Zugang für Wanderer.',
    effect: '+1€ Rundeneinkommen, +6% Akzeptanz, −1% FFH-Druck.',
    allowedTerrain: ['Wiese', 'Auwald', 'Acker'] as TerrainType[]
  },
  {
    id: 'besucherzentrum',
    name: 'Besucherzentrum Rurtal',
    cost: 10,
    category: 'tourism',
    icon: '🧱',
    description: 'Großes Infocenter mit Gastronomie & Ausstellungen.',
    effect: '+2€ Rundeneinkommen, +12% Akzeptanz.',
    allowedTerrain: ['Wiese', 'Acker', 'Siedlung', 'Gewerbe'] as TerrainType[]
  },
  {
    id: 'campingplatz',
    name: 'Natur-Campingplatz',
    cost: 6,
    category: 'tourism',
    icon: '🏕️',
    description: 'Zeltwiese mit biologischer Abwasserklärung.',
    effect: '+1€ Einkommen, +5% Akzeptanz.',
    allowedTerrain: ['Wiese', 'Auwald'] as TerrainType[]
  },
  {
    id: 'kanuverleih',
    name: 'Kanuverleih & Anlegestelle',
    cost: 4,
    category: 'tourism',
    icon: '🛶',
    description: 'Gesteuerte Wässerungsstelle mit ausgewiesenen Schongebieten.',
    effect: '+1€ Einkommen, +4% Akzeptanz.',
    allowedTerrain: ['Water', 'Auwald', 'Wiese'] as TerrainType[]
  },

  // 🏭 economy
  {
    id: 'wasserkraft',
    name: 'Klein-Wasserkraftwerk',
    cost: 15,
    category: 'economy',
    icon: '☀️',
    description: 'Zerstörungsfreie Fischschnecken-Turbine am Wehr.',
    effect: '+2€ Einkommen, +10% Erneuerbare, schmerzt das WRRL etwas.',
    allowedTerrain: ['Water'] as TerrainType[]
  },
  {
    id: 'solarpark',
    name: 'Solarpark Düren-Rurwiese',
    cost: 7,
    category: 'economy',
    icon: '☀️',
    description: 'Photovoltaikanlage auf vormaligen Kies-Brachflächen.',
    effect: '+12% Erneuerbare, −25t CO₂; reduziert Ackerfläche.',
    allowedTerrain: ['Acker', 'Wiese', 'Gewerbe'] as TerrainType[]
  },
  {
    id: 'windkraft',
    name: 'Bürger-Windkraftanlage',
    cost: 12,
    category: 'economy',
    icon: '🌬️',
    description: 'Windrad im Hügelland aus genossenschaftlicher Hand.',
    effect: '+15% Erneuerbare, −35t CO₂; mäßige Akzeptanz.',
    allowedTerrain: ['Wiese', 'Acker'] as TerrainType[]
  },
  {
    id: 'intensiv_farm',
    name: 'Intensive Landwirtschaft',
    cost: 8,
    category: 'economy',
    icon: '🚜',
    description: 'Gülle- & Düngereinsatz für maximalen Getreideertrag.',
    effect: '+3€ Einkommen, aber ⚠ −8% WRRL-Güte (Überdüngung).',
    allowedTerrain: ['Acker', 'Wiese'] as TerrainType[]
  },
  {
    id: 'extensive_weide',
    name: 'Extensive Viehweide',
    cost: 4,
    category: 'economy',
    icon: '🐄',
    description: 'Robustes Glanvieh erhält Offenländer ohne Kunstdünger.',
    effect: '+1€ Einkommen, +5% FFH, harmonisch mit Naturschutz.',
    allowedTerrain: ['Wiese', 'Acker', 'Auwald'] as TerrainType[]
  },
  {
    id: 'klaerwerk_upgrade',
    name: 'Kläranlagen-Upgrade',
    cost: 14,
    category: 'economy',
    icon: '⚗️',
    description: 'Modernisierung der 4. Reinigungsstufe gegen Medikamente.',
    effect: 'Anheben der WRRL-Güte um massive +12% in Düren Mitte.',
    allowedTerrain: ['Gewerbe', 'Siedlung', 'Wiese'] as TerrainType[]
  },

  // 🚇 infrastructure
  {
    id: 'rurtalbahn_halt',
    name: 'Rurtalbahn-Haltepunkt',
    cost: 8,
    category: 'infrastructure',
    icon: '🚇',
    description: 'Erschließt abgelegene Uferteile für CO₂-freie Mobilität.',
    effect: 'Gibt 1 € Logistikrabatt für umgebende Bauten, −10t CO₂.',
    allowedTerrain: ['Wiese', 'Acker', 'Siedlung', 'Gewerbe', 'Auwald'] as TerrainType[]
  }
];

export const BUILDIONS_CATALOG = BUILDINGS_CATALOG; // Tippfehler-Alias behalten zur Sicherheit

export const INITIAL_ACTION_CARDS: ActionCard[] = [
  { id: 'act_funding', type: 'FUNDING', name: 'Förderung beantragen', emoji: '💶', strength: 1, position: 0 },
  { id: 'act_hydrology', type: 'HYDROLOGY', name: 'Wasser leiten', emoji: '💧', strength: 2, position: 1 },
  { id: 'act_plant', type: 'PLANT', name: 'Pflanzen & Aufwerten', emoji: '🌿', strength: 3, position: 2 },
  { id: 'act_research', type: 'RESEARCH', name: 'Gewässer-Forschung', emoji: '🔬', strength: 4, position: 3 },
  { id: 'act_build', type: 'BUILD', name: 'Bauen & Errichten', emoji: '🏗️', strength: 5, position: 4 }
];

export const RESEARCH_TECH_TREE: ResearchNode[] = [
  {
    id: 'biber_management',
    name: 'Biber-Management-Plan',
    cost: 5,
    unlocked: false,
    requirements: [],
    effect: 'Biber-Konflikte halbe Kosten, doppelte Naturpunkte',
    progress: 0
  },
  {
    id: 'lachs_nrw',
    name: 'Lachsprogramm NRW',
    cost: 8,
    unlocked: false,
    requirements: [],
    effect: 'Schaltet Lachs-Zuchtstation frei, +30% Lachs-Erfolg',
    progress: 0
  },
  {
    id: 'sohlgleiten_tech',
    name: 'Sohlgleiten-Technologie',
    cost: 6,
    unlocked: false,
    requirements: [],
    effect: 'Sohlgleiten werden 1 € günstiger, +10 FFH-Flusspunkte',
    progress: 0,
    buildingCostReduction: { buildingId: 'sohlgleite', reduction: 1 }
  },
  {
    id: 'green_energy_tech',
    name: 'Dürener Energiewende-Konzept',
    cost: 8,
    unlocked: false,
    requirements: [],
    effect: '+15% Erneuerbare, dämpft den CO₂-Fussabdruck',
    progress: 0
  },
  {
    id: 'auen_vitalisierung',
    name: 'Auen-Vitalisierung',
    cost: 10,
    unlocked: false,
    requirements: ['biber_management'],
    effect: 'Polder geben 100% Hochwasserschutz, Auwälder wachsen schneller',
    progress: 0
  },
  {
    id: 'mikroschadstoffe',
    name: 'Fortschr. Abwasserreinigung',
    cost: 12,
    unlocked: false,
    requirements: ['sohlgleiten_tech'],
    effect: 'Klärwerk-Upgrade gratis Unterhalt, WRRL +10% Bonus',
    progress: 0
  },
  {
    id: 'zerkall_faserzentrum',
    name: 'Faserinnovationszentrum',
    cost: 10,
    unlocked: false,
    requirements: ['green_energy_tech'],
    effect: '−15t CO2 pro Runde, +10% Bürgerakzeptanz',
    progress: 0
  },
  {
    id: 'schoeller_renat',
    name: 'Fabrik-Transformationskonzept',
    cost: 18,
    unlocked: false,
    requirements: ['lachs_nrw', 'mikroschadstoffe'],
    effect: 'Schaltet Fabrik-Option "Vollständige Renaturierung" frei',
    progress: 0
  }
];

export const BIOTOP_SPECIES: Species[] = [
  {
    name: 'Bachforelle / Groppe',
    pct: 45,
    color: 'var(--eco)',
    dotColor: '#4aab82',
    locked: false,
    requirementsText: 'Braucht sauberes Wasser (WRRL und FFH im Oberlauf > 50%)'
  },
  {
    name: 'Eurasischer Biber',
    pct: 30,
    color: 'var(--fau)',
    dotColor: '#c4763a',
    locked: false,
    requirementsText: 'Benötigt Auwälder (mind. 3 Auwald-Zellen platziert)'
  },
  {
    name: 'Blauschillernder Feuerfalter',
    pct: 20,
    color: 'var(--res)',
    dotColor: '#8a6ab8',
    locked: false,
    requirementsText: 'Nistet auf extensivem Grünland (Spezial-Blühstreifen nötig)'
  },
  {
    name: 'Eisvogel',
    pct: 55,
    color: 'var(--wat)',
    dotColor: '#4a8fc4',
    locked: false,
    requirementsText: 'Steilufer ohne Plattenverbau (Ufer-Entfesselungen am Wasser)'
  },
  {
    name: 'Atlantischer Lachs 🔒',
    pct: 2,
    color: 'var(--ink-3)',
    dotColor: '#b08a5a',
    locked: true,
    requirementsText: 'Braucht Durchgängigkeit ≥ 60%, Zuchtstation, Fabrik-Transformation'
  }
];

export const CLIMATE_EVENTS_DATA: ClimateEvent[] = [
  {
    id: 'hochwasser',
    title: 'Extrem-Hochwasser — Sturmtief Christian',
    type: 'Katastrophe',
    description: 'Unerwartete Regenmassen überfordern die Rur-Deiche! In Jülich drohen Keller vollzulaufen. Wie reagiert die Renaturierungsbehörde?',
    choices: [
      {
        text: 'Nichts tun (Kostet nichts)',
        cost: 0,
        effectText: 'Ufernahe Weiden überschwemmt, Bürgerakzeptanz sinkt um 15%, FFH-Wert verliert 8%.',
        effect: { acceptanceChange: -15, ffhChange: -8, natureChange: -4 }
      },
      {
        text: 'Notdeiche errichten lassen (Kostet 8 €)',
        cost: 8,
        effectText: 'Stabilisiert die Siedlungen. Keine Akzeptanzverluste, aber hoher Budget-Aderlass.',
        effect: { budgetChange: -8, acceptanceChange: 5 }
      },
      {
        text: 'Aktivieren von Flutpoldern (Kostet 3 €)',
        cost: 3,
        effectText: 'Perfekte Verteilung! Hochwasser weicht sanft in Flutwiesen aus. +10% Akzeptanz, +8% FFH.',
        effect: { budgetChange: -3, acceptanceChange: 10, ffhChange: 8, natureChange: 8 }
      }
    ]
  },
  {
    id: 'duerre',
    title: 'Jahrhundert-Dürresommer',
    type: 'Klimakrise',
    description: 'Die Pegel der Rur fallen auf Rekordtiefststände! Das Wasser erwärmt sich rapide, Fische drohen zu ersticken.',
    choices: [
      {
        text: 'Tiefenwasser-Zuleitung anordnen (4 €)',
        cost: 4,
        effectText: 'Kühles Tiefenwasser aus Talsperren stabilisiert den Fluss. WRRL verbessert sich um 5%.',
        effect: { budgetChange: -4, wrrlChange: 5 }
      },
      {
        text: 'Beschränkung der Entnahme (Kostet 0 €)',
        cost: 0,
        effectText: 'Industrie & Farmer klagen lautstark! Akzeptanz sinkt um 10%, dafür atmet das Ökosystem auf (+4% FFH).',
        effect: { acceptanceChange: -10, ffhChange: 4 }
      },
      {
        text: 'Not-Abfischung & Beschattung (3 🧪)',
        cost: 0,
        researchCost: 3,
        effectText: 'Dank Forschungserkenntnissen retten wir die Bachforellen. +12% Forellenbestand, +5% FFH.',
        effect: { researchChange: -3, ffhChange: 5, natureChange: 10 }
      }
    ]
  },
  {
    id: 'biber_schaden',
    title: 'Biber-Konflikt auf Weidenfeld',
    type: 'Bürgerdialog',
    description: 'Ein frisch ansässiger Biber hat das Entwässerungsrohr eines Bauern verstopft. Die Wiese steht komplett unter Wasser. Der Bauer ist wütend!',
    choices: [
      {
        text: 'Biber vertreiben oder schießen (Kostet 0 €)',
        cost: 0,
        effectText: 'Bauer ist glücklich (+10% Akzeptanz), aber schmerzt den Artenschutz massiv (Biber-Bestand bricht ein).',
        effect: { acceptanceChange: 10, ffhChange: -12 }
      },
      {
        text: 'Drainagen-Biberberater entsenden (3 €)',
        cost: 3,
        effectText: 'Installation eines "Drahtkorbs". Rohr bleibt frei, Biber darf bleiben. +10% FFH, +12% Akzeptanz.',
        effect: { budgetChange: -3, ffhChange: 10, acceptanceChange: 12, natureChange: 5 }
      },
      {
        text: 'Weidensubvention als Ausgleich zahlen (0 €)',
        cost: 0,
        effectText: 'Die Weide wird einfach in eine Biodiversitätswiese konvertiert. Kostet nichts dank Biberplanforschung. +15% FFH!',
        effect: { ffhChange: 15, natureChange: 12 }
      }
    ]
  },
  {
    id: 'buergerprotest',
    title: 'NIMBY Protest: "Kein Auenurwald vor unserem Fenster!"',
    type: 'Bürgerprotest',
    description: 'Bürger fürchten Stechmücken-Plagen und entgangene Ackernutzungen durch die neuen Auenwaldprojekte.',
    choices: [
      {
        text: 'Projekt reduzieren (Kostet 0 €)',
        cost: 0,
        effectText: 'Protest flaut ab, Bürger sind besänftigt. Aber Renaturierung stagniert (-4% FFH).',
        effect: { acceptanceChange: 10, ffhChange: -4 }
      },
      {
        text: 'Bürger-Lehrpfad & Umweltzentrum bauen (10 €)',
        cost: 10,
        effectText: 'Stellt Kritiker in die Verantwortung. Akzeptanz schießt um 25% nach oben.',
        effect: { budgetChange: -10, acceptanceChange: 25, natureChange: 15 }
      },
      {
        text: 'Wissenschaftlicher Vortragsabend (2 🧪)',
        cost: 0,
        researchCost: 2,
        effectText: 'Sorgt für begründete Aufklärung. Nimmt den Wind aus den Segeln der Initiatoren. +12% Akzeptanz.',
        effect: { researchChange: -2, acceptanceChange: 12 }
      }
    ]
  }
];

export const STAKEHOLDER_QUESTS_DATA: Quest[] = [
  {
    id: 'quest_schoellershammer',
    title: 'Schoellershammer Pfad',
    description: 'Modernisiere die Papierfabrik Schoellershammer oder rüste sie um, um die schädliche Belastung in Düren-Mitte zu drosseln.',
    rewardText: 'Belohnung: +6 🧪 Forschungspunkte & +10% WRRL-Güte in ganz Düren.',
    status: 'active',
    reward: { research: 6, nature: 15, acceptance: 5 }
  },
  {
    id: 'quest_mikroschadstoffe',
    title: 'Mikroschadstoffe drosseln',
    description: 'Baue ein Kläranlagen-Upgrade im mittleren Flusssegment, um pharmazeutische Rückstände abzufangen.',
    rewardText: 'Belohnung: +12% globale Gewässerqualität (WRRL), +5% Akzeptanz.',
    status: 'available',
    requiredBuildingId: 'klaerwerk_upgrade',
    reward: { budget: 4, research: 2, nature: 20, acceptance: 5 }
  },
  {
    id: 'quest_rurtalbahn',
    title: 'Rurtalbahn Ausbau',
    description: 'Errichte einen Rurtalbahn-Haltepunkt an einer Zelle im landschaftlich reizvollen Oberlauf (y > 10).',
    rewardText: 'Belohnung: Reduziert Transportkosten umgebender Bauten dauerhaft um 1€.',
    status: 'available',
    requiredBuildingId: 'rurtalbahn_halt',
    reward: { budget: 2, research: 1, nature: 10, acceptance: 8 }
  }
];

// ── Factory Mode Definitions ──────────────────────────────────────────────────
export type FactoryModeKey = 'Vollbetrieb' | 'Umrüstung' | 'Stilllegung' | 'Renaturierung';

export interface FactoryModeDefinition {
  label: string;
  icon: string;
  roundIncome: number;        // € per turn (positive = income, negative = cost)
  researchPerRound: number;   // 🧪 per turn
  wrrlEffectPerTurn: number;  // WRRL quality delta per turn on Düren water tiles
  acceptanceBonus: number;    // one-time acceptance change on mode switch
  switchCost: number;         // one-time budget cost to switch to this mode
  /** Rounds the mode stays locked after switching */
  cooldownRounds: number;
  description: string;
  flavor: string;
}

export const FACTORY_MODES: Record<FactoryModeKey, FactoryModeDefinition> = {
  Vollbetrieb: {
    label: 'Vollbetrieb',
    icon: '🏭',
    roundIncome: 15,
    researchPerRound: 0,
    wrrlEffectPerTurn: +0.45,   // pollutes river
    acceptanceBonus: +10,
    switchCost: 0,
    cooldownRounds: 0,
    description: '+15 €/Runde, +10% Akzeptanz, −15% WRRL im Fluss',
    flavor: 'Die Papierindustrie läuft unter Volldampf für maximale Wirtschaftlichkeit.'
  },
  Umrüstung: {
    label: 'Umrüstung',
    icon: '🔧',
    roundIncome: 5,
    researchPerRound: 1,
    wrrlEffectPerTurn: 0,
    acceptanceBonus: +5,
    switchCost: 0,
    cooldownRounds: 2,
    description: '+5 €/Runde, +1 🧪/Runde, keine Gewässerschäden mehr',
    flavor: 'Moderne Filteranlagen und ressourceneffiziente Kreisprozesse werden etabliert und schonen die Rur.'
  },
  Stilllegung: {
    label: 'Stilllegung',
    icon: '⏸️',
    roundIncome: 0,
    researchPerRound: 0,
    wrrlEffectPerTurn: 0,
    acceptanceBonus: -15,
    switchCost: 0,
    cooldownRounds: 1,
    description: '0 €/Runde, −15% Akzeptanz (Arbeitsplatzverlust), WRRL neutral',
    flavor: 'Eine temporäre Produktionspause entlastet das lokale Gewässerbiotop.'
  },
  Renaturierung: {
    label: 'Renaturierung',
    icon: '🌿',
    roundIncome: -4,
    researchPerRound: 0,
    wrrlEffectPerTurn: -0.55,   // purifies river
    acceptanceBonus: +5,
    switchCost: 4,
    cooldownRounds: 0,
    description: '−4 € Einmalkosten, +15% WRRL-Qualität, +25% Lachsansiedlung',
    flavor: 'Vollständiger Rückbau und Renaturierung der Industriebrache am Dürener Mittellauf.'
  }
};

// ── Helper: Get effective building cost (applies research discounts) ──────────
/**
 * Returns the final cost of a building after applying:
 *  1. The BUILD action card's strength discount (str 3-4 → −1€, str 5 → −2€)
 *  2. Any unlocked ResearchNode.buildingCostReduction for this building
 */
export function getEffectiveCost(
  building: BuildingType,
  buildCardStrength: number,
  unlockedNodes: ResearchNode[]
): number {
  const strDiscount = buildCardStrength >= 5 ? 2 : buildCardStrength >= 3 ? 1 : 0;
  const researchDiscount = unlockedNodes
    .filter(n => n.unlocked && n.buildingCostReduction?.buildingId === building.id)
    .reduce((sum, n) => sum + (n.buildingCostReduction?.reduction ?? 0), 0);
  return Math.max(1, building.cost - strDiscount - researchDiscount);
}

// ── Helper: Rotate action cards (Arche Nova slide rule) ──────────────────────
/**
 * Applies the Arche Nova card slide rule:
 *  - Played card moves to position 0 / strength 1
 *  - All cards that were at a lower position than the played card
 *    advance one position (and gain +1 strength)
 * Returns the updated card array sorted by position.
 */
export function rotateActionCard(
  cards: ActionCard[],
  playedCardId: string
): ActionCard[] {
  const played = cards.find(c => c.id === playedCardId);
  if (!played) return cards;
  const oldPosition = played.position;

  const updated = cards.map(c => {
    if (c.id === playedCardId) {
      return { ...c, position: 0, strength: 1 };
    }
    if (c.position < oldPosition) {
      const newPos = c.position + 1;
      return { ...c, position: newPos, strength: newPos + 1 };
    }
    return c;
  });

  return [...updated].sort((a, b) => a.position - b.position);
}

export const TUTORIAL_STEPS = [
  {
    title: 'Willkommen bei RurNova!',
    text: 'Du bist die Leitung der Renaturierungsbehörde Kreis Düren. Dein Ziel: Die Rur, ein Fluss mit reicher Geschichte, wieder naturnah zu machen!'
  },
  {
    title: 'Das Arche-Nova-Kartenprinzip',
    text: 'Unten/Links links siehst du deine 5 Aktionskarten. Wenn du eine Karte spielst, rutscht sie auf Stärke 1 herab, während die anderen Karten aufrücken und stärker werden (max. Stärke 5). Plane voraus!'
  },
  {
    title: 'Das Hex-Spielfeld',
    text: 'Die Rur fließt von Süden (Eifel-Oberlauf, unten-rechts) nach Norden (Jülicher Tiefland, oben-links). Schoellershammer liegt bei Düren-Mitte. Klicke Kacheln auf dem Tablet an, um Details zu sehen!'
  },
  {
    title: 'Bauen & Upgraden',
    text: 'Wähle im Baukatalog (unten) eine Maßnahme aus und baue sie auf einer passenden Kachel. Je höher die Stärke der "BAU"-Aktionskarte, desto billiger wird das Errichten.'
  }
];
