/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * GameEndScreen — shown when year >= 2041.
 * WIN  : globalWrrl >= 65% && citizenAcceptance >= 55%
 * LOSS : otherwise (ecological collapse or social collapse)
 */

import React from 'react';
import { GameStats, Species } from '../types';

interface Props {
  won: boolean;
  stats: GameStats;
  speciesList: Species[];
  onRestart: () => void;
}

interface ScoreRow {
  label: string;
  value: string;
  met: boolean;
  icon: string;
}

export function GameEndScreen({ won, stats, speciesList, onRestart }: Props) {
  const unlockedSpecies = speciesList.filter(s => !s.locked && s.pct >= 30);

  const scoreRows: ScoreRow[] = [
    {
      label: 'WRRL Gewässerqualität',
      value: `${stats.globalWrrl}%`,
      met: stats.globalWrrl >= 65,
      icon: '💧',
    },
    {
      label: 'Bürgerakzeptanz',
      value: `${stats.citizenAcceptance}%`,
      met: stats.citizenAcceptance >= 55,
      icon: '🤝',
    },
    {
      label: 'FFH Biodiversität',
      value: `${stats.globalFfh}%`,
      met: stats.globalFfh >= 55,
      icon: '🌿',
    },
    {
      label: 'Klimarisiko',
      value: `${stats.climateRisk}%`,
      met: stats.climateRisk < 50,
      icon: '🌡️',
    },
    {
      label: 'Durchgängigkeit Rur',
      value: `${stats.continuity}%`,
      met: stats.continuity >= 40,
      icon: '🐟',
    },
    {
      label: 'CO₂-Fußabdruck',
      value: `${stats.co2Footprint}t`,
      met: stats.co2Footprint < 100,
      icon: '🏭',
    },
  ];

  const metCount = scoreRows.filter(r => r.met).length;
  const starRating = won
    ? metCount >= 5 ? 3 : metCount >= 3 ? 2 : 1
    : 0;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(34,40,42,0.88)', backdropFilter: 'blur(10px)' }}
    >
      <div
        className="rur-panel w-full max-w-lg overflow-hidden"
        style={{ maxHeight: '90dvh', overflowY: 'auto' }}
      >
        {/* Header band */}
        <div
          className="flex flex-col items-center gap-3 px-6 py-8 text-center"
          style={{
            background: won
              ? 'linear-gradient(135deg,#2A6F7E 0%,#4A7A3A 100%)'
              : 'linear-gradient(135deg,#6E3A22 0%,#22282A 100%)',
          }}
        >
          <span style={{ fontSize: 56, lineHeight: 1 }}>
            {won ? '🏆' : '🌊'}
          </span>
          <div>
            <h1
              className="font-serif font-semibold text-2xl"
              style={{ color: '#FAF7F0', letterSpacing: '-0.01em' }}
            >
              {won ? 'Renaturierung erfolgreich!' : 'Ökologischer Kollaps'}
            </h1>
            <p style={{ color: 'rgba(250,247,240,.7)', fontSize: 14, marginTop: 6 }}>
              {won
                ? `Die Rur erreicht 2040 EU-Umweltziele — Düren wird Vorbild für ganz NRW.`
                : `Zu viele ökologische oder gesellschaftliche Ziele wurden verfehlt.`}
            </p>
          </div>

          {/* Star rating */}
          <div className="flex gap-2 mt-1">
            {[1, 2, 3].map(s => (
              <span
                key={s}
                style={{
                  fontSize: 28,
                  opacity: s <= starRating ? 1 : 0.25,
                  filter: s <= starRating ? 'drop-shadow(0 0 6px #F0DC80)' : 'none',
                }}
              >
                ⭐
              </span>
            ))}
          </div>
        </div>

        {/* Score table */}
        <div className="px-5 py-5 flex flex-col gap-2">
          <p className="eyebrow mb-1">Zielerreichung 2040</p>

          {scoreRows.map(row => (
            <div
              key={row.label}
              className="flex items-center justify-between gap-3 px-4 py-2.5 rounded-lg"
              style={{
                background: row.met ? 'rgba(74,122,58,.08)' : 'rgba(174,60,40,.06)',
                border: `1px solid ${row.met ? 'rgba(74,122,58,.22)' : 'rgba(174,60,40,.18)'}`,
              }}
            >
              <div className="flex items-center gap-2">
                <span style={{ fontSize: 16 }}>{row.icon}</span>
                <span style={{ font: '500 13px/1 "Inter", sans-serif', color: '#22282A' }}>
                  {row.label}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span
                  style={{
                    font: '500 13px/1 "JetBrains Mono", monospace',
                    color: row.met ? '#4A7A3A' : '#AE3C28',
                  }}
                >
                  {row.value}
                </span>
                <span style={{ fontSize: 14 }}>{row.met ? '✓' : '✗'}</span>
              </div>
            </div>
          ))}
        </div>

        {/* Species unlocked */}
        {unlockedSpecies.length > 0 && (
          <div className="px-5 pb-4">
            <p className="eyebrow mb-2">Wiederangesiedelte Arten</p>
            <div className="flex flex-wrap gap-2">
              {unlockedSpecies.map(sp => (
                <span
                  key={sp.name}
                  className="ru-tag"
                  style={{
                    background: 'rgba(74,122,58,.08)',
                    borderColor: 'rgba(74,122,58,.25)',
                    color: '#4A7A3A',
                  }}
                >
                  <span className="dot" />
                  {sp.name.replace(' 🔒', '')} — {sp.pct}%
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Final round summary */}
        <div
          className="mx-5 mb-5 px-4 py-3 rounded-lg"
          style={{ background: '#F2EDE0', border: '1px solid #E2DBC8' }}
        >
          <p className="eyebrow mb-2">Spielbericht</p>
          <div className="flex flex-wrap gap-x-6 gap-y-1">
            {[
              { l: 'Runden gespielt', v: String(stats.round - 1) },
              { l: 'Endjahr', v: String(stats.year) },
              { l: 'Naturpunkte', v: String(stats.naturePoints) },
              { l: 'Forschungspunkte', v: `${stats.researchPoints} 🧪` },
              { l: 'Fabrik-Status', v: stats.paperFactoryMode },
            ].map(item => (
              <div key={item.l} className="flex flex-col">
                <span style={{ font: '500 9px/1 "Inter",sans-serif', letterSpacing: '.1em', textTransform: 'uppercase', color: '#8A8F95' }}>
                  {item.l}
                </span>
                <span style={{ font: '500 13px/1.4 "Playfair Display",serif', color: '#22282A', marginTop: 2 }}>
                  {item.v}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* CTA */}
        <div className="px-5 pb-6 flex gap-3 justify-center">
          <button
            className="ru-btn primary"
            style={{ minWidth: 160 }}
            onClick={onRestart}
          >
            🔄 Neues Spiel starten
          </button>
        </div>
      </div>
    </div>
  );
}
