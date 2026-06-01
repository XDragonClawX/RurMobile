/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { CheckCircle2, TrendingUp, Sparkles, Coins, FlaskConical, Award, Shield, Users, Leaf, Trash2 } from 'lucide-react';

export interface GameNotificationDetail {
  label: string;
  value: string;
  changeType?: 'positive' | 'negative' | 'neutral';
}

export interface GameNotification {
  type: 'build' | 'card' | 'research' | 'mode' | 'season' | 'event';
  title: string;
  subtitle?: string;
  icon: string;
  badgeText?: string;
  badgeStyle?: string;
  details: GameNotificationDetail[];
  flavorText?: string;
  requiresConfirmation?: boolean;
}

interface GameFeedbackOverlayProps {
  notification: GameNotification | null;
  onClose: () => void;
  onConfirm?: () => void;
  onCancel?: () => void;
}

export const GameFeedbackOverlay: React.FC<GameFeedbackOverlayProps> = ({
  notification,
  onClose,
  onConfirm,
  onCancel,
}) => {
  if (!notification) return null;

  // Header helper colors & accents depending on type
  const getHeaderTheme = (type: string) => {
    switch (type) {
      case 'build':
        return {
          bannerBg: 'bg-emerald-600',
          shadowGlow: 'rgba(16, 185, 129, 0.2)',
          accentIcon: <Sparkles className="w-5 h-5 text-emerald-100" />,
          btnText: 'Maßnahme Errichten!',
          btnClass: 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-700/30'
        };
      case 'card':
        return {
          bannerBg: 'bg-eco-primary',
          shadowGlow: 'rgba(74, 111, 80, 0.2)',
          accentIcon: <TrendingUp className="w-5 h-5 text-emerald-100" />,
          btnText: 'Aktion ausgeführt',
          btnClass: 'bg-eco-primary hover:bg-eco-primary/95 text-white shadow-eco-primary/30'
        };
      case 'research':
        return {
          bannerBg: 'bg-indigo-600',
          shadowGlow: 'rgba(79, 70, 229, 0.2)',
          accentIcon: <FlaskConical className="w-5 h-5 text-indigo-100" />,
          btnText: 'Wissen erweitert!',
          btnClass: 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-indigo-700/30'
        };
      case 'mode':
        return {
          bannerBg: 'bg-amber-600',
          shadowGlow: 'rgba(217, 119, 6, 0.2)',
          accentIcon: <CheckCircle2 className="w-5 h-5 text-amber-100" />,
          btnText: 'Betrieb modifiziert',
          btnClass: 'bg-amber-600 hover:bg-amber-700 text-white shadow-amber-700/30'
        };
      case 'season':
        return {
          bannerBg: 'bg-sky-600',
          shadowGlow: 'rgba(2, 132, 199, 0.2)',
          accentIcon: <Award className="w-5 h-5 text-sky-100" />,
          btnText: 'Neue Saison starten!',
          btnClass: 'bg-sky-600 hover:bg-sky-700 text-white shadow-sky-700/30'
        };
      default:
        return {
          bannerBg: 'bg-emerald-700',
          shadowGlow: 'rgba(16, 185, 129, 0.2)',
          accentIcon: <Sparkles className="w-5 h-5 text-emerald-100" />,
          btnText: 'Hervorragend!',
          btnClass: 'bg-emerald-700 hover:bg-emerald-800 text-white shadow-emerald-700/30'
        };
    }
  };

  const theme = getHeaderTheme(notification.type);

  // Helper helper to get corresponding icon for metrics
  const getMetricIcon = (label: string) => {
    const l = label.toLowerCase();
    if (l.includes('budget') || l.includes('geld') || l.includes('kosten')) return <Coins className="w-4 h-4 text-amber-600 shrink-0" />;
    if (l.includes('forschung') || l.includes('wissenschaft')) return <FlaskConical className="w-4 h-4 text-indigo-500 shrink-0" />;
    if (l.includes('artenschutz') || l.includes('ffh') || l.includes('fauna')) return <Leaf className="w-4 h-4 text-emerald-500 shrink-0" />;
    if (l.includes('akzeptanz') || l.includes('bürger') || l.includes('nimby')) return <Users className="w-4 h-4 text-blue-500 shrink-0" />;
    if (l.includes('risiko') || l.includes('klima') || l.includes('hochwasser')) return <Shield className="w-4 h-4 text-rose-500 shrink-0" />;
    if (l.includes('güte') || l.includes('wrrl') || l.includes('wasser')) return <Award className="w-4 h-4 text-cyan-500 shrink-0" />;
    return <Sparkles className="w-4 h-4 text-amber-500 shrink-0" />;
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 bg-ink-0/60 backdrop-blur-sm z-[99999] flex items-center justify-center p-4 overflow-y-auto">
        <motion.div
          initial={{ scale: 0.93, opacity: 0, y: 15 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.95, opacity: 0, y: 10 }}
          transition={{ type: 'spring', duration: 0.45, bounce: 0.25 }}
          className="relative bg-[#fdfaf2] border-2 border-[#4a3520] rounded-2xl shadow-2xl overflow-hidden max-w-md w-full my-auto paper-card flex flex-col"
          style={{ boxShadow: `0 25px 50px -12px ${theme.shadowGlow}, 0 0 0 2px #4a3520, inset 0 0 40px rgba(74, 53, 32, 0.05)` }}
        >
          {/* Card Frame Corners */}
          <div className="absolute top-2 left-2 w-4 h-4 border-t-2 border-l-2 border-[#4a3520]/40 pointer-events-none" />
          <div className="absolute top-2 right-2 w-4 h-4 border-t-2 border-r-2 border-[#4a3520]/40 pointer-events-none" />
          <div className="absolute bottom-2 left-2 w-4 h-4 border-b-2 border-l-2 border-[#4a3520]/40 pointer-events-none" />
          <div className="absolute bottom-2 right-2 w-4 h-4 border-b-2 border-r-2 border-[#4a3520]/40 pointer-events-none" />

          {/* Animated Header Banner */}
          <div className={`py-4 px-6 text-white ${theme.bannerBg} border-b-2 border-[#4a3520] relative flex items-center justify-between`}>
            {/* Soft decorative game lines */}
            <div className="absolute inset-0 bg-gradient-to-r from-black/5 to-white/10" />
            <div className="absolute bottom-0 inset-x-0 h-[3px] bg-black/15" />
            
            <div className="flex items-center gap-3.5 z-10">
              <span className="text-3xl filter drop-shadow-md select-none">{notification.icon}</span>
              <div className="flex flex-col text-left">
                <span className="text-[10px] font-mono tracking-widest uppercase text-white/85 font-extrabold">
                  {notification.badgeText || 'ERFOLG'}
                </span>
                <h3 className="font-serif font-black text-base sm:text-lg tracking-wide leading-tight filter drop-shadow">
                  {notification.title}
                </h3>
              </div>
            </div>

            <div className="z-10 bg-white/20 p-2 rounded-full backdrop-blur-sm shadow-inner hidden sm:block">
              {theme.accentIcon}
            </div>
          </div>

          {/* Body Content */}
          <div className="p-5 flex-1 flex flex-col gap-4 text-left">
            {notification.subtitle && (
              <p className="font-serif font-bold text-ink-1 text-sm bg-parch-2/45 border border-ink-1/10 rounded-lg py-1.5 px-3">
                {notification.subtitle}
              </p>
            )}

            {/* List Details */}
            {notification.details.length > 0 && (
              <div className="flex flex-col gap-2">
                <span className="text-[9px] font-mono font-bold tracking-widest text-[#8c745a] uppercase border-b border-ink-1/10 pb-1">
                  EFFEKTE & RESSOURCEN-TRANSFERS
                </span>
                
                <div className="grid grid-cols-1 gap-2 mt-1">
                  {notification.details.map((det, idx) => {
                    let badgeColor = 'bg-parch-3/60 text-ink-1 border-ink-1/10';
                    if (det.changeType === 'positive') {
                      badgeColor = 'bg-emerald-50 text-emerald-800 border-emerald-300';
                    } else if (det.changeType === 'negative') {
                      badgeColor = 'bg-rose-50 text-rose-800 border-rose-300';
                    } else if (det.changeType === 'neutral') {
                      badgeColor = 'bg-amber-50 text-amber-800 border-amber-300';
                    }

                    return (
                      <motion.div
                        key={idx}
                        className="flex items-center justify-between p-2.5 bg-[#f5efe2] border border-[#dcd2be] rounded-xl shadow-sm transition-all hover:bg-[#ebdfc7]"
                        initial={{ opacity: 0, x: -8 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: idx * 0.06 }}
                      >
                        <div className="flex items-center gap-2.5">
                          {getMetricIcon(det.label)}
                          <span className="text-xs font-serif font-semibold text-[#4a3520]">{det.label}</span>
                        </div>
                        <span className={`text-xs font-mono font-bold px-2 py-0.5 rounded-lg border ${badgeColor}`}>
                          {det.value}
                        </span>
                      </motion.div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Flavor Text / Atmospheric Strategy quote */}
            {notification.flavorText && (
              <div className="relative mt-1 px-4 py-3 bg-[#f3edd7] border border-dashed border-ink-1/25 rounded-xl italic text-xs text-ink-2 font-serif text-center leading-relaxed">
                <span className="absolute top-0.5 left-2 font-serif text-2xl text-ink-4/30">“</span>
                <span className="relative z-10 inline-block">{notification.flavorText}</span>
                <span className="absolute bottom-[-10px] right-2 font-serif text-2xl text-ink-4/30">”</span>
              </div>
            )}

            {/* Confirm button */}
            {notification.requiresConfirmation ? (
              <div className="flex gap-3 mt-2">
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={onCancel}
                  className="flex-1 py-3 rounded-xl font-serif font-bold text-xs uppercase tracking-widest transition-all border-2 border-dashed border-red-500/50 hover:bg-red-50 text-red-700 select-none text-center cursor-pointer flex items-center justify-center gap-1.5"
                >
                  <span>Abbrechen</span>
                </motion.button>
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={onConfirm}
                  className={`flex-1 py-3 rounded-xl font-serif font-bold text-xs uppercase tracking-widest transition-all shadow-md active:shadow border border-[#4a3520] select-none text-center cursor-pointer flex items-center justify-center gap-1.5 ${theme.btnClass}`}
                >
                  <CheckCircle2 className="w-4 h-4 inline" />
                  <span>Bestätigen</span>
                </motion.button>
              </div>
            ) : (
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={onClose}
                className={`w-full mt-2 py-3 rounded-xl font-serif font-bold text-xs uppercase tracking-widest transition-all shadow-md active:shadow border border-[#4a3520] select-none text-center cursor-pointer flex items-center justify-center gap-1.5 ${theme.btnClass}`}
              >
                <CheckCircle2 className="w-4 h-4 inline" />
                <span>{theme.btnText}</span>
              </motion.button>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
