/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useRef, useEffect, useState, MouseEvent, TouchEvent } from 'react';
import { TileData, TerrainType, BuildingType } from '../types';
import { BUILDINGS_CATALOG } from '../gameData';
import { HelpCircle, X, Move, MousePointerClick, ZoomIn, Eye, Map, ArrowUp, ArrowDown, ArrowLeft, ArrowRight, Target } from 'lucide-react';

interface IsometricMapProps {
  grid: TileData[][];
  selectedTile: { gx: number; gy: number } | null;
  onSelectTile: (gx: number, gy: number) => void;
  activeOverlay: 'none' | 'wrrl' | 'ffh' | 'flood';
  selectedBuilding?: BuildingType | null;
}

// Fixed dimensions for modern symmetric pointy-top hex grid (Tactical 2D bird's-eye view!)
const HEX_W = 90;
const HEX_H = 104;

const T_STYLE: Record<TerrainType, { fill: string; stroke: string; accent: string }> = {
  Water:    { fill: '#3a82be', stroke: '#205c90', accent: '#cbe3f5' },
  Wiese:    { fill: '#73cf45', stroke: '#408020', accent: '#c6efad' },
  Auwald:   { fill: '#235c1d', stroke: '#12360f', accent: '#72ab68' },
  Acker:    { fill: '#edd65e', stroke: '#a8851c', accent: '#faecc0' },
  Gewerbe:  { fill: '#808c90', stroke: '#454c50', accent: '#d5dcde' },
  Siedlung: { fill: '#e07638', stroke: '#904018', accent: '#fcd3c1' },
};

const T_NAMES: Record<TerrainType, string> = {
  Water: 'Rur-Flussbett',
  Wiese: 'Uferwiese',
  Auwald: 'Auwald-Biotop',
  Acker: 'Landwirtschaft',
  Gewerbe: 'Gewerbegebiet',
  Siedlung: 'Wohnsiedlung',
};

const T_EMOJIS: Record<TerrainType, string> = {
  Water: '💧',
  Wiese: '🌾',
  Auwald: '🌲',
  Acker: '🚜',
  Gewerbe: '🏭',
  Siedlung: '🏡',
};

// Cities markers (gx, gy, name)
const CITIES: [number, number, string][] = [
  [12, 14, 'Heimbach (Oberlauf)'],
  [4, 12, 'Kreuzau'],
  [10, 8, 'Düren Zentrum'],
  [3, 8, 'Schoellershammer 🏭'],
  [9, 4, 'Jülich (Mitte)'],
  [2, 1, 'Linnich (Unterlauf)'],
];

// Helper to draw deterministic pseudo-random numbers based on tile coordinates
const getTileSeed = (gx: number, gy: number) => {
  return Math.sin(gx * 12.9898 + gy * 78.233) * 43758.5453;
};

// Vector styles for mini game illustrations (Stylized 2D top-down flat design)
const drawMiniGrass = (ctx: CanvasRenderingContext2D, tx: number, ty: number, zoom: number, color: string) => {
  ctx.strokeStyle = color;
  ctx.lineWidth = 1 * zoom;
  ctx.lineCap = 'round';
  ctx.beginPath();
  // flat blade 1
  ctx.moveTo(tx - 2 * zoom, ty + 2 * zoom);
  ctx.lineTo(tx - 1 * zoom, ty - 3 * zoom);
  // flat blade 2
  ctx.moveTo(tx, ty + 2 * zoom);
  ctx.lineTo(tx, ty - 5 * zoom);
  // flat blade 3
  ctx.moveTo(tx + 2 * zoom, ty + 2 * zoom);
  ctx.lineTo(tx + 1 * zoom, ty - 3 * zoom);
  ctx.stroke();
};

const drawMiniFlower = (ctx: CanvasRenderingContext2D, tx: number, ty: number, zoom: number) => {
  const r = 2.2 * zoom;
  ctx.fillStyle = '#ffffff';
  // Draw 5 circular petals
  for (let i = 0; i < 5; i++) {
    const angle = (i * Math.PI * 2) / 5;
    const px = tx + Math.cos(angle) * r;
    const py = ty + Math.sin(angle) * r;
    ctx.beginPath();
    ctx.arc(px, py, 1.6 * zoom, 0, Math.PI * 2);
    ctx.fill();
  }
  // Draw middle center
  ctx.fillStyle = '#f59e0b';
  ctx.beginPath();
  ctx.arc(tx, ty, r * 0.75, 0, Math.PI * 2);
  ctx.fill();
};

