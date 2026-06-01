/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useRef, useEffect, useState, MouseEvent, TouchEvent } from 'react';
import { TileData, TerrainType, BuildingType } from '../types';

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
  // Draw three concentric flat jagged star shapes / layers from above
  ctx.fillStyle = '#0f2913'; // Outer dark green
  drawFlatStar(ctx, tx, ty, r, r * 0.5, 8);
  ctx.fillStyle = '#1b4a22'; // Middle green
  drawFlatStar(ctx, tx, ty, r * 0.7, r * 0.35, 8);
  ctx.fillStyle = '#2e7d32'; // Top light green
  drawFlatStar(ctx, tx, ty, r * 0.4, r * 0.2, 8);
  ctx.restore();
};

const drawMiniOak = (ctx: CanvasRenderingContext2D, tx: number, ty: number, size: number, zoom: number) => {
  const r = size * 1.6 * zoom;
  ctx.save();
  // Draw soft drop shadow
  ctx.fillStyle = 'rgba(0, 0, 0, 0.08)';
  ctx.beginPath();
  ctx.arc(tx + 1 * zoom, ty + 1.5 * zoom, r, 0, Math.PI * 2);
  ctx.fill();

  // Draw three overlapping circles for an organic, modern flat top-down look
  ctx.fillStyle = '#1e3f11'; // Shadow layer
  ctx.beginPath();
  ctx.arc(tx, ty, r, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = '#2d5a1b'; // Mid layer slightly shifted northwest
  ctx.beginPath();
  ctx.arc(tx - 0.5 * zoom, ty - 0.5 * zoom, r * 0.85, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = '#417d2a'; // Highlight layer on top
  ctx.beginPath();
  ctx.arc(tx - 1.2 * zoom, ty - 1.2 * zoom, r * 0.65, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
};

const drawMiniHouse = (ctx: CanvasRenderingContext2D, tx: number, ty: number, zoom: number, roofColor = '#e25c5c', roofDarkColor = '#bf4343') => {
  const w = 7 * zoom;
  const h = 5 * zoom;
  ctx.save();
  // Drop shadow
  ctx.fillStyle = 'rgba(0,0,0,0.06)';
  ctx.fillRect(tx - w + 1 * zoom, ty - h + 1 * zoom, w * 2, h * 2);

  // Two halves of the pitched roof
  // Top half (bright roofColor)
  ctx.fillStyle = roofColor;
  ctx.beginPath();
  ctx.moveTo(tx - w, ty);
  ctx.lineTo(tx + w, ty);
  ctx.lineTo(tx + w, ty - h);
  ctx.lineTo(tx - w, ty - h);
  ctx.closePath();
  ctx.fill();

  // Bottom half (shaded roofDarkColor)
  ctx.fillStyle = roofDarkColor;
  ctx.beginPath();
  ctx.moveTo(tx - w, ty);
  ctx.lineTo(tx + w, ty);
  ctx.lineTo(tx + w, ty + h);
  ctx.lineTo(tx - w, ty + h);
  ctx.closePath();
  ctx.fill();

  // White ridge line down the center
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 1 * zoom;
  ctx.beginPath();
  ctx.moveTo(tx - w, ty);
  ctx.lineTo(tx + w, ty);
  ctx.stroke();

  // Tiny flat chimney block
  ctx.fillStyle = '#5c3e21';
  ctx.fillRect(tx + w * 0.4, ty - h * 0.7, 1.8 * zoom, 1.8 * zoom);
  ctx.restore();
};

const drawMiniFactory = (ctx: CanvasRenderingContext2D, tx: number, ty: number, zoom: number) => {
  const w = 9 * zoom;
  const h = 7 * zoom;
  ctx.save();
  // Drop shadow
  ctx.fillStyle = 'rgba(0,0,0,0.08)';
  ctx.fillRect(tx - w + 1.2 * zoom, ty - h + 1.2 * zoom, w * 2, h * 2);

  // Main factory roof building
  ctx.fillStyle = '#475569';
  ctx.fillRect(tx - w, ty - h * 0.5, w * 2, h);

  // Secondary building
  ctx.fillStyle = '#334155';
  ctx.fillRect(tx - w * 0.6, ty - h, w * 1.2, h * 0.7);

  // Sawtooth roof style stripes from above
  ctx.strokeStyle = '#64748b';
  ctx.lineWidth = 1.2 * zoom;
  for (let i = -3; i <= 3; i++) {
    ctx.beginPath();
    ctx.moveTo(tx + i * 2 * zoom, ty - h * 0.45);
    ctx.lineTo(tx + i * 2 * zoom, ty + h * 0.45);
    ctx.stroke();
  }

  // Large chimney circle (looking straight down into the pipe)
  ctx.fillStyle = '#1e293b';
  ctx.strokeStyle = '#da4444'; // Red-orange warning tip rim
  ctx.lineWidth = 1 * zoom;
  ctx.beginPath();
  ctx.arc(tx + w * 0.55, ty - h * 0.5, 2.5 * zoom, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  ctx.restore();
};

const drawMiniHayBale = (ctx: CanvasRenderingContext2D, tx: number, ty: number, zoom: number) => {
  const r = 3.6 * zoom;
  ctx.save();
  // Straw colored flat round spiral
  ctx.fillStyle = '#d97706';
  ctx.beginPath();
  ctx.arc(tx, ty, r, 0, Math.PI * 2);
  ctx.fill();

  // Dynamic light yellow rings/spiral
  ctx.strokeStyle = '#fef08a';
  ctx.lineWidth = 0.8 * zoom;
  ctx.beginPath();
  ctx.arc(tx, ty, r * 0.7, 0, Math.PI * 2);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(tx, ty, r * 0.4, 0, Math.PI * 2);
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

          // Fill flat hexagon tile directly
          ctx.beginPath();
          ctx.moveTo(pts[0][0], pts[0][1]);
          for (let i = 1; i < 6; i++) {
            ctx.lineTo(pts[i][0], pts[i][1]);
          }
          ctx.closePath();

          let fillCol = style.fill;

          // Water ripple color animation
          if (cell.terrain === 'Water') {
            const phase = (gx * 0.4 + gy * 0.7) + elapsed * 1.4;
            const flowW = Math.sin(phase) * 6;
            const rOffset = Math.round(flowW);
            fillCol = `rgb(${58 + rOffset}, ${130 + rOffset}, ${190 + Math.round(flowW * 0.5)})`;
          }

          if (isHov && !isSel) {
            ctx.fillStyle = fillCol;
            ctx.fill();
            // Solid flat overlay highlight
            ctx.fillStyle = 'rgba(255, 255, 255, 0.15)';
            ctx.fill();
          } else {
            ctx.fillStyle = fillCol;
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

          const seed = getTileSeed(gx, gy);

          if (cell.terrain === 'Wiese') {
            // Draw scattered grasses and a rare wild daisy
            const count = Math.floor(1 + Math.abs(seed * 4) % 3); // 1 to 3 grasses
            for (let i = 0; i < count; i++) {
              const gxOff = Math.sin(seed + i * 1.7) * 12 * zoom;
              const gyOff = Math.cos(seed + i * 2.3) * 12 * zoom;
              drawMiniGrass(ctx, cx + gxOff, cy + gyOff, zoom, '#418224');
            }
            if (Math.abs(seed * 10) % 2 < 0.7) {
              const fX = Math.sin(seed + 9.9) * 10 * zoom;
              const fY = Math.cos(seed + 4.4) * 10 * zoom;
              drawMiniFlower(ctx, cx + fX, cy + fY, zoom);
            }
          } else if (cell.terrain === 'Auwald') {
            // Draw multiple cute flat organic trees
            const treeCount = Math.floor(2 + Math.abs(seed * 5) % 3); // 2 to 4 trees
            for (let i = 0; i < treeCount; i++) {
              const gxOff = Math.sin(seed * 2 + i * 3.1) * 14 * zoom;
              const gyOff = Math.cos(seed * 1.5 + i * 2.5) * 14 * zoom;
              const isPine = (Math.abs(seed * 15 + i * 9) % 2) > 0.8;
              if (isPine) {
                drawMiniPine(ctx, cx + gxOff, cy + gyOff, 4 + (Math.abs(seed * 7 + i) % 2), zoom);
              } else {
                drawMiniOak(ctx, cx + gxOff, cy + gyOff, 3.5 + (Math.abs(seed * 5 + i) % 2.5), zoom);
              }
            }
          } else if (cell.terrain === 'Acker') {
            // Neat flat parallel tractor ridges from above
            ctx.strokeStyle = 'rgba(74, 45, 10, 0.08)';
            ctx.lineWidth = 1 * zoom;
            const ridgCount = 6;
            for (let i = -ridgCount; i <= ridgCount; i++) {
              ctx.beginPath();
              const offset = i * 6 * zoom;
              ctx.moveTo(cx - 25 * zoom + offset, cy - 25 * zoom);
              ctx.lineTo(cx - 25 * zoom + offset, cy + 25 * zoom);
              ctx.stroke();
            }
            // Draw a tiny hay bale
            if (Math.abs(seed * 8) % 3 < 1.2) {
              const bX = Math.sin(seed + 1.2) * 10 * zoom;
              const bY = Math.cos(seed + 2.1) * 10 * zoom;
              drawMiniHayBale(ctx, cx + bX, cy + bY, zoom);
            }
          } else if (cell.terrain === 'Siedlung') {
            // Draw flat red and orange roof cottage houses from above
            const houseCount = Math.floor(1 + Math.abs(seed * 4) % 2); // 1 to 2 houses
            const roofs = ['#e25c5c', '#ed8936', '#f59e0b'];
            const darkRoofs = ['#bf4343', '#c05621', '#d97706'];
            for (let i = 0; i < houseCount; i++) {
              const gxOff = Math.sin(seed * 11 + i * 5.3) * 12 * zoom;
              const gyOff = Math.cos(seed * 7 + i * 8.9) * 12 * zoom;
              const rIdx = Math.floor(Math.abs(seed * (i + 1) * 3) % roofs.length);
              drawMiniHouse(ctx, cx + gxOff, cy + gyOff, zoom, roofs[rIdx], darkRoofs[rIdx]);
            }
          } else if (cell.terrain === 'Gewerbe') {
            // Draw flat factory blocks
            drawMiniFactory(ctx, cx, cy, zoom);
          } else if (cell.terrain === 'Water') {
            // Draw curved river animated ripples
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
            ctx.lineWidth = 1 * zoom;
            const ripples = 2;
            for (let i = 0; i < ripples; i++) {
              const ph = (elapsed * 1.6 + seed * 3 + i * Math.PI) % (Math.PI * 2);
              const rx = Math.cos(ph) * 10 * zoom;
              const ry = Math.sin(ph) * 8 * zoom;
              ctx.beginPath();
              ctx.arc(cx + rx, cy + ry, 4 * zoom, 0, Math.PI, false);
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
        }
      }
    }
    setHoverTile(null);
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

      {/* On-screen Zoom Control for Tablet touch ease */}
      <div className="absolute bottom-4 left-4 z-40 bg-parch-0/95 border border-ink-1/25 rounded-lg flex items-center gap-3 p-2 shadow-lg scale-90 sm:scale-100">
        <button
          onClick={() => setZoom(prev => Math.max(0.65, prev - 0.15))}
          className="w-10 h-10 rounded bg-parch-2 active:bg-parch-3 text-ink-0 font-bold text-lg flex items-center justify-center border border-ink-1/20 shadow-sm"
        >
          −
        </button>
        <span className="font-mono text-xs text-ink-2 font-medium w-14 text-center">
          Zoom {Math.round(zoom * 100)}%
        </span>
        <button
          onClick={() => setZoom(prev => Math.min(1.8, prev + 0.15))}
          className="w-10 h-10 rounded bg-parch-2 active:bg-parch-3 text-ink-0 font-bold text-lg flex items-center justify-center border border-ink-1/20 shadow-sm"
        >
          +
        </button>
        <button
          onClick={() => {
            const container = containerRef.current;
            if (container) {
              setZoom(1.1);
              setDragOffset({
                x: (container.clientWidth - 16 * HEX_W) / 2 + 50,
                y: (container.clientHeight - 16 * HEX_H * 0.75) / 2 + 30,
              });
            }
          }}
          className="px-3 h-10 rounded bg-parch-3 active:bg-parch-4 text-ink-0 flex items-center justify-center text-xs font-serif font-semibold border border-ink-1/20 shadow-sm"
        >
          Zentrieren
        </button>
      </div>
    </div>
  );
};
