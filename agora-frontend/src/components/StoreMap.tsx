import React, { useState, useMemo } from 'react';
import {
  Check,
  CheckCircle2,
  Navigation,
  ChevronRight,
  Store,
  MapPin,
  Sparkles,
  ArrowRight,
  X,
} from 'lucide-react';
import { Item } from '../types';
import {
  STORE_AISLES,
  computeOptimizedRoute,
  OptimizedRouteStep,
} from '../utils/storeMapData';

interface StoreMapProps {
  items: Item[];
  onToggle: (id: number) => void;
  onDelete?: (id: number) => void;
}

export const StoreMap: React.FC<StoreMapProps> = ({ items, onToggle }) => {
  const [selectedAisleId, setSelectedAisleId] = useState<string | null>(null);

  // Compute optimal route based on active shopping list
  const routeSteps = useMemo(() => computeOptimizedRoute(items), [items]);

  // Map aisleId to step data for instant lookup
  const stepByAisleId = useMemo(() => {
    const map = new Map<string, OptimizedRouteStep>();
    for (const step of routeSteps) {
      map.set(step.aisle.id, step);
    }
    return map;
  }, [routeSteps]);

  // First non-completed step is the "current" step to visit
  const currentStep = useMemo(() => {
    return routeSteps.find((s) => !s.allCompleted) || routeSteps[0] || null;
  }, [routeSteps]);

  const selectedStep = useMemo(() => {
    if (!selectedAisleId) return currentStep;
    return stepByAisleId.get(selectedAisleId) || null;
  }, [selectedAisleId, currentStep, stepByAisleId]);

  const selectedAisle = useMemo(() => {
    if (selectedAisleId) {
      return STORE_AISLES.find((a) => a.id === selectedAisleId) || null;
    }
    return selectedStep?.aisle || null;
  }, [selectedAisleId, selectedStep]);

  // Calculate SVG polyline path connecting the active waypoints in optimal order
  const pathD = useMemo(() => {
    if (routeSteps.length === 0) return '';

    // Start at entrance
    const points: { x: number; y: number }[] = [{ x: 396, y: 996 }];

    for (const s of routeSteps) {
      points.push(s.aisle.waypoint);
    }

    // End at checkouts
    points.push({ x: 397, y: 975 });

    // Build smooth quadratic bezier curve through waypoints
    let d = `M ${points[0].x} ${points[0].y}`;
    for (let i = 1; i < points.length; i++) {
      const prev = points[i - 1];
      const curr = points[i];
      const midX = (prev.x + curr.x) / 2;
      const midY = (prev.y + curr.y) / 2;
      d += ` Q ${prev.x} ${prev.y}, ${midX} ${midY}`;
    }
    const last = points[points.length - 1];
    d += ` L ${last.x} ${last.y}`;
    return d;
  }, [routeSteps]);

  const totalSteps = routeSteps.length;
  const completedSteps = routeSteps.filter((s) => s.allCompleted).length;
  const progressPercent = totalSteps > 0 ? Math.round((completedSteps / totalSteps) * 100) : 0;

  return (
    <div className="space-y-4 select-none">
      {/* Route Navigation Top Card */}
      {totalSteps > 0 ? (
        <div className="bg-gradient-to-r from-emerald-950/40 via-zinc-900/80 to-zinc-900/50 border border-emerald-900/40 rounded-3xl p-4 shadow-xl">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center shrink-0 shadow-inner">
                <Navigation className="w-5 h-5 animate-pulse" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-emerald-400 uppercase tracking-wider">
                    Parcours Optimisé
                  </span>
                  <span className="text-[11px] px-2 py-0.5 rounded-full bg-zinc-800 text-zinc-300 border border-zinc-700/60 font-mono">
                    {completedSteps}/{totalSteps} étapes
                  </span>
                </div>
                <h3 className="text-sm font-bold text-white mt-0.5 flex items-center gap-1.5 truncate">
                  {currentStep && !currentStep.allCompleted ? (
                    <>
                      <span>Prochain : </span>
                      <span className="text-emerald-300 font-extrabold">{currentStep.aisle.shortLabel}</span>
                    </>
                  ) : (
                    <span className="text-emerald-300">Tout est dans le panier ! Direction les caisses 🛒</span>
                  )}
                </h3>
              </div>
            </div>

            {/* Step selector shortcuts */}
            <div className="flex items-center gap-1.5 shrink-0">
              <button
                type="button"
                onClick={() => {
                  if (currentStep) setSelectedAisleId(currentStep.aisle.id);
                }}
                className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold flex items-center gap-1 shadow-md shadow-emerald-700/30 active:scale-95 transition"
              >
                <span>Voir</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Progress bar */}
          <div className="w-full bg-zinc-800/80 rounded-full h-1.5 mt-3.5 overflow-hidden">
            <div
              className="bg-emerald-500 h-full rounded-full transition-all duration-500 ease-out shadow-sm shadow-emerald-400/50"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>
      ) : (
        <div className="p-4 rounded-3xl bg-zinc-900/60 border border-zinc-800/80 text-center py-6">
          <Store className="w-8 h-8 text-zinc-500 mx-auto mb-2" />
          <p className="text-xs text-zinc-300 font-medium">Aucun article dans la liste</p>
          <p className="text-[11px] text-zinc-500 mt-0.5">
            Ajoute des articles pour voir le tracé optimisé sur le plan 2D !
          </p>
        </div>
      )}

      {/* Interactive 2D Supermarket Canvas */}
      <div className="relative bg-zinc-950 border border-zinc-800/80 rounded-3xl overflow-hidden shadow-2xl p-2 sm:p-3">
        <div className="flex items-center justify-between px-2 py-1 text-[11px] text-zinc-400">
          <div className="flex items-center gap-1.5">
            <MapPin className="w-3.5 h-3.5 text-emerald-400" />
            <span className="font-semibold text-zinc-300">Plan Supermarché 2D</span>
          </div>
          <span className="text-[10px] text-zinc-500">Touchez un rayon pour voir les articles</span>
        </div>

        <div className="relative w-full aspect-[1000/1024] max-h-[70vh] flex items-center justify-center">
          <svg
            viewBox="0 0 1000 1024"
            className="w-full h-full drop-shadow-md"
            preserveAspectRatio="xMidYMid meet"
          >
            <defs>
              {/* Gradients for store fixtures matching user plan */}
              <linearGradient id="aisleGreen" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stop-color="#bbf7d0" />
                <stop offset="100%" stop-color="#86efac" />
              </linearGradient>

              <linearGradient id="aisleGreenActive" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stop-color="#34d399" />
                <stop offset="100%" stop-color="#059669" />
              </linearGradient>

              <linearGradient id="aisleYellow" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stop-color="#fef08a" />
                <stop offset="100%" stop-color="#fde047" />
              </linearGradient>

              <linearGradient id="aislePink" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stop-color="#fecdd3" />
                <stop offset="100%" stop-color="#fca5a5" />
              </linearGradient>

              <linearGradient id="aisleCyan" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stop-color="#a5f3fc" />
                <stop offset="100%" stop-color="#38bdf8" />
              </linearGradient>

              <linearGradient id="aisleBlue" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stop-color="#bae6fd" />
                <stop offset="100%" stop-color="#60a5fa" />
              </linearGradient>

              {/* Animated Path Glow */}
              <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
                <feGaussianBlur stdDeviation="8" result="blur" />
                <feMerge>
                  <feMergeNode in="blur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
            </defs>

            {/* Background Store Floor */}
            <rect width="1000" height="1024" fill="#09090b" rx="24" />

            {/* Architectural Outline Walls (Black lines in the user plan) */}
            <g stroke="#3f3f46" strokeWidth="3" fill="none" opacity="0.6">
              {/* Top boundary */}
              <line x1="292" y1="12" x2="990" y2="12" />
              {/* Right boundary */}
              <line x1="965" y1="12" x2="965" y2="990" />
              {/* Left boundary */}
              <line x1="10" y1="265" x2="10" y2="760" />
              <line x1="10" y1="334" x2="380" y2="334" />
              {/* Center dividing wall */}
              <line x1="380" y1="50" x2="380" y2="325" />
              <line x1="560" y1="90" x2="560" y2="334" />
              {/* Bottom boundaries */}
              <line x1="482" y1="765" x2="482" y2="815" />
              <line x1="482" y1="765" x2="990" y2="765" />
            </g>

            {/* 1. L-Shaped Yaourts Mur Wall Fixtures */}
            <g id="yaourts-wall" opacity="0.95">
              {/* Vertical Top */}
              <rect
                x="23"
                y="476"
                width="29"
                height="237"
                rx="6"
                fill="url(#aislePink)"
                stroke="#18181b"
                strokeWidth="2"
              />
              {/* Horizontal bottom */}
              <rect
                x="26"
                y="719"
                width="201"
                height="20"
                rx="6"
                fill="url(#aislePink)"
                stroke="#18181b"
                strokeWidth="2"
              />
              {/* Vertical Bottom */}
              <rect
                x="230"
                y="720"
                width="40"
                height="241"
                rx="8"
                fill="url(#aislePink)"
                stroke="#18181b"
                strokeWidth="2"
              />
              <text
                x="37"
                y="595"
                fill="#18181b"
                fontSize="11"
                fontWeight="bold"
                textAnchor="middle"
                transform="rotate(-90, 37, 595)"
                className="pointer-events-none"
              >
                FRAIS YAOURTS
              </text>
              <text
                x="126"
                y="733"
                fill="#18181b"
                fontSize="10"
                fontWeight="bold"
                textAnchor="middle"
                className="pointer-events-none"
              >
                FRAIS YAOURTS
              </text>
              <text
                x="250"
                y="840"
                fill="#18181b"
                fontSize="11"
                fontWeight="bold"
                textAnchor="middle"
                transform="rotate(-90, 250, 840)"
                className="pointer-events-none"
              >
                FRAIS YAOURTS
              </text>
            </g>

            {/* 2. Entrance & Exit Doors */}
            <g id="entrance-exit">
              {/* Entrée Blue Button Box */}
              <rect
                x="286"
                y="996"
                width="221"
                height="25"
                rx="8"
                fill="url(#aisleBlue)"
                stroke="#18181b"
                strokeWidth="2"
              />
              <text
                x="396"
                y="1013"
                fill="#0f172a"
                fontSize="12"
                fontWeight="bold"
                textAnchor="middle"
                className="pointer-events-none"
              >
                ENTRÉE MAGASIN
              </text>

              {/* Caisses Pink Box */}
              <rect
                x="285"
                y="970"
                width="224"
                height="22"
                rx="6"
                fill="url(#aislePink)"
                stroke="#18181b"
                strokeWidth="2"
              />
              <text
                x="397"
                y="985"
                fill="#881337"
                fontSize="11"
                fontWeight="bold"
                textAnchor="middle"
                className="pointer-events-none"
              >
                CAISSE / SORTIE
              </text>

              {/* Second Entrée pill */}
              <rect
                x="513"
                y="967"
                width="57"
                height="24"
                rx="6"
                fill="url(#aisleBlue)"
                stroke="#18181b"
                strokeWidth="2"
              />
              <text
                x="541"
                y="983"
                fill="#0f172a"
                fontSize="10"
                fontWeight="bold"
                textAnchor="middle"
                className="pointer-events-none"
              >
                ENTRÉE
              </text>
            </g>

            {/* 3. Render all store aisles / shelves */}
            {STORE_AISLES.filter((a) => a.id !== 'caisses').map((aisle) => {
              const step = stepByAisleId.get(aisle.id);
              const hasItems = !!step && step.items.length > 0;
              const isAllCompleted = hasItems && step.allCompleted;
              const isSelected = selectedAisle?.id === aisle.id;
              const isCurrent = currentStep?.aisle.id === aisle.id;

              // Color gradient assignment
              let fillGradient = 'url(#aisleGreen)';
              if (aisle.colorType === 'yellow') fillGradient = 'url(#aisleYellow)';
              if (aisle.colorType === 'pink') fillGradient = 'url(#aislePink)';
              if (aisle.colorType === 'cyan') fillGradient = 'url(#aisleCyan)';
              if (aisle.colorType === 'orange') fillGradient = 'url(#aisleYellow)';

              if (hasItems && !isAllCompleted) {
                fillGradient = 'url(#aisleGreenActive)';
              }

              return (
                <g
                  key={aisle.id}
                  onClick={() => setSelectedAisleId(aisle.id)}
                  className="cursor-pointer transition-transform duration-150 active:scale-[0.985]"
                >
                  {/* Selected / Current Pulsing Ring */}
                  {isSelected && (
                    <rect
                      x={aisle.x - 6}
                      y={aisle.y - 6}
                      width={aisle.width + 12}
                      height={aisle.height + 12}
                      rx={(aisle.rx || 10) + 4}
                      fill="none"
                      stroke="#10b981"
                      strokeWidth="4"
                      className="animate-pulse"
                    />
                  )}

                  {/* Main Shelf Box */}
                  <rect
                    x={aisle.x}
                    y={aisle.y}
                    width={aisle.width}
                    height={aisle.height}
                    rx={aisle.rx || 10}
                    fill={fillGradient}
                    stroke={isSelected ? '#10b981' : '#18181b'}
                    strokeWidth={isSelected ? 3 : 2}
                    className="transition-all duration-200 hover:brightness-110"
                  />

                  {/* Shelf Label Text */}
                  <text
                    x={aisle.x + aisle.width / 2}
                    y={aisle.y + aisle.height / 2 + 4}
                    fill={hasItems && !isAllCompleted ? '#ffffff' : '#18181b'}
                    fontSize={aisle.height < 35 ? '10' : '11'}
                    fontWeight="bold"
                    textAnchor="middle"
                    className="pointer-events-none truncate select-none"
                  >
                    {aisle.shortLabel}
                  </text>

                  {/* Item Count & Route Step Badge */}
                  {hasItems && (
                    <g transform={`translate(${aisle.waypoint.x}, ${aisle.waypoint.y})`}>
                      {isAllCompleted ? (
                        <g>
                          <circle r="14" fill="#10b981" stroke="#09090b" strokeWidth="2.5" />
                          <path
                            d="M -5 0 L -1 4 L 6 -3"
                            fill="none"
                            stroke="#ffffff"
                            strokeWidth="2.5"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                        </g>
                      ) : (
                        <g>
                          {/* Pulsing ring for active step */}
                          {isCurrent && (
                            <circle
                              r="20"
                              fill="none"
                              stroke="#10b981"
                              strokeWidth="2"
                              opacity="0.8"
                              className="animate-ping"
                            />
                          )}
                          <circle
                            r="15"
                            fill="#09090b"
                            stroke={isCurrent ? '#34d399' : '#10b981'}
                            strokeWidth="3"
                          />
                          {/* Step number badge */}
                          <text
                            y="4"
                            fill="#34d399"
                            fontSize="11"
                            fontWeight="900"
                            textAnchor="middle"
                          >
                            {step.stepNumber}
                          </text>
                          {/* Pending items mini badge */}
                          <g transform="translate(12, -10)">
                            <circle r="8" fill="#ef4444" />
                            <text
                              y="3"
                              fill="#ffffff"
                              fontSize="9"
                              fontWeight="bold"
                              textAnchor="middle"
                            >
                              {step.items.filter((i) => !i.completed).length}
                            </text>
                          </g>
                        </g>
                      )}
                    </g>
                  )}
                </g>
              );
            })}

            {/* 4. Optimized Dynamic Route Path (Animated Dash Flow) */}
            {pathD && (
              <g pointerEvents="none">
                {/* Background Shadow / Glow for path */}
                <path
                  d={pathD}
                  fill="none"
                  stroke="#059669"
                  strokeWidth="8"
                  opacity="0.3"
                  filter="url(#glow)"
                />
                {/* Core Dashed Animated Route Line */}
                <path
                  d={pathD}
                  fill="none"
                  stroke="#34d399"
                  strokeWidth="4"
                  strokeDasharray="10 8"
                  strokeLinecap="round"
                  className="animate-route-flow"
                />
              </g>
            )}
          </svg>
        </div>
      </div>

      {/* Selected Aisle Drawer / Checklist Panel */}
      {selectedAisle && (
        <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-4 sm:p-5 shadow-2xl transition-all animate-in fade-in slide-in-from-bottom-2">
          <div className="flex items-center justify-between pb-3 border-b border-zinc-800/80">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center justify-center font-bold text-xs">
                {selectedStep ? `#${selectedStep.stepNumber}` : '📍'}
              </div>
              <div>
                <h4 className="text-sm font-bold text-white">{selectedAisle.name}</h4>
                <p className="text-[11px] text-zinc-400">
                  {selectedStep
                    ? `${selectedStep.items.length} article(s) à récupérer`
                    : 'Rayon vide (aucun article dans la liste)'}
                </p>
              </div>
            </div>

            <button
              onClick={() => setSelectedAisleId(null)}
              className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition"
              aria-label="Fermer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* List of items in this specific aisle */}
          {selectedStep && selectedStep.items.length > 0 ? (
            <div className="space-y-2 mt-3 max-h-60 overflow-y-auto pr-1">
              {selectedStep.items.map((item) => (
                <div
                  key={item.id}
                  onClick={() => onToggle(item.id)}
                  className={`flex items-center justify-between p-3 rounded-2xl border cursor-pointer transition-all duration-150 ${
                    item.completed
                      ? 'bg-zinc-950/40 border-zinc-900 text-zinc-500 opacity-60'
                      : 'bg-zinc-800/70 hover:bg-zinc-800 border-zinc-700/60 text-white shadow-sm'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className={`w-6 h-6 rounded-lg flex items-center justify-center border transition-all ${
                        item.completed
                          ? 'bg-emerald-500 border-emerald-500 text-zinc-950 shadow-sm'
                          : 'border-zinc-600 bg-zinc-900/60'
                      }`}
                    >
                      {item.completed && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                    </div>

                    <div className="truncate">
                      <span
                        className={`text-sm font-medium ${
                          item.completed ? 'line-through text-zinc-500' : 'text-zinc-100'
                        }`}
                      >
                        {item.name}
                      </span>
                      {item.quantity && (
                        <span className="ml-2 px-1.5 py-0.5 rounded text-[10px] bg-zinc-700/50 text-emerald-300 font-mono">
                          {item.quantity}
                        </span>
                      )}
                    </div>
                  </div>

                  {item.completed ? (
                    <span className="text-[10px] text-emerald-400 font-medium flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3" />
                      Pris
                    </span>
                  ) : (
                    <span className="text-[11px] text-zinc-400 font-medium">À prendre</span>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="py-4 text-center text-xs text-zinc-500">
              Aucun article à prendre dans ce rayon.
            </div>
          )}

          {/* Quick jump to next step button */}
          {selectedStep && (
            <div className="mt-3.5 pt-3 border-t border-zinc-800/80 flex items-center justify-between">
              <span className="text-[11px] text-zinc-500 flex items-center gap-1">
                <Sparkles className="w-3 h-3 text-emerald-400" />
                {selectedStep.allCompleted ? 'Rayon terminé !' : 'Cochez les articles au fur et à mesure'}
              </span>

              {routeSteps.length > 1 && (
                <button
                  type="button"
                  onClick={() => {
                    const currentIndex = routeSteps.findIndex((s) => s.aisle.id === selectedAisle.id);
                    const nextIndex = (currentIndex + 1) % routeSteps.length;
                    setSelectedAisleId(routeSteps[nextIndex].aisle.id);
                  }}
                  className="px-3 py-1.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-medium flex items-center gap-1 transition active:scale-95"
                >
                  <span>Rayon suivant</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