const drawFlatStar = (ctx: CanvasRenderingContext2D, cx: number, cy: number, rOut: number, rIn: number, points: number) => {
  ctx.beginPath();
  const angleStep = Math.PI / points;
  for (let i = 0; i < 2 * points; i++) {
    const angle = i * angleStep;
    const r = i % 2 === 0 ? rOut : rIn;
    const x = cx + Math.cos(angle) * r;
    const y = cy + Math.sin(angle) * r;
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.closePath();
  ctx.fill();
};

const drawMiniPine = (ctx: CanvasRenderingContext2D, tx: number, ty: number, size: number, zoom: number) => {
  const r = size * 1.5 * zoom;
  ctx.save();
  // Drop shadow
  ctx.fillStyle = 'rgba(0,0,0,0.13)';
  ctx.beginPath();
  ctx.ellipse(tx + 1.2*zoom, ty + 2.5*zoom, r*0.9, r*0.45, 0, 0, Math.PI * 2);
  ctx.fill();

  // Trunk
  ctx.fillStyle = '#3a200a';
  ctx.fillRect(tx - 0.7*zoom, ty, 1.4*zoom, r*0.65);

  // Pine leaves - concentric multi-tiered stars with nice color variance and subtle highlights
  ctx.fillStyle = '#051808'; // Deepest shadow bottom layer
  drawFlatStar(ctx, tx, ty - 0.5*zoom, r * 1.05, r * 0.5, 6);
  ctx.fillStyle = '#0a2710'; // Core layer
  drawFlatStar(ctx, tx, ty - 2.2*zoom, r * 0.85, r * 0.4, 6);
  ctx.fillStyle = '#113e19'; // Light mid layer
  drawFlatStar(ctx, tx, ty - 3.8*zoom, r * 0.65, r * 0.3, 6);
  ctx.fillStyle = '#1b5e26'; // Sunlit layer
  drawFlatStar(ctx, tx, ty - 5.2*zoom, r * 0.45, r * 0.2, 6);
  
  // Highlight sunrise tip
  ctx.fillStyle = '#8ce85d';
  ctx.beginPath();
  ctx.arc(tx - 0.3*zoom, ty - 5.8*zoom, r * 0.16, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
};

const drawMiniOak = (ctx: CanvasRenderingContext2D, tx: number, ty: number, size: number, zoom: number) => {
  const r = size * 1.6 * zoom;
  ctx.save();
  // Drop shadow
  ctx.fillStyle = 'rgba(0, 0, 0, 0.12)';
  ctx.beginPath();
  ctx.ellipse(tx + 1.2*zoom, ty + 2.2*zoom, r*1.05, r*0.48, 0, 0, Math.PI * 2);
  ctx.fill();

  // Wooden trunk
  ctx.fillStyle = '#4c2e1b';
  ctx.fillRect(tx - 0.9*zoom, ty, 1.8*zoom, r * 0.55);

  // Soft leafy puff circles with rich depth and light highlights
  ctx.fillStyle = '#0d2205'; // Deep shadow
  ctx.beginPath();
  ctx.arc(tx, ty - 1.8*zoom, r, 0, Math.PI * 2);
  ctx.arc(tx + r*0.3, ty - r*0.5, r*0.7, 0, Math.PI*2);
  ctx.fill();

  ctx.fillStyle = '#1d420c'; // Medium foliage
  ctx.beginPath();
  ctx.arc(tx - 0.5*zoom, ty - 2.8*zoom, r * 0.82, 0, Math.PI * 2);
  ctx.arc(tx + r*0.1, ty - r*0.7, r*0.65, 0, Math.PI*2);
  ctx.fill();

  ctx.fillStyle = '#336a18'; // Sunlit canopy
  ctx.beginPath();
  ctx.arc(tx - 1.2*zoom, ty - 3.8*zoom, r * 0.65, 0, Math.PI * 2);
  ctx.arc(tx - 0.2*zoom, ty - r*0.9, r*0.52, 0, Math.PI*2);
  ctx.fill();

  // Vibrant golden sunshine tips (top-left lit)
  ctx.fillStyle = '#7ac037';
  ctx.beginPath();
  ctx.arc(tx - 1.9*zoom, ty - 4.5*zoom, r * 0.35, 0, Math.PI * 2);
  ctx.arc(tx - 0.8*zoom, ty - r*1.1, r*0.28, 0, Math.PI*2);
  ctx.fill();

  ctx.restore();
};

const drawMiniAutumnMaple = (ctx: CanvasRenderingContext2D, tx: number, ty: number, size: number, zoom: number) => {
  const r = size * 1.5 * zoom;
  ctx.save();
  // Drop shadow
  ctx.fillStyle = 'rgba(0, 0, 0, 0.12)';
  ctx.beginPath();
  ctx.ellipse(tx + 1.2*zoom, ty + 2.4*zoom, r*1.05, r*0.48, 0, 0, Math.PI * 2);
  ctx.fill();

  // Wooden trunk
  ctx.fillStyle = '#3a200a';
  ctx.fillRect(tx - 0.8*zoom, ty, 1.6*zoom, r * 0.55);

  // Beautiful cozy autumn gradient layers (deep amber-red up to brilliant golden-yellow!)
  ctx.fillStyle = '#650900'; // Deep crimson auburn shadow
  ctx.beginPath();
  ctx.arc(tx, ty - 1.8*zoom, r, 0, Math.PI * 2);
  ctx.arc(tx + r*0.3, ty - r*0.4, r*0.7, 0, Math.PI*2);
  ctx.fill();

  ctx.fillStyle = '#a63e0b'; // Warm burnt orange
  ctx.beginPath();
  ctx.arc(tx - 0.5*zoom, ty - 2.8*zoom, r * 0.82, 0, Math.PI * 2);
  ctx.arc(tx + r*0.1, ty - r*0.7, r*0.62, 0, Math.PI*2);
  ctx.fill();

  ctx.fillStyle = '#d96c14'; // Bright amber
  ctx.beginPath();
  ctx.arc(tx - 1.2*zoom, ty - 3.8*zoom, r * 0.65, 0, Math.PI * 2);
  ctx.arc(tx - 0.2*zoom, ty - r*0.9, r*0.5, 0, Math.PI*2);
  ctx.fill();

  // Bright golden-yellow sunshine spots
  ctx.fillStyle = '#fbbf24';
  ctx.beginPath();
  ctx.arc(tx - 1.9*zoom, ty - 4.4*zoom, r * 0.35, 0, Math.PI * 2);
  ctx.arc(tx - 0.8*zoom, ty - r*1.1, r*0.28, 0, Math.PI*2);
  ctx.fill();

  ctx.restore();
};

const drawMiniBirch = (ctx: CanvasRenderingContext2D, tx: number, ty: number, size: number, zoom: number) => {
  const r = size * 1.35 * zoom;
  ctx.save();
  // Drop shadow
  ctx.fillStyle = 'rgba(0, 0, 0, 0.1)';
  ctx.beginPath();
  ctx.ellipse(tx + 1.0*zoom, ty + 2.0*zoom, r*1.0, r*0.45, 0, 0, Math.PI * 2);
  ctx.fill();

  // White paper bark trunk with fine dark knots
  ctx.fillStyle = '#f8fafc'; // Pristine white-silver
  ctx.fillRect(tx - 0.6*zoom, ty, 1.2*zoom, r * 0.65);
  ctx.fillStyle = '#1e293b'; // Charcoal knots
  ctx.fillRect(tx - 0.6*zoom, ty + r * 0.15, 0.5*zoom, 0.4*zoom);
  ctx.fillRect(tx + 0.1*zoom, ty + r * 0.35, 0.5*zoom, 0.4*zoom);

  // Delightful bright lime/chartreuse birch foliage layers
  ctx.fillStyle = '#142f07'; // Core dark shadow
  ctx.beginPath();
  ctx.arc(tx, ty - 2.0*zoom, r, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = '#4c8c15'; // Lush medium green
  ctx.beginPath();
  ctx.arc(tx - 0.4*zoom, ty - 3.1*zoom, r * 0.82, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = '#84cc16'; // Fresh bright lime
  ctx.beginPath();
  ctx.arc(tx - 1.0*zoom, ty - 3.9*zoom, r * 0.62, 0, Math.PI * 2);
  ctx.fill();

  // Golden spring sprout tip
  ctx.fillStyle = '#ca8a04';
  ctx.beginPath();
  ctx.arc(tx - 1.5*zoom, ty - 4.3*zoom, r * 0.28, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();
};

const drawMiniHouse = (ctx: CanvasRenderingContext2D, tx: number, ty: number, zoom: number, roofColor = '#e25c5c', roofDarkColor = '#bf4343') => {
  const w = 7.5 * zoom;
  const h = 5.2 * zoom;
  ctx.save();
  // Shadow
  ctx.fillStyle = 'rgba(0, 0, 0, 0.11)';
  ctx.beginPath();
  ctx.ellipse(tx + 1.8*zoom, ty + 2.8*zoom, w*1.2, h*1.1, 0, 0, Math.PI * 2);
  ctx.fill();

  // Main white / cream stucco walls (extruded 3D base!)
  ctx.fillStyle = '#fbfaf6';
  ctx.strokeStyle = '#dfdbcf';
  ctx.lineWidth = 0.5 * zoom;
  ctx.fillRect(tx - w * 0.85, ty - h * 0.2, w * 1.7, h * 1.35);
  ctx.strokeRect(tx - w * 0.85, ty - h * 0.2, w * 1.7, h * 1.35);

  // Cozy historic timber-framed texture (Fachwerk!)
  ctx.strokeStyle = '#4a2c11';
  ctx.lineWidth = 0.65 * zoom;
  ctx.beginPath();
  // Timber frame side braces and columns
  ctx.moveTo(tx - w*0.8, ty - h*0.2);
  ctx.lineTo(tx - w*0.4, ty + h*1.1);
  ctx.moveTo(tx + w*0.8, ty - h*0.2);
  ctx.lineTo(tx + w*0.4, ty + h*1.1);
  ctx.moveTo(tx - w*0.1, ty - h*0.2);
  ctx.lineTo(tx - w*0.1, ty + h*1.15);
  ctx.stroke();

  // Cozy yellow glowing windows + fine window frames
  ctx.fillStyle = '#fef08a'; // Glowing light
  ctx.fillRect(tx - w*0.4, ty + h*0.2, 1.8*zoom, 1.8*zoom);
  ctx.fillRect(tx + w*0.15, ty + h*0.2, 1.8*zoom, 1.8*zoom);
  ctx.strokeStyle = '#573010';
  ctx.lineWidth = 0.4 * zoom;
  ctx.strokeRect(tx - w*0.4, ty + h*0.2, 1.8*zoom, 1.8*zoom);
  ctx.strokeRect(tx + w*0.15, ty + h*0.2, 1.8*zoom, 1.8*zoom);

  // Two halves of the pitched roof
  // Top slope (roofColor - bright)
  ctx.fillStyle = roofColor;
  ctx.beginPath();
  ctx.moveTo(tx - w, ty - h * 0.2);
  ctx.lineTo(tx + w, ty - h * 0.2);
  ctx.lineTo(tx + w * 0.85, ty - h * 1.25);
  ctx.lineTo(tx - w * 0.85, ty - h * 1.25);
  ctx.closePath();
  ctx.fill();

  // Slate/tile details on the pitched roof (luxury texture lines!)
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.16)';
  ctx.lineWidth = 0.5 * zoom;
  for (let rIdx = 1; rIdx <= 3; rIdx++) {
    const fraction = rIdx / 4;
    ctx.beginPath();
    ctx.moveTo(tx - w * (1 - fraction * 0.15), ty - h * (0.2 + fraction * 1.05));
    ctx.lineTo(tx + w * (1 - fraction * 0.15), ty - h * (0.2 + fraction * 1.05));
    ctx.stroke();
  }

  // Bottom slope shading layer
  ctx.fillStyle = roofDarkColor;
  ctx.beginPath();
  ctx.moveTo(tx - w, ty - h * 0.1);
  ctx.lineTo(tx + w, ty - h * 0.1);
  ctx.lineTo(tx + w, ty + h * 0.25);
  ctx.lineTo(tx - w, ty + h * 0.25);
  ctx.closePath();
  ctx.fill();

  // Stone chimney
  ctx.fillStyle = '#5c5e62';
  ctx.fillRect(tx + w * 0.35, ty - h * 1.4, 2 * zoom, 3.2 * zoom);
  ctx.fillStyle = '#1e293b'; // inside pipe
  ctx.fillRect(tx + w * 0.35, ty - h * 1.45, 2 * zoom, 0.6 * zoom);

  // Smooth, cozy, animated rising smoke column!
  const smokeOsc1 = 1 + Math.sin(Date.now() / 240) * 0.16;
  const smokeOsc2 = 1 + Math.cos(Date.now() / 185) * 0.22;
  const smokeX = tx + w * 0.45;
  const smokeY = ty - h * 1.7;
  
  ctx.fillStyle = 'rgba(240, 240, 240, 0.42)';
  ctx.beginPath();
  ctx.arc(smokeX, smokeY, 1.8 * zoom * smokeOsc1, 0, Math.PI*2);
  ctx.arc(smokeX + 2*zoom, smokeY - 3*zoom, 2.5 * zoom * smokeOsc2, 0, Math.PI*2);
  ctx.fill();

  ctx.restore();
};

const drawMiniFactory = (ctx: CanvasRenderingContext2D, tx: number, ty: number, zoom: number) => {
  const w = 9.5 * zoom;
  const h = 7.5 * zoom;
  ctx.save();
  // Drop shadow
  ctx.fillStyle = 'rgba(0, 0, 0, 0.14)';
  ctx.fillRect(tx - w + 1.5 * zoom, ty - h + 1.8 * zoom, w * 2.1, h * 2.1);

  // Red brick walls (Ancien regime / classic industrial feel!)
  ctx.fillStyle = '#9a3412'; // Brick orange-brown
  ctx.strokeStyle = '#641e06';
  ctx.lineWidth = 0.5 * zoom;
  ctx.fillRect(tx - w, ty - h * 0.25, w * 2, h * 1.25);
  ctx.strokeRect(tx - w, ty - h * 0.25, w * 2, h * 1.25);

  // Windows representing a real industrial hall
  ctx.fillStyle = '#0f172a'; // dark window slots
  for (let i = -2; i <= 2; i++) {
    if (i === 0) continue;
    ctx.fillRect(tx + i * w * 0.38 - 1*zoom, ty + h * 0.1, 2 * zoom, h * 0.55);
    ctx.strokeStyle = '#fef08a';
    ctx.lineWidth = 0.3 * zoom;
    ctx.strokeRect(tx + i * w * 0.38 - 1*zoom, ty + h * 0.1, 2 * zoom, h * 0.55);
  }

  // Factory roof blocks (dark slate grey)
  ctx.fillStyle = '#2d3748';
  ctx.fillRect(tx - w * 1.05, ty - h * 0.85, w * 0.9, h * 0.6);
  ctx.fillRect(tx, ty - h * 0.85, w * 0.9, h * 0.6);

  // Sawtooth roof style ridges with zinc metallic borders
  ctx.fillStyle = '#4a5568';
  for (let i = 0; i < 2; i++) {
    const rx = tx - w + i * w * 1.05;
    ctx.beginPath();
    ctx.moveTo(rx, ty - h * 0.85);
    ctx.lineTo(rx + w * 0.9, ty - h * 0.85);
    ctx.lineTo(rx + w * 0.65, ty - h * 1.35); // Sawtooth peak
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = '#cbd5e1';
    ctx.lineWidth = 0.6 * zoom;
    ctx.stroke();
  }

  // Classic high brick smokestack (chimney tower!)
  ctx.fillStyle = '#7c2d12'; // Rich brick chimney
  ctx.fillRect(tx + w * 0.45, ty - h * 1.45, w * 0.35, h * 1.6);
  ctx.strokeStyle = '#431407'; // Chimney brick frame
  ctx.strokeRect(tx + w * 0.45, ty - h * 1.45, w * 0.35, h * 1.6);
  
  // Chimney crown / black band on top
  ctx.fillStyle = '#111827';
  ctx.fillRect(tx + w * 0.38, ty - h * 1.62, w * 0.48, h * 0.22);

  // Dynamic shimmering industrial steam clouds!
  const pulseScale = 1 + Math.sin(Date.now() / 280) * 0.14;
  const puffY = ty - h * 2.2;
  const steamX = tx + w * 0.62;
  
  ctx.fillStyle = 'rgba(220, 230, 240, 0.58)'; // Slightly blue-tinted heavy industrial steam
  ctx.beginPath();
  ctx.arc(steamX, puffY, 3.2 * zoom * pulseScale, 0, Math.PI * 2);
  ctx.arc(steamX + 2 * zoom, puffY - 4 * zoom, 4.4 * zoom * pulseScale, 0, Math.PI * 2);
  ctx.arc(steamX - 3 * zoom, puffY - 2 * zoom, 2.8 * zoom * pulseScale, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();
};

const drawMiniHayBale = (ctx: CanvasRenderingContext2D, tx: number, ty: number, zoom: number) => {
  const r = 3.6 * zoom;
  ctx.save();
  // Drop shadow
  ctx.fillStyle = 'rgba(0,0,0,0.12)';
  ctx.beginPath();
  ctx.ellipse(tx + 0.8*zoom, ty + 1.2*zoom, r*1.05, r*0.5, 0, 0, Math.PI*2);
  ctx.fill();

  // Straw colored flat round spiral
  ctx.fillStyle = '#d97706';
  ctx.beginPath();
  ctx.arc(tx, ty, r, 0, Math.PI * 2);
  ctx.fill();

  // Straw highlights / texture
  ctx.strokeStyle = '#fbbf24';
  ctx.lineWidth = 0.8 * zoom;
  ctx.beginPath();
  ctx.arc(tx, ty, r * 0.72, 0, Math.PI * 2);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(tx, ty, r * 0.42, 0, Math.PI * 2);
  ctx.stroke();

  // Fine bindings / twine loops
  ctx.strokeStyle = '#78350f';
  ctx.lineWidth = 0.5 * zoom;
  ctx.beginPath();
  ctx.moveTo(tx - r, ty);
  ctx.lineTo(tx + r, ty);
  ctx.moveTo(tx, ty - r);
  ctx.lineTo(tx, ty + r);
  ctx.stroke();
  ctx.restore();
};

export const IsometricMap: React.FC<IsometricMapProps> = ({
  grid,
  selectedTile,
  onSelectTile,
  activeOverlay,
  selectedBuilding = null
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const minimapCanvasRef = useRef<HTMLCanvasElement>(null);

  // Tablet navigation state
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1.1);
  const [isDragging, setIsDragging] = useState(false);
  const [isPanningMinimap, setIsPanningMinimap] = useState(false);
  const [hoverTile, setHoverTile] = useState<{ gx: number; gy: number } | null>(null);
  const [touchTooltipTile, setTouchTooltipTile] = useState<{ gx: number; gy: number } | null>(null);
  const [showShortcuts, setShowShortcuts] = useState(false);

  const dragStart = useRef({ x: 0, y: 0 });
  const currentOffset = useRef({ x: 0, y: 0 });

  const panToMinimapCoords = (mx: number, my: number) => {
    const mini = minimapCanvasRef.current;
    const canvas = canvasRef.current;
    if (!mini || !canvas) return;

    const mW = mini.width;
    const mH = mini.height;

    const clmx = Math.max(0, Math.min(mW, mx));
    const clmy = Math.max(0, Math.min(mH, my));

    const gridW = 16.5 * HEX_W;
    const gridH = 16 * HEX_H * 0.75 + HEX_H;
    const gridX = (clmx / mW) * gridW;
    const gridY = (clmy / mH) * gridH;

    const newOx = canvas.width / 2 - gridX * zoom;
    const newOy = canvas.height / 2 - gridY * zoom;

    setDragOffset({ x: newOx, y: newOy });
    currentOffset.current = { x: newOx, y: newOy };
  };

  const handleMinimapDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    e.stopPropagation();
    const rect = minimapCanvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;

    const computedMX = (mx / rect.width) * (minimapCanvasRef.current?.width || 1);
    const computedMY = (my / rect.height) * (minimapCanvasRef.current?.height || 1);

    setIsPanningMinimap(true);
    panToMinimapCoords(computedMX, computedMY);
  };

  const handleMinimapMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isPanningMinimap) return;
    e.stopPropagation();
    const rect = minimapCanvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;

    const computedMX = (mx / rect.width) * (minimapCanvasRef.current?.width || 1);
    const computedMY = (my / rect.height) * (minimapCanvasRef.current?.height || 1);

    panToMinimapCoords(computedMX, computedMY);
  };

  const handleMinimapUpOrLeave = () => {
    setIsPanningMinimap(false);
  };

  const handleMinimapTouchStart = (e: React.TouchEvent<HTMLCanvasElement>) => {
    e.stopPropagation();
    const touch = e.touches[0];
    const rect = minimapCanvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    const mx = touch.clientX - rect.left;
    const my = touch.clientY - rect.top;

    const computedMX = (mx / rect.width) * (minimapCanvasRef.current?.width || 1);
    const computedMY = (my / rect.height) * (minimapCanvasRef.current?.height || 1);

    setIsPanningMinimap(true);
    panToMinimapCoords(computedMX, computedMY);
  };

  const handleMinimapTouchMove = (e: React.TouchEvent<HTMLCanvasElement>) => {
    if (!isPanningMinimap) return;
    e.stopPropagation();
    const touch = e.touches[0];
    const rect = minimapCanvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    const mx = touch.clientX - rect.left;
    const my = touch.clientY - rect.top;

    const computedMX = (mx / rect.width) * (minimapCanvasRef.current?.width || 1);
    const computedMY = (my / rect.height) * (minimapCanvasRef.current?.height || 1);

    panToMinimapCoords(computedMX, computedMY);
  };

  const handleMinimapTouchEnd = () => {
    setIsPanningMinimap(false);
  };

  // Handle resizing via ResizeObserver to handle layout and sidebar changes cleanly without stretching
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const resizeObserver = new ResizeObserver((entries) => {
      window.requestAnimationFrame(() => {
        const canvas = canvasRef.current;
        if (!canvas || !entries || entries.length === 0) return;
        const entry = entries[0];
        const { width, height } = entry.contentRect;
        // set pixel size equal to styled/actual size
        canvas.width = Math.floor(width);
        canvas.height = Math.floor(height);
      });
    });

    resizeObserver.observe(container);

    // Center map initially, once dimensions are ready
    if (container.clientWidth > 0 && container.clientHeight > 0) {
      setDragOffset({
        x: (container.clientWidth - 16 * HEX_W) / 2 + 50,
        y: (container.clientHeight - 16 * HEX_H * 0.75) / 2 + 30,
      });
      currentOffset.current = {
        x: (container.clientWidth - 16 * HEX_W) / 2 + 50,
        y: (container.clientHeight - 16 * HEX_H * 0.75) / 2 + 30,
      };
    } else {
      // Fallback center defaults if container not styled yet
      setDragOffset({ x: 300, y: 150 });
      currentOffset.current = { x: 300, y: 150 };
    }

    return () => {
      resizeObserver.disconnect();
    };
  }, []);

  // Animation ticks
  const animationRef = useRef<number>(0);
  const startTime = useRef<number>(Date.now());

  const getTileCenter = (gx: number, gy: number, ox: number, oy: number, currentZoom: number) => {
    const col_offset = (gy % 2) * HEX_W * 0.5;
    return [
      ox + (gx * HEX_W + col_offset + HEX_W * 0.5) * currentZoom,
      oy + (gy * HEX_H * 0.75 + HEX_H * 0.5) * currentZoom,
    ];
  };

  const getHexPts = (cx: number, cy: number, w: number, h: number) => {
    const hw = w / 2;
    const hh = h / 2;
    const q = hh * 0.5;
    return [
      [cx,      cy - hh], // top
      [cx + hw, cy - q],  // top-right
      [cx + hw, cy + q],  // bot-right
      [cx,      cy + hh], // bottom
      [cx - hw, cy + q],  // bot-left
      [cx - hw, cy - q],  // top-left
    ];
  };

  const hitTest = (mx: number, my: number): { gx: number; gy: number } | null => {
    let best: { gx: number; gy: number } | null = null;
    let bestDist = Infinity;

    for (let gy = 0; gy < 16; gy++) {
      for (let gx = 0; gx < 16; gx++) {
        const [cx, cy] = getTileCenter(gx, gy, dragOffset.x, dragOffset.y, zoom);
        const dist = Math.hypot(mx - cx, my - cy);
        if (dist < bestDist) {
          bestDist = dist;
          best = { gx, gy };
        }
      }
    }

    // Hit test boundary matching hex radius
    const threshold = HEX_W * 0.52 * zoom;
    return bestDist < threshold ? best : null;
  };

  // ── Render Frame ──
  useEffect(() => {
    let active = true;

    const render = () => {
      const canvas = canvasRef.current;
      if (!canvas || !active) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const elapsed = (Date.now() - startTime.current) / 1000;

      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Warm background pergament color
      ctx.fillStyle = '#eadecc';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Subtle vintage vignette edge
      const grad = ctx.createRadialGradient(
        canvas.width / 2, canvas.height / 2, Math.min(canvas.width, canvas.height) * 0.3,
        canvas.width / 2, canvas.height / 2, Math.max(canvas.width, canvas.height) * 0.7
      );
      grad.addColorStop(0, 'rgba(255,255,255,0.15)');
      grad.addColorStop(1, 'rgba(44, 31, 14, 0.16)');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Drawing hex grid in clean 2D top-down sequential layer order
      for (let gy = 0; gy < 16; gy++) {
        for (let gx = 0; gx < 16; gx++) {
          const cell = grid[gy]?.[gx];
          if (!cell) continue;

          const [cx, cy] = getTileCenter(gx, gy, dragOffset.x, dragOffset.y, zoom);

          // Cull cells off-screen
          const buffer = HEX_W * zoom;
          if (cx < -buffer || cx > canvas.width + buffer || cy < -buffer || cy > canvas.height + buffer) {
            continue;
          }

          const style = T_STYLE[cell.terrain] || T_STYLE.Wiese;
          const isHov = hoverTile && hoverTile.gx === gx && hoverTile.gy === gy;
          const isSel = selectedTile && selectedTile.gx === gx && selectedTile.gy === gy;

          const w = (HEX_W - 1) * zoom;
          const h = (HEX_H - 1) * zoom;
          const pts = getHexPts(cx, cy, w, h);

          const thickness = 11 * zoom;
          const seed = getTileSeed(gx, gy);

          // Draw the 3D board game block side panels first (overlapping from back to front!)
          // ── 1. West Face Shading (pts[5] to pts[4])
          ctx.beginPath();
          ctx.moveTo(pts[5][0], pts[5][1]);
          ctx.lineTo(pts[4][0], pts[4][1]);
          ctx.lineTo(pts[4][0], pts[4][1] + thickness);
          ctx.lineTo(pts[5][0], pts[5][1] + thickness);
          ctx.closePath();
          let wGrad = ctx.createLinearGradient(pts[5][0], pts[5][1], pts[4][0], pts[4][1] + thickness);
          wGrad.addColorStop(0, '#2b1e18');
          wGrad.addColorStop(1, '#1b120f');
          ctx.fillStyle = wGrad;
          ctx.fill();

          // ── 2. Southwest Face Shading (pts[4] to pts[3])
          ctx.beginPath();
          ctx.moveTo(pts[4][0], pts[4][1]);
          ctx.lineTo(pts[3][0], pts[3][1]);
          ctx.lineTo(pts[3][0], pts[3][1] + thickness);
          ctx.lineTo(pts[4][0], pts[4][1] + thickness);
          ctx.closePath();
          let swGrad = ctx.createLinearGradient(pts[4][0], pts[4][1], pts[3][0], pts[3][1] + thickness);
          swGrad.addColorStop(0, '#36271e');
          swGrad.addColorStop(1, '#221813');
          ctx.fillStyle = swGrad;
          ctx.fill();

          // ── 3. Southeast Face Shading (pts[3] to pts[2])
          ctx.beginPath();
          ctx.moveTo(pts[3][0], pts[3][1]);
          ctx.lineTo(pts[2][0], pts[2][1]);
          ctx.lineTo(pts[2][0], pts[2][1] + thickness);
          ctx.lineTo(pts[3][0], pts[3][1] + thickness);
          ctx.closePath();
          let seGrad = ctx.createLinearGradient(pts[3][0], pts[3][1], pts[2][0], pts[2][1] + thickness);
          seGrad.addColorStop(0, '#4a362a');
          seGrad.addColorStop(1, '#2d211a');
          ctx.fillStyle = seGrad;
          ctx.fill();

          // ── 4. East Face Shading (pts[2] to pts[1])
          ctx.beginPath();
          ctx.moveTo(pts[2][0], pts[2][1]);
          ctx.lineTo(pts[1][0], pts[1][1]);
          ctx.lineTo(pts[1][0], pts[1][1] + thickness);
          ctx.lineTo(pts[2][0], pts[2][1] + thickness);
          ctx.closePath();
          let eGrad = ctx.createLinearGradient(pts[2][0], pts[2][1], pts[1][0], pts[1][1] + thickness);
          eGrad.addColorStop(0, '#533f32');
          eGrad.addColorStop(1, '#33261e');
          ctx.fillStyle = eGrad;
          ctx.fill();

          // ── 5. Geological strata details (lines and textures on the extruded sides)
          ctx.strokeStyle = 'rgba(15, 8, 5, 0.25)';
          ctx.lineWidth = 1 * zoom;
          ctx.beginPath();
          // Horizontal sedimentary clay/stone layer line
          ctx.moveTo(pts[5][0], pts[5][1] + thickness * 0.45);
          ctx.lineTo(pts[4][0], pts[4][1] + thickness * 0.45);
          ctx.lineTo(pts[3][0], pts[3][1] + thickness * 0.45);
          ctx.lineTo(pts[2][0], pts[2][1] + thickness * 0.45);
          ctx.lineTo(pts[1][0], pts[1][1] + thickness * 0.45);
          ctx.stroke();

          // Rocky vertical joints or crevices
          if (Math.abs(seed * 10) % 2 < 0.8) {
            ctx.beginPath();
            ctx.moveTo((pts[4][0] + pts[3][0])/2, (pts[4][1] + pts[3][1])/2);
            ctx.lineTo((pts[4][0] + pts[3][0])/2, (pts[4][1] + pts[3][1])/2 + thickness);
            ctx.stroke();
          }
          if (Math.abs(seed * 14) % 2 > 1.2) {
            ctx.beginPath();
            ctx.moveTo((pts[3][0] + pts[2][0])/2, (pts[3][1] + pts[2][1])/2);
            ctx.lineTo((pts[3][0] + pts[2][0])/2, (pts[3][1] + pts[2][1])/2 + thickness);
            ctx.stroke();
          }

          // Let dynamic green roots/vines drape over the edge of Meadows and Forests!
          if (cell.terrain === 'Wiese' || cell.terrain === 'Auwald') {
            ctx.fillStyle = cell.terrain === 'Auwald' ? '#224d1a' : '#458c28';
            for (let rIdx = 0; rIdx < 2; rIdx++) {
              const startX = pts[4][0] + (pts[2][0] - pts[4][0]) * (0.2 + (Math.abs(seed * (rIdx+1) * 31.3) % 0.6));
              // approximate intermediate Y coordinate
              const startY = pts[3][1] + (pts[2][1] - pts[3][1]) * ((startX - pts[3][0]) / (pts[2][0] - pts[3][0] || 1));
              ctx.beginPath();
              ctx.moveTo(startX, startY);
              ctx.lineTo(startX + 1 * zoom, startY + (3 + (Math.abs(seed * (rIdx+5)) % 4.5)) * zoom);
              ctx.lineTo(startX + 2 * zoom, startY);
              ctx.closePath();
              ctx.fill();
            }
          }

          // Fill top hexagon face with luxury tactile gradient (creating lovely simulated highlights)
          let fillCol: string | CanvasGradient = style.fill;

          if (cell.terrain === 'Water') {
            const phase = (gx * 0.4 + gy * 0.7) + elapsed * 1.4;
            const flowW = Math.sin(phase) * 6;
            const rOffset = Math.round(flowW);
            // Dynamic shimmering river gradient
            const waterGrad = ctx.createLinearGradient(cx - w * 0.5, cy - h * 0.5, cx + w * 0.5, cy + h * 0.5);
            waterGrad.addColorStop(0, `rgb(${34 + rOffset}, ${110 + rOffset}, ${170 + Math.round(flowW * 0.5)})`);
            waterGrad.addColorStop(0.5, `rgb(${15 + rOffset/2}, ${58 + rOffset}, ${112})`);
            waterGrad.addColorStop(1, `rgb(${6}, ${32}, ${76})`);
            fillCol = waterGrad;
          } else if (cell.terrain === 'Wiese') {
            const wieseGrad = ctx.createLinearGradient(cx - w*0.4, cy - h*0.5, cx + w*0.4, cy + h*0.5);
            wieseGrad.addColorStop(0, '#82dc4d'); // Bright fresh green
            wieseGrad.addColorStop(0.5, '#68cb39'); // Rich medium grass
            wieseGrad.addColorStop(1, '#4c9b23');   // Shady field green
            fillCol = wieseGrad;
          } else if (cell.terrain === 'Auwald') {
            const auwaldGrad = ctx.createLinearGradient(cx - w*0.4, cy - h*0.5, cx + w*0.4, cy + h*0.5);
            auwaldGrad.addColorStop(0, '#2e6b26'); // High canopy green
            auwaldGrad.addColorStop(0.6, '#1a4e14'); // Mid dense forest
            auwaldGrad.addColorStop(1, '#0c2709');   // Shady base soil
            fillCol = auwaldGrad;
          } else if (cell.terrain === 'Acker') {
            const ackerGrad = ctx.createLinearGradient(cx - w*0.4, cy - h*0.5, cx + w*0.4, cy + h*0.5);
            ackerGrad.addColorStop(0, '#ebd86d'); // Warm sun
            ackerGrad.addColorStop(0.5, '#dcb742'); // Deep golden wheat
            ackerGrad.addColorStop(1, '#ba8a24');   // Harvest soil ochre
            fillCol = ackerGrad;
          } else if (cell.terrain === 'Siedlung') {
            const siedlungGrad = ctx.createLinearGradient(cx - w*0.4, cy - h*0.4, cx + w*0.4, cy + h*0.4);
            siedlungGrad.addColorStop(0, '#fc9855'); // Sunny clay tile
            siedlungGrad.addColorStop(0.5, '#e07638'); // Brick red
            siedlungGrad.addColorStop(1, '#a1481b');   // Warm deep terracotta shadows
            fillCol = siedlungGrad;
          } else if (cell.terrain === 'Gewerbe') {
            const gewerbeGrad = ctx.createLinearGradient(cx - w*0.4, cy - h*0.4, cx + w*0.4, cy + h*0.4);
            gewerbeGrad.addColorStop(0, '#a5b2b6'); // Zinc / silver metal highlights
            gewerbeGrad.addColorStop(0.5, '#808c90'); // Dark gray slate
            gewerbeGrad.addColorStop(1, '#535c5f');   // Deep anthracite metal shadows
            fillCol = gewerbeGrad;
          }

          // Render top hexagon face
          ctx.beginPath();
          ctx.moveTo(pts[0][0], pts[0][1]);
          for (let i = 1; i < 6; i++) {
            ctx.lineTo(pts[i][0], pts[i][1]);
          }
          ctx.closePath();

          ctx.fillStyle = fillCol;
          ctx.fill();

          if (isHov && !isSel) {
            // Soft glowing white overlay highlight on hover
            ctx.fillStyle = 'rgba(255, 255, 255, 0.18)';
            ctx.fill();
          }

          // Draw Vector Terrain details clipped inside the flat hexagon face
          ctx.save();
          ctx.beginPath();
          ctx.moveTo(pts[0][0], pts[0][1]);
          for (let i = 1; i < 6; i++) {
            ctx.lineTo(pts[i][0], pts[i][1]);
          }
          ctx.closePath();
          ctx.clip();

          if (cell.terrain === 'Wiese') {
            // Soft paper-like grass texture / canvas noise
            ctx.fillStyle = 'rgba(255, 255, 255, 0.05)';
            for (let gIdx = 0; gIdx < 12; gIdx++) {
              const sX = cx + Math.sin(seed + gIdx) * 20 * zoom;
              const sY = cy + Math.cos(seed * 1.4 + gIdx) * 20 * zoom;
              ctx.fillRect(sX, sY, 1.5 * zoom, 1.5 * zoom);
            }

            // Draw rolling topography contour ridges
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.22)';
            ctx.lineWidth = 1.0 * zoom;
            ctx.beginPath();
            ctx.arc(cx - 15*zoom, cy - 15*zoom, 25*zoom, 0, Math.PI * 0.5);
            ctx.stroke();

            ctx.strokeStyle = 'rgba(0, 0, 0, 0.04)';
            ctx.beginPath();
            ctx.arc(cx + 10*zoom, cy + 10*zoom, 20*zoom, Math.PI, Math.PI * 1.5);
            ctx.stroke();

            // Clustered wildflowers (poppies, lavender, etc.)
            const count = Math.floor(2 + Math.abs(seed * 4) % 3);
            for (let i = 0; i < count; i++) {
              const gxOff = Math.sin(seed + i * 1.7) * 15 * zoom;
              const gyOff = Math.cos(seed + i * 2.3) * 15 * zoom;
              drawMiniGrass(ctx, cx + gxOff, cy + gyOff, zoom, '#225412');
            }

            // A tiny colorful wild bloom flowerbed
            if (Math.abs(seed * 10) % 2 < 0.92) {
              const fX = Math.sin(seed + 9.9) * 12 * zoom;
              const fY = Math.cos(seed + 4.4) * 12 * zoom;
              drawMiniFlower(ctx, cx + fX, cy + fY, zoom);
            }
          } else if (cell.terrain === 'Auwald') {
            // Forest floor shading
            ctx.fillStyle = 'rgba(0, 0, 0, 0.06)';
            ctx.beginPath();
            ctx.arc(cx, cy, 22 * zoom, 0, Math.PI * 2);
            ctx.fill();

            // Draw multiple high-fidelity mixed trees
            const treeCount = Math.floor(3 + Math.abs(seed * 6) % 3);
            for (let i = 0; i < treeCount; i++) {
              const gxOff = Math.sin(seed * 2 + i * 3.1) * 15 * zoom;
              const gyOff = Math.cos(seed * 1.5 + i * 2.5) * 15 * zoom;
              
              const speciesVal = Math.abs(seed * 22.7 + i * 7.9) % 1;
              const treeSize = 3.2 + (Math.abs(seed * 5 + i) % 2.0);
              
              if (speciesVal < 0.28) {
                drawMiniPine(ctx, cx + gxOff, cy + gyOff, treeSize, zoom);
              } else if (speciesVal < 0.55) {
                drawMiniOak(ctx, cx + gxOff, cy + gyOff, treeSize, zoom);
              } else if (speciesVal < 0.8) {
                drawMiniAutumnMaple(ctx, cx + gxOff, cy + gyOff, treeSize, zoom);
              } else {
                drawMiniBirch(ctx, cx + gxOff, cy + gyOff, treeSize, zoom);
              }
            }
          } else if (cell.terrain === 'Acker') {
            // Patchwork farm layout: split the field into two textures (tilled brown loam and golden wheat)
            ctx.save();
            
            // Draw field half 1 (diagonal wheat furrows)
            ctx.beginPath();
            ctx.rect(cx - 28*zoom, cy - w*zoom, 28*zoom, w*2*zoom);
            ctx.clip();
            
            ctx.strokeStyle = 'rgba(84, 52, 25, 0.28)';
            ctx.lineWidth = 1.8 * zoom;
            for (let j = -7; j <= 7; j++) {
              const off = j * 4.5 * zoom;
              ctx.beginPath();
              ctx.moveTo(cx - 35*zoom + off, cy - 50*zoom);
              ctx.lineTo(cx + off, cy + 50*zoom);
              ctx.stroke();
            }
            
            // Sprinkled golden grains
            ctx.fillStyle = '#fbbf24';
            for (let sIdx = 0; sIdx < 16; sIdx++) {
              const sX = cx - (4 + (Math.abs(seed * sIdx * 5.3) % 22)) * zoom;
              const sY = cy + (-22 + (Math.abs(seed * sIdx * 9.1) % 44)) * zoom;
              ctx.beginPath();
              ctx.arc(sX, sY, 1.2*zoom, 0, Math.PI*2);
              ctx.fill();
            }
            ctx.restore();

            // Draw field half 2 (tilled soil rows with green crop shoots!)
            ctx.save();
            ctx.beginPath();
            ctx.rect(cx, cy - w*zoom, 28*zoom, w*2*zoom);
            ctx.clip();
            
            // Deep rich earthen background
            ctx.fillStyle = '#78350f';
            ctx.fillRect(cx, cy - w*zoom, 28*zoom, w*2*zoom);
            
            // Parallel crops
            ctx.strokeStyle = '#16a34a';
            ctx.lineWidth = 2.4 * zoom;
            ctx.setLineDash([3 * zoom, 4.2 * zoom]);
            for (let j = -3; j <= 6; j++) {
              const off = j * 6.2 * zoom;
              ctx.beginPath();
              ctx.moveTo(cx + off, cy - 42*zoom);
              ctx.lineTo(cx + off - 8*zoom, cy + 42*zoom);
              ctx.stroke();
            }
            ctx.setLineDash([]);
            ctx.restore();

            // Dividing dirt road / pathway with shrubs
            ctx.strokeStyle = '#854d0e';
            ctx.lineWidth = 1.5 * zoom;
            ctx.beginPath();
            ctx.moveTo(cx, cy - 45*zoom);
            ctx.lineTo(cx, cy + 45*zoom);
            ctx.stroke();

            ctx.fillStyle = '#166534';
            for (let i = 0; i < 2; i++) {
              const bushY = cy + (-20 + i * 35 + Math.abs(seed * 7) % 12) * zoom;
              ctx.beginPath();
              ctx.arc(cx, bushY, 2.2*zoom, 0, Math.PI*2);
              ctx.fill();
            }

            // Draw a detailed hay bale
            if (Math.abs(seed * 9) % 3 < 1.35) {
              const bX = Math.sin(seed + 1.2) * 12 * zoom;
              const bY = Math.cos(seed + 2.1) * 12 * zoom;
              drawMiniHayBale(ctx, cx + bX, cy + bY, zoom);
            }
          } else if (cell.terrain === 'Siedlung') {
            // Neat winding beige / grey cobblestone pathways
            ctx.strokeStyle = '#cbd5e1';
            ctx.lineWidth = 2.6 * zoom;
            ctx.lineCap = 'round';
            ctx.beginPath();
            ctx.moveTo(cx - 15*zoom, cy - 5*zoom);
            ctx.bezierCurveTo(cx - 2*zoom, cy - 8*zoom, cx + 2*zoom, cy + 10*zoom, cx + 15*zoom, cy + 4*zoom);
            ctx.stroke();

            ctx.strokeStyle = '#94a3b8';
            ctx.lineWidth = 2.0 * zoom;
            ctx.stroke();

            // Draw cozy cottage houses
            const houseCount = Math.floor(2 + Math.abs(seed * 5) % 2); // 2 to 3 houses for village feel
            const roofs = ['#ef4444', '#f97316', '#3f3f46']; // Terracotta, Brick red, Slate grey roofs
            const darkRoofs = ['#b91c1c', '#c2410c', '#18181b'];
            for (let i = 0; i < houseCount; i++) {
              const gxOff = Math.sin(seed * 11 + i * 4.7) * 14 * zoom;
              const gyOff = Math.cos(seed * 7 + i * 8.3) * 14 * zoom;
              const rIdx = Math.floor(Math.abs(seed * (i + 1) * 4) % roofs.length);
              drawMiniHouse(ctx, cx + gxOff, cy + gyOff, zoom, roofs[rIdx], darkRoofs[rIdx]);
            }
          } else if (cell.terrain === 'Gewerbe') {
            // Concrete ground tiles with oil spills / grunge
            ctx.fillStyle = '#64748b';
            ctx.fillRect(cx - 25*zoom, cy - 25*zoom, 50*zoom, 50*zoom);
            
            // Grid tiles
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
            ctx.lineWidth = 0.8 * zoom;
            for (let i = -20; i <= 20; i += 10) {
              ctx.beginPath();
              ctx.moveTo(cx + i * zoom, cy - 25 * zoom);
              ctx.lineTo(cx + i * zoom, cy + 25 * zoom);
              ctx.moveTo(cx - 25 * zoom, cy + i * zoom);
              ctx.lineTo(cx + 25 * zoom, cy + i * zoom);
              ctx.stroke();
            }

            // Hazard stripe lane
            ctx.strokeStyle = '#eab308';
            ctx.lineWidth = 1.6 * zoom;
            ctx.setLineDash([2 * zoom, 2.5 * zoom]);
            ctx.beginPath();
            ctx.moveTo(cx - 15*zoom, cy - 15*zoom);
            ctx.lineTo(cx + 15*zoom, cy - 15*zoom);
            ctx.stroke();
            ctx.setLineDash([]);

            // Industrial cargo boxes & pipeline
            ctx.fillStyle = '#ca8a04'; // Wood crates
            ctx.fillRect(cx - 14 * zoom, cy + 6 * zoom, 4 * zoom, 4 * zoom);
            ctx.strokeRect(cx - 14 * zoom, cy + 6 * zoom, 4 * zoom, 4 * zoom);
            ctx.fillStyle = '#d97706';
            ctx.fillRect(cx - 9 * zoom, cy + 8 * zoom, 4 * zoom, 4 * zoom);
            ctx.strokeRect(cx - 9 * zoom, cy + 8 * zoom, 4 * zoom, 4 * zoom);

            // Grey piping running across
            ctx.strokeStyle = '#94a3b8';
            ctx.lineWidth = 1.5 * zoom;
            ctx.beginPath();
            ctx.moveTo(cx - 22*zoom, cy + 18*zoom);
            ctx.lineTo(cx + 22*zoom, cy + 18*zoom);
            ctx.stroke();

            // Pipes joint connectors
            ctx.fillStyle = '#475569';
            ctx.fillRect(cx - 4*zoom, cy + 16.5*zoom, 2.5*zoom, 3*zoom);
            ctx.fillRect(cx + 8*zoom, cy + 16.5*zoom, 2.5*zoom, 3*zoom);

            drawMiniFactory(ctx, cx, cy, zoom);
          } else if (cell.terrain === 'Water') {
            // High-fidelity stony embankments
            ctx.fillStyle = '#c5bbae';
            ctx.beginPath();
            ctx.moveTo(pts[0][0], pts[0][1]);
            for (let i = 1; i < 6; i++) {
              ctx.lineTo(pts[i][0], pts[i][1]);
            }
            ctx.closePath();
            ctx.fill();

            // Layered water body slightly inset
            const iw = w - 3.2 * zoom;
            const ih = h - 3.2 * zoom;
            const ipts = getHexPts(cx, cy, iw, ih);

            const phase = (gx * 0.4 + gy * 0.7) + elapsed * 1.4;
            const flowW = Math.sin(phase) * 6;
            const rOffset = Math.round(flowW);
            
            const waterGrad = ctx.createLinearGradient(cx - iw, cy - ih, cx + iw, cy + ih);
            waterGrad.addColorStop(0, `rgb(${34 + rOffset}, ${110 + rOffset}, ${170 + Math.round(flowW * 0.5)})`);
            waterGrad.addColorStop(0.5, `rgb(${15 + rOffset/2}, ${58 + rOffset}, ${112})`);
            waterGrad.addColorStop(1, `rgb(${6}, ${32}, ${76})`);

            ctx.fillStyle = waterGrad;
            ctx.beginPath();
            ctx.moveTo(ipts[0][0], ipts[0][1]);
            for (let i = 1; i < 6; i++) {
              ctx.lineTo(ipts[i][0], ipts[i][1]);
            }
            ctx.closePath();
            ctx.fill();

            // Draw sparkling sun glints and flowing animated current ripples
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.28)';
            ctx.lineWidth = 1 * zoom;
            const ripples = 2;
            for (let i = 0; i < ripples; i++) {
              const ph = (elapsed * 1.5 + seed * 3.5 + i * Math.PI) % (Math.PI * 2);
              const rx = Math.cos(ph) * 11 * zoom;
              const ry = Math.sin(ph) * 7 * zoom;
              ctx.beginPath();
              ctx.arc(cx + rx, cy + ry, 3.8 * zoom, 0, Math.PI, false);
              ctx.stroke();
            }

            // High contrast sun reflection glitter curves
            if (Math.abs(seed * 11) % 2 < 1.0) {
              ctx.strokeStyle = 'rgba(255, 255, 255, 0.65)';
              ctx.lineWidth = 1.2 * zoom;
              ctx.beginPath();
              ctx.arc(cx - 5*zoom, cy - 4*zoom, 2.5*zoom, Math.PI*1.1, Math.PI*1.4);
              ctx.stroke();
            }
          }
          ctx.restore();

          // Apply analytical overlay coloring if requested
          if (activeOverlay !== 'none') {
            ctx.save();
            ctx.beginPath();
            ctx.moveTo(pts[0][0], pts[0][1]);
            for (let i = 1; i < 6; i++) {
              ctx.lineTo(pts[i][0], pts[i][1]);
            }
            ctx.closePath();
            ctx.clip();

            if (activeOverlay === 'wrrl') {
              const wrrlNorm = Math.max(0, Math.min(1, (cell.wrrl_quality - 1) / 4));
              const r = Math.round(210 * wrrlNorm + 50 * (1 - wrrlNorm));
              const g = Math.round(50 * wrrlNorm + 170 * (1 - wrrlNorm));
              const b = Math.round(60 * wrrlNorm + 110 * (1 - wrrlNorm));
              ctx.fillStyle = `rgba(${r}, ${g}, ${b}, 0.5)`;
              ctx.fill();
            } else if (activeOverlay === 'ffh') {
              const ffhNorm = cell.ffh_value / 100;
              ctx.fillStyle = `rgba(74, 171, 130, ${0.1 + ffhNorm * 0.55})`;
              ctx.fill();
            } else if (activeOverlay === 'flood') {
              if (cell.flood_risk === 'Hoch') {
                ctx.fillStyle = 'rgba(239, 68, 68, 0.45)';
              } else if (cell.flood_risk === 'Mittel') {
                ctx.fillStyle = 'rgba(245, 158, 11, 0.4)';
              } else {
                ctx.fillStyle = 'rgba(59, 130, 246, 0.15)';
              }
              ctx.fill();
            }
            ctx.restore();
          }

          // Draw Water Highlights overlay
          if (cell.terrain === 'Water') {
            ctx.save();
            ctx.beginPath();
            ctx.moveTo(pts[0][0], pts[0][1]);
            for (let i = 1; i < 6; i++) {
              ctx.lineTo(pts[i][0], pts[i][1]);
            }
            ctx.closePath();
            ctx.clip();

            const waveX = Math.sin(elapsed * 1.5 + gx + gy * 1.1) * 6 * zoom;
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.22)';
            ctx.lineWidth = 1.5 * zoom;
            ctx.beginPath();
            ctx.moveTo(cx - 20 * zoom + waveX, cy);
            ctx.bezierCurveTo(cx - 10 * zoom + waveX, cy - 4 * zoom, cx + 10 * zoom + waveX, cy + 4 * zoom, cx + 20 * zoom + waveX, cy);
            ctx.stroke();
            ctx.restore();
          }

          // Crisp flat outer boundaries
          ctx.beginPath();
          ctx.moveTo(pts[0][0], pts[0][1]);
          for (let i = 1; i < 6; i++) {
            ctx.lineTo(pts[i][0], pts[i][1]);
          }
          ctx.closePath();
          ctx.strokeStyle = isSel ? '#10b981' : 'rgba(74, 53, 32, 0.12)';
          ctx.lineWidth = isSel ? 2.5 * zoom : isHov ? 1.5 * zoom : 0.8 * zoom;
          ctx.stroke();

          // Modern Bevel Highlight & Shadow (simulating high-fidelity volumetric blocks!)
          ctx.save();
          // Northwest highlight
          ctx.beginPath();
          ctx.moveTo(pts[5][0], pts[5][1]);
          ctx.lineTo(pts[0][0], pts[0][1]);
          ctx.lineTo(pts[1][0], pts[1][1]);
          ctx.strokeStyle = 'rgba(255, 255, 255, 0.38)';
          ctx.lineWidth = 1.2 * zoom;
          ctx.stroke();

          // Southeast shadow
          ctx.beginPath();
          ctx.moveTo(pts[2][0], pts[2][1]);
          ctx.lineTo(pts[3][0], pts[3][1]);
          ctx.lineTo(pts[4][0], pts[4][1]);
          ctx.strokeStyle = 'rgba(0, 0, 0, 0.15)';
          ctx.lineWidth = 1.0 * zoom;
          ctx.stroke();
          ctx.restore();

          // Draw crucial strategic overlay indicators when overlay layers are active
          if (activeOverlay !== 'none') {
            ctx.save();
            ctx.shadowColor = 'rgba(0, 0, 0, 0.08)';
            ctx.shadowBlur = 3 * zoom;
            ctx.shadowOffsetY = 1 * zoom;

            // Warm ivory flat token background
            ctx.fillStyle = '#ffffff';
            ctx.strokeStyle = '#475569';
            ctx.lineWidth = 1 * zoom;
            ctx.beginPath();
            ctx.arc(cx, cy, 10 * zoom, 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();
            ctx.restore();

            // Render stats text
            ctx.save();
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillStyle = '#0f172a';
            ctx.font = `bold ${Math.max(8, Math.floor(9 * zoom))}px "JetBrains Mono"`;

            let displayVal = '';
            if (activeOverlay === 'wrrl') {
              displayVal = `${cell.wrrl_quality.toFixed(1)}`;
            } else if (activeOverlay === 'ffh') {
              displayVal = `${cell.ffh_value}`;
            } else if (activeOverlay === 'flood') {
              displayVal = cell.flood_risk === 'Hoch' ? '🌋' : cell.flood_risk === 'Mittel' ? '⚠️' : '🛡️';
            }
            ctx.fillText(displayVal, cx, cy);
            ctx.restore();
          }

          // Modern strategy game placement hover target ring & ghost preview
          if (isHov && selectedBuilding) {
            ctx.beginPath();
            const placementPts = getHexPts(cx, cy, (HEX_W + 4) * zoom, (HEX_H + 4) * zoom);
            ctx.moveTo(placementPts[0][0], placementPts[0][1]);
            for (let i = 1; i < 6; i++) {
              ctx.lineTo(placementPts[i][0], placementPts[i][1]);
            }
            ctx.closePath();
            const pulse = 0.6 + Math.sin(elapsed * 6.5) * 0.25;
            ctx.strokeStyle = `rgba(16, 185, 129, ${pulse})`;
            ctx.lineWidth = 2 * zoom;
            ctx.stroke();

            // Render a floating preview bubble above the tile
            const hoverBob = Math.sin(elapsed * 4.5 + gx * 0.6 + gy * 0.4) * 1.8 * zoom;
            const previewY = cy - 25 * zoom + hoverBob;

            // Bubble
            ctx.save();
            ctx.shadowColor = 'rgba(16, 185, 129, 0.2)';
            ctx.shadowBlur = 4 * zoom;
            ctx.shadowOffsetY = 1 * zoom;

            ctx.fillStyle = '#f0fdf4';
            ctx.strokeStyle = '#10b981';
            ctx.lineWidth = 1 * zoom;
            ctx.beginPath();
            ctx.arc(cx, previewY, 10 * zoom, 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();
            ctx.restore();

            // Icon/Emoji inside the green bubble
            ctx.fillStyle = '#065f46';
            ctx.font = `bold ${Math.max(8, Math.floor(11 * zoom))}px "Inter"`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(selectedBuilding.icon || '🏗️', cx, previewY);

            // "Hier platzieren" text tag below the bubble
            ctx.fillStyle = '#047857';
            ctx.font = `bold ${Math.max(8, Math.floor(8 * zoom))}px "Space Grotesk"`;
            ctx.textAlign = 'center';
            ctx.fillText('Platzieren', cx, previewY + 14 * zoom);
          }

          // Draw Buildings or Emojis + Modern Game Floating Pin Bubbles
          if (cell.buildingId) {
            // first, draw custom flat building vectors directly on map base
            if (cell.buildingId === 'windkraft') {
              ctx.save();
              // tower white pole
              ctx.strokeStyle = '#f1f5f9';
              ctx.lineWidth = 2 * zoom;
              ctx.beginPath();
              ctx.moveTo(cx, cy);
              ctx.lineTo(cx, cy - 20 * zoom);
              ctx.stroke();

              // rotor hub
              ctx.fillStyle = '#cbd5e1';
              ctx.beginPath();
              ctx.arc(cx, cy - 20 * zoom, 2.2 * zoom, 0, Math.PI * 2);
              ctx.fill();

              // rotating flat blades
              ctx.strokeStyle = '#ffffff';
              ctx.lineWidth = 1 * zoom;
              const bladeAngle = elapsed * 3.2 + (gx * 0.5 + gy * 0.2);
              for (let b = 0; b < 3; b++) {
                ctx.beginPath();
                ctx.moveTo(cx, cy - 20 * zoom);
                const angle = bladeAngle + (b * Math.PI * 2) / 3;
                ctx.lineTo(
                  cx + Math.cos(angle) * 11 * zoom,
                  cy - 20 * zoom + Math.sin(angle) * 11 * zoom
                );
                ctx.stroke();
              }
              ctx.restore();
            } else if (cell.buildingId === 'solarpark') {
              ctx.save();
              ctx.fillStyle = '#1e3a8a';
              ctx.strokeStyle = '#3b82f6';
              ctx.lineWidth = 0.8 * zoom;

              // Flat horizontal solar grid square 1
              ctx.fillRect(cx - 7 * zoom, cy - 5 * zoom, 6 * zoom, 5 * zoom);
              ctx.strokeRect(cx - 7 * zoom, cy - 5 * zoom, 6 * zoom, 5 * zoom);

              // Flat horizontal solar grid square 2
              ctx.fillRect(cx + 1 * zoom, cy - 5 * zoom, 6 * zoom, 5 * zoom);
              ctx.strokeRect(cx + 1 * zoom, cy - 5 * zoom, 6 * zoom, 5 * zoom);

              // Flat horizontal solar grid square 3
              ctx.fillRect(cx - 3 * zoom, cy + 1 * zoom, 6 * zoom, 5 * zoom);
              ctx.strokeRect(cx - 3 * zoom, cy + 1 * zoom, 6 * zoom, 5 * zoom);
              ctx.restore();
            }

            // Calculate flat hovering bobbing animation (clean strategic pins)
            const hoverBob = Math.sin(elapsed * 2.6 + gx * 0.6 + gy * 0.4) * 1.5 * zoom;
            const bubbleY = cy - 22 * zoom + hoverBob;

            // Connector line
            ctx.strokeStyle = 'rgba(74, 53, 32, 0.2)';
            ctx.lineWidth = 0.8 * zoom;
            ctx.beginPath();
            ctx.moveTo(cx, cy);
            ctx.lineTo(cx, bubbleY + 5 * zoom);
            ctx.stroke();

            // Nice flat circle pin
            ctx.save();
            ctx.fillStyle = '#ffffff';
            ctx.strokeStyle = '#475569';
            ctx.lineWidth = 1 * zoom;
            ctx.beginPath();
            ctx.arc(cx, bubbleY, 10 * zoom, 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();
            ctx.restore();

            // Put Emoji inside the bubble
            let iconText = '🌿';
            if (cell.buildingId === 'altarm') iconText = '〰️';
            else if (cell.buildingId === 'auenwald') iconText = '🌲';
            else if (cell.buildingId === 'totholz') iconText = '🪵';
            else if (cell.buildingId === 'ufer_entfesselung') iconText = '🏞️';
            else if (cell.buildingId === 'kiesbett') iconText = '🪨';
            else if (cell.buildingId === 'fischpass') iconText = '🐟';
            else if (cell.buildingId === 'deichrueck') iconText = '🌊';
            else if (cell.buildingId === 'polder') iconText = '💧';
            else if (cell.buildingId === 'sohlgleite') iconText = '〰️';
            else if (cell.buildingId === 'biber_station') iconText = '🦫';
            else if (cell.buildingId === 'lachs_zucht') iconText = '🐟';
            else if (cell.buildingId === 'eisvogel_nist') iconText = '🐦';
            else if (cell.buildingId === 'insektenhotel') iconText = '🌸';
            else if (cell.buildingId === 'solarpark') iconText = '☀️';
            else if (cell.buildingId === 'windkraft') iconText = '🌬️';
            else if (cell.buildingId === 'intensiv_farm') iconText = '🚜';
            else if (cell.buildingId === 'extensive_weide') iconText = '🐄';
            else if (cell.buildingId === 'klaerwerk_upgrade') iconText = '⚗️';
            else if (cell.buildingId === 'rurtalbahn_halt') iconText = '🚇';
            else if (cell.buildingId === 'factory') iconText = '🏭';

            ctx.fillStyle = '#0f172a';
            ctx.font = `bold ${Math.max(8, Math.floor(10 * zoom))}px "Inter"`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(iconText, cx, bubbleY);
          }

          // Draw rising flat smoke from factories
          if (cell.buildingId === 'factory') {
            ctx.save();
            const ph = (elapsed * 1.1) % 1;
            const alpha = 0.4 - ph * 0.4;
            ctx.fillStyle = `rgba(100, 116, 139, ${alpha})`;
            ctx.beginPath();
            ctx.arc(cx + (ph * 8 * zoom), cy - (ph * 10 * zoom), 2 * zoom + ph * 5 * zoom, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
          }
        }
      }

      // ── Draw Geography City Labels on Top of Hexes ──
      ctx.textAlign = 'center';
      CITIES.forEach(([gx, gy, name]) => {
        const [cx, cy] = getTileCenter(gx, gy, dragOffset.x, dragOffset.y, zoom);
        const textY = cy - 25 * zoom;

        // Cull city labels off screen
        if (cx < 20 || cx > canvas.width - 20 || textY < 10 || textY > canvas.height - 10) return;

        ctx.font = `bold ${Math.max(9, Math.floor(11 * zoom))}px "Space Grotesk"`;
        const tw = ctx.measureText(name).width;

        // Drawing a small antique scroll frame underneath the text
        ctx.fillStyle = 'rgba(24, 24, 27, 0.9)';
        ctx.strokeStyle = '#3f3f46';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.roundRect(cx - tw / 2 - 6, textY - 9, tw + 12, 15, 3);
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = '#ffffff';
        ctx.fillText(name, cx, textY + 2);
      });

      // ── Draw Minimap Layout ──
      const miniCanvas = minimapCanvasRef.current;
      if (miniCanvas) {
        const mCtx = miniCanvas.getContext('2d');
        if (mCtx) {
          const mW = miniCanvas.width;
          const mH = miniCanvas.height;
          mCtx.clearRect(0, 0, mW, mH);

          // Warm paper background
          mCtx.fillStyle = '#f8f4eb';
          mCtx.fillRect(0, 0, mW, mH);

          // Grid coordinates run dynamically matching HEX_W and HEX_H
          const gridW = 16.5 * HEX_W;
          const gridH = 16 * HEX_H * 0.75 + HEX_H;
          const scaleX = mW / gridW;
          const scaleY = mH / gridH;

          // Draw grid tiles
          for (let gy = 0; gy < 16; gy++) {
            for (let gx = 0; gx < 16; gx++) {
              const cell = grid[gy]?.[gx];
              if (!cell) continue;

              const col_offset = (gy % 2) * HEX_W * 0.5;
              const cx = gx * HEX_W + col_offset + HEX_W * 0.5;
              const cy = gy * HEX_H * 0.75 + HEX_H * 0.5;

              const mx = cx * scaleX;
              const my = cy * scaleY;

              // Terrain visual categories
              let tileColor = '#eadfcc';
              if (cell.terrain === 'Water' || cell.hasRiverConnection) {
                tileColor = '#3a82be';
              } else if (cell.terrain === 'Auwald') {
                tileColor = '#235c1d';
              } else if (cell.terrain === 'Wiese') {
                tileColor = '#73cf45';
              } else if (cell.terrain === 'Acker') {
                tileColor = '#edd65e';
              } else if (cell.terrain === 'Siedlung') {
                tileColor = '#e07638';
              } else if (cell.terrain === 'Gewerbe') {
                tileColor = '#808c90';
              }

              mCtx.fillStyle = tileColor;
              mCtx.beginPath();
              mCtx.moveTo(mx, my - 4);
              mCtx.lineTo(mx + 3, my - 2);
              mCtx.lineTo(mx + 3, my + 2);
              mCtx.lineTo(mx, my + 4);
              mCtx.lineTo(mx - 3, my + 2);
              mCtx.lineTo(mx - 3, my - 2);
              mCtx.closePath();
              mCtx.fill();

              // Draw tiny dark dot of build structures
              if (cell.buildingId) {
                mCtx.fillStyle = '#0f172a';
                mCtx.beginPath();
                mCtx.arc(mx, my, 1.2, 0, Math.PI * 2);
                mCtx.fill();
              }

              // Flash the selected coordinate on the map
              if (selectedTile && selectedTile.gx === gx && selectedTile.gy === gy) {
                mCtx.strokeStyle = '#f43f5e';
                mCtx.lineWidth = 1.2;
                mCtx.beginPath();
                mCtx.arc(mx, my, 4.5, 0, Math.PI * 2);
                mCtx.stroke();

                const blink = Math.abs(Math.sin(elapsed * 5.5));
                mCtx.fillStyle = `rgba(244, 63, 94, ${0.4 + blink * 0.6})`;
                mCtx.beginPath();
                mCtx.arc(mx, my, 2, 0, Math.PI * 2);
                mCtx.fill();
              }
            }
          }

          // Draw viewport bounding box focus
          const tx1 = -dragOffset.x / zoom;
          const ty1 = -dragOffset.y / zoom;
          const tx2 = (canvas.width - dragOffset.x) / zoom;
          const ty2 = (canvas.height - dragOffset.y) / zoom;

          const rx1 = tx1 * scaleX;
          const ry1 = ty1 * scaleY;
          const rx2 = tx2 * scaleX;
          const ry2 = ty2 * scaleY;

          mCtx.strokeStyle = '#8c745a';
          mCtx.lineWidth = 1.5;
          mCtx.fillStyle = 'rgba(74, 53, 32, 0.12)';
          mCtx.strokeRect(rx1, ry1, rx2 - rx1, ry2 - ry1);
          mCtx.fillRect(rx1, ry1, rx2 - rx1, ry2 - ry1);

          // Subtle frame inside
          mCtx.strokeStyle = 'rgba(74, 53, 32, 0.25)';
          mCtx.lineWidth = 1;
          mCtx.strokeRect(0, 0, mW, mH);
        }
      }

      // Simple compass needle on top-right corners - shifted below the minimap container (y=180)
      ctx.save();
      const compassX = canvas.width - 45;
      const compassY = 180;
      ctx.translate(compassX, compassY);
      ctx.beginPath();
      ctx.arc(0, 0, 18, 0, Math.PI * 2);
      ctx.strokeStyle = 'rgba(44, 31, 14, 0.4)';
      ctx.lineWidth = 1.5;
      ctx.stroke();

      // Flat North needle pointing straight UP (aligned to 2D cardinal layout)
      ctx.beginPath();
      ctx.moveTo(0, -14);
      ctx.lineTo(4, 0);
      ctx.lineTo(-4, 0);
      ctx.closePath();
      ctx.fillStyle = '#f43f5e'; // Red North
      ctx.fill();

      ctx.beginPath();
      ctx.moveTo(0, 14);
      ctx.lineTo(4, 0);
      ctx.lineTo(-4, 0);
      ctx.closePath();
      ctx.fillStyle = '#2c1f0e'; // South
      ctx.fill();
      ctx.restore();

      animationRef.current = requestAnimationFrame(render);
    };

    render();

    return () => {
      active = false;
      cancelAnimationFrame(animationRef.current);
    };
  }, [grid, selectedTile, hoverTile, dragOffset, zoom, activeOverlay, selectedBuilding, isPanningMinimap]);

  // ── Touch and Mouse Event Responders for Android Tablet ──

  const handleMouseDown = (e: MouseEvent<HTMLCanvasElement>) => {
    setIsDragging(true);
    dragStart.current = { x: e.clientX, y: e.clientY };
    currentOffset.current = { ...dragOffset };
  };

  const handleMouseMove = (e: MouseEvent<HTMLCanvasElement>) => {
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;

    if (isDragging) {
      const dx = e.clientX - dragStart.current.x;
      const dy = e.clientY - dragStart.current.y;
      setDragOffset({
        x: currentOffset.current.x + dx,
        y: currentOffset.current.y + dy,
      });
    } else {
      const hit = hitTest(mx, my);
      if (hit) {
        setHoverTile(hit);
      } else {
        setHoverTile(null);
      }
    }
  };

  const handleMouseUp = (e: MouseEvent<HTMLCanvasElement>) => {
    setIsDragging(false);
    const dx = Math.abs(e.clientX - dragStart.current.x);
    const dy = Math.abs(e.clientY - dragStart.current.y);

    // If moved less than threshold, count it as a clean click select!
    if (dx < 6 && dy < 6) {
      const rect = canvasRef.current?.getBoundingClientRect();
      if (!rect) return;
      const mx = e.clientX - rect.left;
      const my = e.clientY - rect.top;
      const clicked = hitTest(mx, my);
      if (clicked) {
        onSelectTile(clicked.gx, clicked.gy);
        // Clear touch tooltip on desktop clean click to stay clean
        setTouchTooltipTile(null);
      }
    }
  };

  const handleTouchStart = (e: TouchEvent<HTMLCanvasElement>) => {
    if (e.touches.length === 1) {
      setIsDragging(true);
      const touch = e.touches[0];
      dragStart.current = { x: touch.clientX, y: touch.clientY };
      currentOffset.current = { ...dragOffset };
    }
  };

  const handleTouchMove = (e: TouchEvent<HTMLCanvasElement>) => {
    const touch = e.touches[0];
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    const mx = touch.clientX - rect.left;
    const my = touch.clientY - rect.top;

    if (isDragging) {
      const dx = touch.clientX - dragStart.current.x;
      const dy = touch.clientY - dragStart.current.y;
      
      // Clear touch tooltip if user drags more than 15px
      if (touchTooltipTile && (Math.abs(dx) > 15 || Math.abs(dy) > 15)) {
        setTouchTooltipTile(null);
      }

      setDragOffset({
        x: currentOffset.current.x + dx,
        y: currentOffset.current.y + dy,
      });
    } else {
      const hit = hitTest(mx, my);
      if (hit) {
        setHoverTile(hit);
      }
    }
  };

  const handleTouchEnd = (e: TouchEvent<HTMLCanvasElement>) => {
    setIsDragging(false);
    if (e.changedTouches.length === 1) {
      const touch = e.changedTouches[0];
      const dx = Math.abs(touch.clientX - dragStart.current.x);
      const dy = Math.abs(touch.clientY - dragStart.current.y);

      // Tap threshold
      if (dx < 12 && dy < 12) {
        const rect = canvasRef.current?.getBoundingClientRect();
        if (!rect) return;
        const mx = touch.clientX - rect.left;
        const my = touch.clientY - rect.top;
        const clicked = hitTest(mx, my);
        if (clicked) {
          onSelectTile(clicked.gx, clicked.gy);
          setTouchTooltipTile(clicked); // Save for displaying info bubble on touch
        } else {
          setTouchTooltipTile(null);
        }
      }
    }
    setHoverTile(null);
  };

  // Get active selected/hovered tile data for floating details
  const activeInfoTile = hoverTile || touchTooltipTile;
  const hoverTileData = activeInfoTile ? grid[activeInfoTile.gy]?.[activeInfoTile.gx] : null;

  // Calculate pixel position of tooltip to prevent clipping
  let tooltipStyle: React.CSSProperties = {};
  let tooltipDirection: 'above' | 'below' = 'above';
  if (activeInfoTile && canvasRef.current) {
    const [cx, cy] = getTileCenter(activeInfoTile.gx, activeInfoTile.gy, dragOffset.x, dragOffset.y, zoom);
    const canvasWidth = canvasRef.current.width || 800;
    
    // Constrain X position to prevent horizontal clipping
    const leftPx = Math.max(160, Math.min(canvasWidth - 160, cx));
    
    // Switch to 'below' if there's no space on top
    if (cy < 220) {
      tooltipDirection = 'below';
      tooltipStyle = {
        position: 'absolute',
        left: `${leftPx}px`,
        top: `${cy + 40}px`,
        transform: 'translateX(-50%)',
      };
    } else {
      tooltipDirection = 'above';
      tooltipStyle = {
        position: 'absolute',
        left: `${leftPx}px`,
        top: `${cy - 45}px`,
        transform: 'translate(-50%, -100%)',
      };
    }
  }

  const hoverBuilding = hoverTileData && hoverTileData.buildingId
    ? BUILDINGS_CATALOG.find(b => b.id === hoverTileData.buildingId)
    : null;

  const getWRRLLabel = (q: number) => {
    if (q <= 1.5) return 'Sehr gut';
    if (q <= 2.5) return 'Gut';
    if (q <= 3.5) return 'Mäßig';
    if (q <= 4.5) return 'Unbefriedigend';
    return 'Sehr schlecht';
  };

  const getWRRLBadgeStyle = (q: number) => {
    if (q <= 1.5) return 'bg-emerald-50 text-emerald-700 border-emerald-200';
    if (q <= 2.5) return 'bg-lime-50 text-lime-700 border-lime-200';
    if (q <= 3.5) return 'bg-yellow-50 text-yellow-700 border-yellow-200';
    if (q <= 4.5) return 'bg-orange-50 text-orange-700 border-orange-200';
    return 'bg-red-50 text-red-700 border-red-200';
  };

  const getFloodRiskBadgeStyle = (risk: 'Niedrig' | 'Mittel' | 'Hoch') => {
    if (risk === 'Niedrig') return 'bg-emerald-50 text-emerald-700 border-emerald-200';
    if (risk === 'Mittel') return 'bg-amber-50 text-amber-700 border-amber-200';
    return 'bg-rose-50 text-rose-700 border-rose-200';
  };

  return (
    <div ref={containerRef} className="relative w-full h-full select-none" id="hex-canvas-container">
      <canvas
        ref={canvasRef}
        className="block cursor-grab active:cursor-grabbing w-full h-full rounded-md shadow-inner"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={() => { setIsDragging(false); setHoverTile(null); }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        id="game-map-canvas"
      />

      {/* ── MINIMAP PANEL ── */}
      <div className="absolute top-4 right-4 z-40 bg-parch-0/95 border border-ink-1/25 rounded-lg shadow-lg flex flex-col p-1.5 backdrop-blur-sm pointer-events-auto scale-90 sm:scale-100 origin-top-right">
        <div className="flex items-center justify-between px-1 pb-1 gap-4">
          <span className="font-serif font-bold text-[9px] text-[#4a3520] uppercase tracking-widest leading-none">
            📍 RUR-MINIKARTE
          </span>
          <span className="font-mono text-[8px] text-ink-3">
            Fokus/Navigation
          </span>
        </div>
        <div className="relative border border-ink-1/10 bg-parch-1 rounded overflow-hidden">
          <canvas
            ref={minimapCanvasRef}
            width={160}
            height={100}
            onMouseDown={handleMinimapDown}
            onMouseMove={handleMinimapMove}
            onMouseUp={handleMinimapUpOrLeave}
            onMouseLeave={handleMinimapUpOrLeave}
            onTouchStart={handleMinimapTouchStart}
            onTouchMove={handleMinimapTouchMove}
            onTouchEnd={handleMinimapTouchEnd}
            className="block cursor-crosshair h-[100px] w-[160px]"
          />
        </div>
      </div>

      {/* On-screen Zoom & D-pad Navigation Controls */}
      <div 
        className="absolute bottom-4 left-4 z-40 bg-parch-0/95 border-2 border-ink-1 rounded-xl flex flex-col sm:flex-row items-stretch sm:items-center gap-3.5 p-3 shadow-xl scale-90 sm:scale-100 max-w-[340px] sm:max-w-none"
        onMouseDown={(e) => e.stopPropagation()}
        onTouchStart={(e) => e.stopPropagation()}
      >
        {/* Navigation D-pad */}
        <div className="flex flex-col items-center gap-1.5 border-b sm:border-b-0 sm:border-r border-ink-1/15 pb-2.5 sm:pb-0 sm:pr-3.5">
          <span className="font-mono text-[8px] text-ink-3 tracking-wider uppercase select-none font-bold">
            Navigieren
          </span>
          <div className="grid grid-cols-3 gap-1 w-[90px] h-[90px] shrink-0">
            {/* Row 1 */}
            <div />
            <button
              onClick={(e) => {
                e.stopPropagation();
                setDragOffset(prev => ({ ...prev, y: prev.y + 130 }));
              }}
              className="w-7 h-7 rounded-md bg-parch-2 active:bg-parch-3 hover:border-ink-1 text-ink-0 flex items-center justify-center border border-ink-1/25 shadow-sm transition-all cursor-pointer select-none"
              title="Karte nach oben verschieben"
            >
              <ArrowUp size={14} />
            </button>
            <div />

            {/* Row 2 */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                setDragOffset(prev => ({ ...prev, x: prev.x + 130 }));
              }}
              className="w-7 h-7 rounded-md bg-parch-2 active:bg-parch-3 hover:border-ink-1 text-ink-0 flex items-center justify-center border border-ink-1/25 shadow-sm transition-all cursor-pointer select-none"
              title="Karte nach links verschieben"
            >
              <ArrowLeft size={14} />
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                const container = containerRef.current;
                if (container) {
                  const targetZoom = 1.15;
                  setZoom(targetZoom);
                  const targetGx = 10;
                  const targetGy = 8;
                  const col_offset = (targetGy % 2) * HEX_W * 0.5;
                  const cx_grid = targetGx * HEX_W + col_offset + HEX_W * 0.5;
                  const cy_grid = targetGy * HEX_H * 0.75 + HEX_H * 0.5;
                  setDragOffset({
                    x: container.clientWidth / 2 - cx_grid * targetZoom,
                    y: container.clientHeight / 2 - cy_grid * targetZoom,
                  });
                  onSelectTile(10, 8);
                }
              }}
              className="w-7 h-7 rounded-md bg-parch-3 hover:bg-parch-4 active:bg-parch-4 border border-ink-1/25 hover:border-ink-1 text-ink-1 flex items-center justify-center shadow-sm transition-all cursor-pointer select-none"
              title="Dürener Stadtzentrum (Zentrum) fokussieren"
            >
              <Target size={13} className="text-ink-1 animate-pulse" />
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                setDragOffset(prev => ({ ...prev, x: prev.x - 130 }));
              }}
              className="w-7 h-7 rounded-md bg-parch-2 active:bg-parch-3 hover:border-ink-1 text-ink-0 flex items-center justify-center border border-ink-1/25 shadow-sm transition-all cursor-pointer select-none"
              title="Karte nach rechts verschieben"
            >
              <ArrowRight size={14} />
            </button>

            {/* Row 3 */}
            <div />
            <button
              onClick={(e) => {
                e.stopPropagation();
                setDragOffset(prev => ({ ...prev, y: prev.y - 130 }));
              }}
              className="w-7 h-7 rounded-md bg-parch-2 active:bg-parch-3 hover:border-ink-1 text-ink-0 flex items-center justify-center border border-ink-1/25 shadow-sm transition-all cursor-pointer select-none"
              title="Karte nach unten verschieben"
            >
              <ArrowDown size={14} />
            </button>
            <div />
          </div>
        </div>

        {/* Action Controls & Zoom Selection */}
        <div className="flex flex-col gap-2.5 min-w-[190px] sm:min-w-[210px] justify-center">
          {/* Zoom adjustment row */}
          <div className="flex items-center justify-between border-b border-ink-1/10 pb-2">
            <span className="font-mono text-[8px] text-ink-3 tracking-wider uppercase font-bold select-none">Zoom</span>
            <div className="flex items-center gap-1.5">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setZoom(prev => Math.max(0.65, prev - 0.15));
                }}
                className="w-8 h-8 rounded-lg bg-parch-2 active:bg-parch-3 hover:border-ink-1 text-ink-0 font-bold text-base flex items-center justify-center border border-ink-1/25 shadow-sm transition-all cursor-pointer select-none"
                title="Herauszoomen"
              >
                −
              </button>
              <span className="font-mono text-xs text-ink-1 font-bold w-12 text-center select-none">
                {Math.round(zoom * 100)}%
              </span>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setZoom(prev => Math.min(1.8, prev + 0.15));
                }}
                className="w-8 h-8 rounded-lg bg-parch-2 active:bg-parch-3 hover:border-ink-1 text-ink-0 font-bold text-base flex items-center justify-center border border-ink-1/25 shadow-sm transition-all cursor-pointer select-none"
                title="Heranzoomen"
              >
                +
              </button>
            </div>
          </div>

          {/* Quick-Action row */}
          <div className="flex items-center gap-2">
            <button
              onClick={(e) => {
                e.stopPropagation();
                const container = containerRef.current;
                if (container) {
                  setZoom(1.1);
                  setDragOffset({
                    x: (container.clientWidth - 16 * HEX_W) / 2 + 50,
                    y: (container.clientHeight - 16 * HEX_H * 0.75) / 2 + 30,
                  });
                }
              }}
              className="flex-1 h-9 rounded-lg bg-parch-3 active:bg-parch-4 hover:border-ink-1 text-ink-0 flex items-center justify-center text-xs font-serif font-semibold border border-ink-1/20 shadow-sm transition-colors cursor-pointer select-none"
            >
              Zentrieren
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                setShowShortcuts(true);
              }}
              className="flex-1 h-9 rounded-lg bg-parch-3 active:bg-parch-4 hover:border-ink-1 text-ink-0 flex items-center justify-center text-xs font-serif font-semibold border border-ink-1/20 shadow-sm gap-1 transition-colors cursor-pointer select-none"
              title="Spielsteuerung & Karteerklärung anzeigen"
            >
              <HelpCircle size={13} className="text-ink-2" />
              <span>Hilfe</span>
            </button>
          </div>
        </div>
      </div>

      {/* ── FLOAT HOVER FLOATING INFO CARD ── */}
      {activeInfoTile && hoverTileData && (
        <div
          style={tooltipStyle}
          className="z-50 w-[290px] bg-parch-0/95 border-2 border-[#475569] rounded-xl shadow-2xl p-3.5 pointer-events-auto flex flex-col gap-2.5 backdrop-blur-md text-ink-1 text-left font-sans select-none"
        >
          {/* Header */}
          <div className="flex items-center justify-between border-b border-dashed border-ink-1/10 pb-2">
            <div className="flex items-center gap-2">
              <span className="text-xl filter drop-shadow">
                {T_EMOJIS[hoverTileData.terrain] || '❓'}
              </span>
              <div className="flex flex-col">
                <span className="font-serif font-bold text-xs uppercase tracking-wide text-ink-0 leading-normal">
                  {T_NAMES[hoverTileData.terrain] || hoverTileData.terrain}
                </span>
                {hoverTileData.cityName && (
                  <span className="text-[9px] text-[#4a3520] font-semibold leading-none mt-0.5">
                    📍 {hoverTileData.cityName}
                  </span>
                )}
              </div>
            </div>
            
            <div className="flex items-center gap-1.5 shrink-0 select-none">
              <div className="font-mono text-[9px] bg-parch-2 border border-ink-1/10 text-ink-3 px-1.5 py-0.5 rounded-md leading-none uppercase tracking-widest font-bold">
                X:{activeInfoTile.gx} Y:{activeInfoTile.gy}
              </div>
              {touchTooltipTile && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setTouchTooltipTile(null);
                  }}
                  className="text-ink-3 hover:text-ink-1 p-1 hover:bg-parch-2 rounded transition-colors cursor-pointer"
                  title="Schließen"
                >
                  <X size={12} />
                </button>
              )}
            </div>
          </div>

          {/* Installed Structure / Building details */}
          {hoverBuilding ? (
            <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-lg p-2.5 flex items-start gap-2 select-none">
              <span className="text-xl mt-0.5 filter drop-shadow-sm shrink-0">
                {hoverBuilding.icon || '🏗️'}
              </span>
              <div className="flex flex-col min-w-0">
                <span className="text-[10px] font-mono uppercase tracking-wider text-emerald-700 leading-none font-bold">
                  Struktur Errichtet
                </span>
                <span className="font-serif font-bold text-[11px] text-ink-0 leading-tight mt-1">
                  {hoverBuilding.name}
                </span>
                <p className="text-[9.5px] text-ink-2 mt-0.5 leading-snug font-normal select-none whitespace-normal">
                  {hoverBuilding.description}
                </p>
              </div>
            </div>
          ) : hoverTileData.buildingId === 'factory' ? (
            <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-2.5 flex items-start gap-2 select-none">
              <span className="text-xl mt-0.5 shrink-0">🏭</span>
              <div className="flex flex-col min-w-0">
                <span className="text-[10px] font-mono uppercase tracking-wider text-amber-700 leading-none font-bold">
                  Industrie-Areal
                </span>
                <span className="font-serif font-bold text-[11px] text-ink-0 leading-snug mt-1">
                  Papierfabrik Düren
                </span>
                <p className="text-[9.5px] text-ink-2 mt-0.5 leading-snug font-normal select-none whitespace-normal">
                  Hauptverbraucher des Rur-Wassers. Beeinflusst die Wasserqualität des Unterlaufs intensiv.
                </p>
              </div>
            </div>
          ) : hoverTileData.hasRiverConnection ? (
            <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-2 select-none text-[9.5px]">
              <span className="font-bold text-blue-700">🌊 Rur-Flussverbindung</span>
              <p className="text-ink-2 leading-snug mt-0.5 text-[9px] whitespace-normal">Dient als hydrobiologischer Korridor & Pufferfläche.</p>
            </div>
          ) : null}

          {/* Specs Details Grid */}
          <div className="grid grid-cols-2 gap-x-3 gap-y-2 text-[10px] select-none">
            {/* WRRL Ecology Status */}
            <div className="flex flex-col gap-0.5">
              <span className="font-mono text-[8.5px] uppercase tracking-wider text-ink-3 font-semibold">WRRL Zustand</span>
              <div className={`border rounded-lg px-2 py-1 text-[10px] font-bold text-center leading-normal select-none ${getWRRLBadgeStyle(hoverTileData.wrrl_quality)}`}>
                Klasse {hoverTileData.wrrl_quality.toFixed(1)}
                <div className="text-[7.5px] font-medium leading-none mt-0.5">{getWRRLLabel(hoverTileData.wrrl_quality)}</div>
              </div>
            </div>

            {/* Flood Risk */}
            <div className="flex flex-col gap-0.5">
              <span className="font-mono text-[8.5px] uppercase tracking-wider text-ink-3 font-semibold">Flutrisiko</span>
              <div className={`border rounded-lg px-2 py-1 text-[10px] font-bold text-center leading-normal select-none ${getFloodRiskBadgeStyle(hoverTileData.flood_risk)}`}>
                {hoverTileData.flood_risk}
                <div className="text-[7.5px] font-medium leading-none mt-0.5">Hochwasserrisiko</div>
              </div>
            </div>

            {/* Biodiversity / FFH Wert */}
            <div className="col-span-2 flex flex-col gap-1 mt-1 border-t border-dashed border-ink-1/10 pt-2 select-none">
              <div className="flex items-center justify-between text-[9px] font-mono text-ink-3">
                <span>FFH-BIODIVERSITÄT:</span>
                <span className="font-bold text-emerald-600">{hoverTileData.ffh_value}%</span>
              </div>
              <div className="w-full bg-parch-3 rounded-full h-1.5 overflow-hidden">
                <div
                  style={{ width: `${hoverTileData.ffh_value}%` }}
                  className="bg-emerald-500 h-full rounded-full transition-all duration-300"
                />
              </div>
            </div>

            {/* Moisture / Bodenfeuchtigkeit */}
            <div className="col-span-2 flex flex-col gap-1 select-none">
              <div className="flex items-center justify-between text-[9px] font-mono text-ink-3">
                <span>BODENFEUCHTIGKEIT:</span>
                <span className="font-bold text-blue-600">{hoverTileData.moisture}%</span>
              </div>
              <div className="w-full bg-parch-3 rounded-full h-1.5 overflow-hidden">
                <div
                  style={{ width: `${hoverTileData.moisture}%` }}
                  className="bg-blue-400 h-full rounded-full transition-all duration-300"
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── MAP SHORTCUTS / STEUERUNG HELP DIALOG ── */}
      {showShortcuts && (
        <div className="fixed inset-0 bg-ink-0/60 backdrop-blur-sm z-[9999] flex items-center justify-center p-4">
          <div
            className="bg-parch-0 border-2 border-ink-1 rounded-xl shadow-2xl max-w-md w-full overflow-hidden relative paper-card text-left text-ink-1 font-sans select-none animate-in fade-in zoom-in duration-200"
            id="map-shortcuts-dialog"
          >
            {/* Corner Decorative Marks */}
            <div className="absolute top-2 left-2 w-3 h-3 border-t border-l border-ink-3" />
            <div className="absolute top-2 right-2 w-3 h-3 border-t border-r border-ink-3" />
            <div className="absolute bottom-2 left-2 w-3 h-3 border-b border-l border-ink-3" />
            <div className="absolute bottom-2 right-2 w-3 h-3 border-b border-r border-ink-3" />

            {/* Header */}
            <div className="bg-ink-1 px-4 py-3 flex items-center justify-between border-b border-ink-0">
              <div className="flex items-center gap-2">
                <HelpCircle size={18} className="text-parch-2" />
                <h3 className="font-serif font-bold text-parch-1 text-sm sm:text-base tracking-wide">
                  Karte & Steuerung
                </h3>
              </div>
              <button
                onClick={() => setShowShortcuts(false)}
                className="text-parch-3 hover:text-parch-1 p-1 hover:bg-white/10 rounded transition-colors"
                aria-label="Schließen"
              >
                <X size={18} />
              </button>
            </div>

            {/* Dialog Content */}
            <div className="p-5 flex flex-col gap-4 max-h-[80vh] overflow-y-auto">
              <p className="text-xs text-ink-2 leading-relaxed">
                Willkommen an der Rur! Du kannst dich völlig frei auf dem interaktiven Spielplan bewegen. Hier sind die wichtigsten Steuerungsmöglichkeiten für Desktop und Mobilgeräte:
              </p>

              <div className="flex flex-col gap-3.5">
                {/* 1. Drag to Pan */}
                <div className="flex gap-3">
                  <div className="w-7 h-7 rounded-lg bg-parch-3 border border-ink-1/10 flex items-center justify-center shrink-0">
                    <Move size={14} className="text-ink-0" />
                  </div>
                  <div className="flex flex-col min-w-0">
                    <h4 className="font-serif font-bold text-xs text-ink-0 leading-tight">
                      Karte verschieben (Pan)
                    </h4>
                    <p className="text-[11px] text-ink-2 leading-relaxed mt-0.5">
                      Halte die linke Maustaste gedrückt und ziehe, um die Ansicht zu verschieben. Auf Mobilgeräten kannst du einfach mit einem Finger wischen oder wischen/ziehen.
                    </p>
                  </div>
                </div>

                {/* 2. Zoom Controls */}
                <div className="flex gap-3">
                  <div className="w-7 h-7 rounded-lg bg-parch-3 border border-ink-1/10 flex items-center justify-center shrink-0">
                    <ZoomIn size={14} className="text-ink-0" />
                  </div>
                  <div className="flex flex-col min-w-0">
                    <h4 className="font-serif font-bold text-xs text-ink-0 leading-tight">
                      Karten-Zoom
                    </h4>
                    <p className="text-[11px] text-ink-2 leading-relaxed mt-0.5">
                      Verwende das Mausrad zum stufenlosen Heranzuomen, oder nutze die bequemen <span className="font-mono bg-parch-2 px-1 py-0.2 rounded border border-ink-1/10 text-[10px]">+</span> und <span className="font-mono bg-parch-2 px-1 py-0.2 rounded border border-ink-1/10 text-[10px]">−</span> Tasten in der Zoomleiste unten links.
                    </p>
                  </div>
                </div>

                {/* 3. Mouse Hover Details */}
                <div className="flex gap-3">
                  <div className="w-7 h-7 rounded-lg bg-parch-3 border border-ink-1/10 flex items-center justify-center shrink-0">
                    <Eye size={14} className="text-ink-0" />
                  </div>
                  <div className="flex flex-col min-w-0">
                    <h4 className="font-serif font-bold text-xs text-ink-0 leading-tight">
                      Feld-Details (Hover)
                    </h4>
                    <p className="text-[11px] text-ink-2 leading-relaxed mt-0.5">
                      Bewege deine Maus über ein beliebiges Feld, um sofort ein Info-Fenster mit Werten wie dem Ökologie-Zustand (WRRL), dem Flutrisiko und der Bodenfeuchtigkeit zu öffnen.
                    </p>
                  </div>
                </div>

                {/* 4. Click tile to select */}
                <div className="flex gap-3">
                  <div className="w-7 h-7 rounded-lg bg-parch-3 border border-ink-1/10 flex items-center justify-center shrink-0">
                    <MousePointerClick size={14} className="text-ink-0" />
                  </div>
                  <div className="flex flex-col min-w-0">
                    <h4 className="font-serif font-bold text-xs text-ink-0 leading-tight">
                      Feld auswählen & Bauen
                    </h4>
                    <p className="text-[11px] text-ink-2 leading-relaxed mt-0.5">
                      Klicke oder tippe auf ein Hexagon-Feld, um es zu fokussieren. Dies zeigt dir detaillierte Kennzahlen im rechten Info-Panel an und ermöglicht es dir, freigeschaltete Projekte zu errichten.
                    </p>
                  </div>
                </div>

                {/* 5. Minimap navigation */}
                <div className="flex gap-3">
                  <div className="w-7 h-7 rounded-lg bg-parch-3 border border-ink-1/10 flex items-center justify-center shrink-0">
                    <Map size={14} className="text-ink-0" />
                  </div>
                  <div className="flex flex-col min-w-0">
                    <h4 className="font-serif font-bold text-xs text-ink-0 leading-tight">
                      Minikarte / Schnellreise
                    </h4>
                    <p className="text-[11px] text-ink-2 leading-relaxed mt-0.5">
                      Oben links findest du eine verkleinerte Übersicht des Flussverlaufs. Klicke oder ziehe dort, um blitzschnell zu einem anderen Ort der Rur zu springen.
                    </p>
                  </div>
                </div>
              </div>

              {/* Action Button */}
              <button
                onClick={() => setShowShortcuts(false)}
                className="mt-2 w-full h-10 border border-ink-1 hover:bg-ink-1 hover:text-parch-1 rounded-lg text-xs font-serif font-bold transition-all shadow-sm active:scale-[0.98] select-none text-ink-0 bg-parch-2 cursor-pointer"
              >
                Verstanden & Weiter
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
