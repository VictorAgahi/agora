import React, { useState, useMemo, useEffect } from 'react';
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
  Compass,
  MoveRight,
} from 'lucide-react';
import { Item } from '../types';
import {
  STORE_AISLES,
  StoreAisle,
  computeOptimizedRoute,
  OptimizedRouteStep,
  learnItemAisle,
} from '../utils/storeMapData';
import { triggerHaptic, playPopSound } from '../utils/feedback';

interface StoreMapProps {
  items: Item[];
  onToggle: (id: number) => void;
  onDelete?: (id: number) => void;
}

export const StoreMap: React.FC<StoreMapProps> = ({ items, onToggle }) => {
  const [selectedAisleId, setSelectedAisleId] = useState<string | null>(null);
  const [reassigningItem, setReassigningItem] = useState<Item | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [, setForceRender] = useState(0);

  // Listen to learned aisle updates to re-render in real time
  useEffect(() => {
    const handleLearned = () => setForceRender((n) => n + 1);
    window.addEventListener('agora:aisle_learned', handleLearned);
    return () => window.removeEventListener('agora:aisle_learned', handleLearned);
  }, []);

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

  // Handle reassigning an item to another aisle (Self-improving AI learning)
  const handleSelectNewAisle = async (targetAisle: StoreAisle) => {
    if (!reassigningItem) return;

    triggerHaptic(30);
    playPopSound('check');

    const itemName = reassigningItem.name;
    await learnItemAisle(itemName, targetAisle.id);

    setReassigningItem(null);
    setSelectedAisleId(targetAisle.id);
    setToastMessage(`Appris ! "${itemName}" sera toujours placé à "${targetAisle.name}" 🎯`);

    setTimeout(() => {
      setToastMessage(null);
    }, 4500);
  };

  return (
    <div className="space-y-4 select-none">
      {/* Toast notification for learned changes */}
      {toastMessage && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 max-w-sm w-[90%] p-3.5 bg-emerald-950/95 border border-emerald-500/50 rounded-2xl shadow-2xl text-emerald-200 text-xs flex items-center gap-2.5 animate-in fade-in slide-in-from-bottom-4">
          <Sparkles className="w-4 h-4 text-emerald-400 shrink-0 animate-spin" />
          <span className="flex-1 font-medium">{toastMessage}</span>
          <button onClick={() => setToastMessage(null)} className="text-emerald-400 hover:text-white">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

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
                      <span className="text-emerald-300 font-extrabold flex items-center gap-1">
                        <span>{currentStep.aisle.emoji}</span>
                        <span>{currentStep.aisle.shortLabel}</span>
                      </span>
                    </>
                  ) : (
                    <span className="text-emerald-300">Tout est dans le panier ! Direction les caisses 🛒</span>
                  )}
                </h3>
              </div>
            </div>

            {/* Step selector shortcut */}
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

      {/* Interactive 2D Supermarket Canvas (1000x1024) */}
      <div className="relative bg-zinc-950 border border-zinc-800/80 rounded-3xl overflow-hidden shadow-2xl p-2 sm:p-3">
        <div className="flex items-center justify-between px-2 py-1 text-[11px] text-zinc-400">
          <div className="flex items-center gap-1.5">
            <MapPin className="w-3.5 h-3.5 text-emerald-400" />
            <span className="font-semibold text-zinc-300">Plan Supermarché 2D</span>
          </div>
          <span className="text-[10px] text-zinc-500 flex items-center gap-1">
            <span>💡 Touchez un rayon pour inspecter</span>
          </span>
        </div>

        <div className="relative w-full aspect-[1000/1024] max-h-[70vh] flex items-center justify-center">
          <svg
            viewBox="0 0 1000 1024"
            className="w-full h-full drop-shadow-md"
            preserveAspectRatio="xMidYMid meet"
          >
            <defs>
              {/* Floor Pattern */}
              <pattern id="floorTile" width="40" height="40" patternUnits="userSpaceOnUse">
                <rect width="40" height="40" fill="#09090b" />
                <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#18181b" strokeWidth="1" />
              </pattern>

              {/* Shelf Color Gradients */}
              <linearGradient id="aisleGreen" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stop-color="#34d399" />
                <stop offset="100%" stop-color="#059669" />
              </linearGradient>

              <linearGradient id="aisleWood" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stop-color="#fde047" />
                <stop offset="100%" stop-color="#ca8a04" />
              </linearGradient>

              <linearGradient id="aislePink" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stop-color="#f472b6" />
                <stop offset="100%" stop-color="#db2777" />
              </linearGradient>

              <linearGradient id="aisleFreezer" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stop-color="#67e8f9" />
                <stop offset="100%" stop-color="#0284c7" />
              </linearGradient>

              <linearGradient id="aisleBlue" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stop-color="#60a5fa" />
                <stop offset="100%" stop-color="#2563eb" />
              </linearGradient>

              <linearGradient id="aisleOrange" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stop-color="#fb923c" />
                <stop offset="100%" stop-color="#ea580c" />
              </linearGradient>

              {/* Shelf Drop Shadows */}
              <filter id="shelfShadow" x="-5%" y="-5%" width="115%" height="115%">
                <feDropShadow dx="0" dy="3" stdDeviation="3" floodColor="#000000" floodOpacity="0.5" />
              </filter>

              {/* Animated Path Glow */}
              <filter id="pathGlow" x="-20%" y="-20%" width="140%" height="140%">
                <feGaussianBlur stdDeviation="6" result="blur" />
                <feMerge>
                  <feMergeNode in="blur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
            </defs>

            {/* Background Floor with Subtle Grid */}
            <rect width="1000" height="1024" fill="url(#floorTile)" rx="24" />

            {/* Architectural Outline Walls */}
            <g stroke="#27272a" strokeWidth="4" fill="none">
              <line x1="292" y1="12" x2="965" y2="12" />
              <line x1="965" y1="12" x2="965" y2="990" />
              <line x1="10" y1="265" x2="10" y2="760" />
              <line x1="10" y1="334" x2="380" y2="334" />
              <line x1="380" y1="50" x2="380" y2="325" />
              <line x1="560" y1="90" x2="560" y2="334" />
              <line x1="482" y1="765" x2="482" y2="815" />
              <line x1="482" y1="765" x2="965" y2="765" />
            </g>

            {/* Floor Direction Arrows (Sens de circulation) */}
            <g fill="#27272a" opacity="0.4" className="pointer-events-none">
              <text x="610" y="680" fontSize="16" fontWeight="bold">↑</text>
              <text x="610" y="470" fontSize="16" fontWeight="bold">↑</text>
              <text x="610" y="270" fontSize="16" fontWeight="bold">↑</text>
              <text x="430" y="380" fontSize="16" fontWeight="bold">←</text>
              <text x="320" y="680" fontSize="16" fontWeight="bold">↓</text>
            </g>

            {/* 1. L-Shaped Yaourts Mur Wall Fixtures */}
            <g
              id="yaourts-wall"
              className="cursor-pointer"
              onClick={() => setSelectedAisleId('yaourts')}
            >
              {/* Vertical Top */}
              <rect
                x="23"
                y="476"
                width="29"
                height="237"
                rx="8"
                fill="url(#aislePink)"
                stroke="#18181b"
                strokeWidth="2"
                filter="url(#shelfShadow)"
              />
              {/* Horizontal Bottom */}
              <rect
                x="26"
                y="719"
                width="201"
                height="20"
                rx="6"
                fill="url(#aislePink)"
                stroke="#18181b"
                strokeWidth="2"
                filter="url(#shelfShadow)"
              />
              {/* Vertical Bottom */}
              <rect
                x="230"
                y="720"
                width="40"
                height="241"
                rx="10"
                fill="url(#aislePink)"
                stroke="#18181b"
                strokeWidth="2"
                filter="url(#shelfShadow)"
              />

              {/* Mur yaourts decor & labels */}
              <text
                x="37"
                y="595"
                fill="#ffffff"
                fontSize="11"
                fontWeight="900"
                textAnchor="middle"
                transform="rotate(-90, 37, 595)"
                className="pointer-events-none"
              >
                🍓 FRAIS & YAOURTS
              </text>
              <text
                x="126"
                y="733"
                fill="#ffffff"
                fontSize="10"
                fontWeight="bold"
                textAnchor="middle"
                className="pointer-events-none"
              >
                🥛 LAIT & CRÈMES DESSERT
              </text>
              <text
                x="250"
                y="840"
                fill="#ffffff"
                fontSize="11"
                fontWeight="900"
                textAnchor="middle"
                transform="rotate(-90, 250, 840)"
                className="pointer-events-none"
              >
                🧈 BEURRE & FRAIS
              </text>
            </g>

            {/* 2. Entrance & Exit Doors with Turnstiles */}
            <g id="entrance-exit">
              {/* Entrance Blue Box */}
              <rect
                x="286"
                y="996"
                width="221"
                height="25"
                rx="8"
                fill="url(#aisleBlue)"
                stroke="#1e3a8a"
                strokeWidth="2"
              />
              <text
                x="396"
                y="1013"
                fill="#ffffff"
                fontSize="11"
                fontWeight="bold"
                textAnchor="middle"
                className="pointer-events-none"
              >
                🚪 ENTRÉE DU MAGASIN
              </text>

              {/* Caisses Conveyor & Checkout Belts */}
              <rect
                x="285"
                y="970"
                width="224"
                height="22"
                rx="6"
                fill="#18181b"
                stroke="#3f3f46"
                strokeWidth="2"
              />
              {/* Conveyor belt lines */}
              <line x1="310" y1="970" x2="310" y2="992" stroke="#27272a" strokeWidth="2" />
              <line x1="360" y1="970" x2="360" y2="992" stroke="#27272a" strokeWidth="2" />
              <line x1="420" y1="970" x2="420" y2="992" stroke="#27272a" strokeWidth="2" />
              <line x1="470" y1="970" x2="470" y2="992" stroke="#27272a" strokeWidth="2" />
              <text
                x="397"
                y="985"
                fill="#f472b6"
                fontSize="10"
                fontWeight="bold"
                textAnchor="middle"
                className="pointer-events-none"
              >
                💳 CAISSES & SORTIE
              </text>

              {/* Second Entrée pill */}
              <rect
                x="513"
                y="967"
                width="57"
                height="24"
                rx="6"
                fill="url(#aisleBlue)"
                stroke="#1e3a8a"
                strokeWidth="1.5"
              />
              <text
                x="541"
                y="983"
                fill="#ffffff"
                fontSize="9"
                fontWeight="bold"
                textAnchor="middle"
                className="pointer-events-none"
              >
                ENTRÉE 2
              </text>
            </g>

            {/* 3. Render all store aisles / shelves */}
            {STORE_AISLES.filter((a) => a.id !== 'caisses' && a.id !== 'yaourts').map((aisle) => {
              const step = stepByAisleId.get(aisle.id);
              const hasItems = !!step && step.items.length > 0;
              const isAllCompleted = hasItems && step.allCompleted;
              const isSelected = selectedAisle?.id === aisle.id;
              const isCurrent = currentStep?.aisle.id === aisle.id;

              // Color gradient assignment
              let fillGradient = 'url(#aisleGreen)';
              if (aisle.colorType === 'yellow') fillGradient = 'url(#aisleWood)';
              if (aisle.colorType === 'pink') fillGradient = 'url(#aislePink)';
              if (aisle.colorType === 'cyan') fillGradient = 'url(#aisleFreezer)';
              if (aisle.colorType === 'orange') fillGradient = 'url(#aisleOrange)';

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
                      strokeWidth="3.5"
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
                    strokeWidth={isSelected ? 2.5 : 1.5}
                    filter="url(#shelfShadow)"
                    className="transition-all duration-200 hover:brightness-110"
                  />

                  {/* Visual Props & Shelf Texture Overlays */}
                  {aisle.id === 'surgeles' && (
                    // Frost crystals overlay on freezer
                    <g opacity="0.6" className="pointer-events-none">
                      <line x1={aisle.x + 8} y1={aisle.y + 10} x2={aisle.x + aisle.width - 8} y2={aisle.y + 10} stroke="#ffffff" strokeWidth="2" strokeDasharray="6 4" />
                      <line x1={aisle.x + 8} y1={aisle.y + aisle.height - 10} x2={aisle.x + aisle.width - 8} y2={aisle.y + aisle.height - 10} stroke="#ffffff" strokeWidth="2" strokeDasharray="6 4" />
                      <text x={aisle.x + aisle.width / 2} y={aisle.y + 35} fontSize="14" textAnchor="middle">❄️</text>
                      <text x={aisle.x + aisle.width / 2} y={aisle.y + aisle.height - 20} fontSize="14" textAnchor="middle">🍦</text>
                    </g>
                  )}

                  {aisle.id === 'fruits-legumes' && (
                    // Crate texture for fruits & vegetables
                    <g opacity="0.4" className="pointer-events-none">
                      <rect x={aisle.x + 8} y={aisle.y + 8} width={aisle.width - 16} height={aisle.height - 16} rx="8" fill="none" stroke="#064e3b" strokeWidth="2" strokeDasharray="8 6" />
                      <text x={aisle.x + 22} y={aisle.y + 30} fontSize="14">🍎</text>
                      <text x={aisle.x + aisle.width - 24} y={aisle.y + 30} fontSize="14">🥦</text>
                      <text x={aisle.x + 22} y={aisle.y + aisle.height - 16} fontSize="14">🥕</text>
                      <text x={aisle.x + aisle.width - 24} y={aisle.y + aisle.height - 16} fontSize="14">🍌</text>
                    </g>
                  )}

                  {aisle.id === 'boulangerie-fraiche' && (
                    // Wood slats for bakery
                    <g opacity="0.4" className="pointer-events-none">
                      <line x1={aisle.x + 10} y1={aisle.y + 25} x2={aisle.x + aisle.width - 10} y2={aisle.y + 25} stroke="#78350f" strokeWidth="2" />
                      <line x1={aisle.x + 10} y1={aisle.y + aisle.height - 25} x2={aisle.x + aisle.width - 10} y2={aisle.y + aisle.height - 25} stroke="#78350f" strokeWidth="2" />
                      <text x={aisle.x + 20} y={aisle.y + 28} fontSize="13">🥖</text>
                      <text x={aisle.x + aisle.width - 20} y={aisle.y + 28} fontSize="13">🥐</text>
                    </g>
                  )}

                  {/* Shelf Label & Emoji */}
                  <text
                    x={aisle.x + aisle.width / 2}
                    y={aisle.y + aisle.height / 2 + 4}
                    fill="#ffffff"
                    fontSize={aisle.height < 32 ? '9.5' : '10.5'}
                    fontWeight="800"
                    textAnchor="middle"
                    className="pointer-events-none truncate select-none drop-shadow"
                  >
                    {aisle.emoji} {aisle.shortLabel}
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
                  filter="url(#pathGlow)"
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

                {/* Animated Shopping Cart Icon (Caddie) at Current Step */}
                {currentStep && (
                  <g
                    transform={`translate(${currentStep.aisle.waypoint.x}, ${currentStep.aisle.waypoint.y - 28})`}
                    className="animate-bounce"
                  >
                    <rect x="-14" y="-14" width="28" height="28" rx="8" fill="#10b981" stroke="#ffffff" strokeWidth="2" />
                    <text x="0" y="5" fontSize="15" textAnchor="middle">🛒</text>
                  </g>
                )}
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
              <div className="w-9 h-9 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center justify-center font-bold text-sm shadow-inner">
                {selectedAisle.emoji}
              </div>
              <div>
                <h4 className="text-sm font-bold text-white flex items-center gap-1.5">
                  <span>{selectedAisle.name}</span>
                  {selectedStep && (
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-zinc-800 text-emerald-400 border border-zinc-700/60 font-mono">
                      Étape #{selectedStep.stepNumber}
                    </span>
                  )}
                </h4>
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
            <div className="space-y-2.5 mt-3 max-h-64 overflow-y-auto pr-1">
              {selectedStep.items.map((item) => (
                <div
                  key={item.id}
                  className={`flex items-center justify-between p-3 rounded-2xl border transition-all duration-150 ${
                    item.completed
                      ? 'bg-zinc-950/40 border-zinc-900 text-zinc-500 opacity-60'
                      : 'bg-zinc-800/70 hover:bg-zinc-800 border-zinc-700/60 text-white shadow-sm'
                  }`}
                >
                  <div
                    onClick={() => onToggle(item.id)}
                    className="flex items-center gap-3 min-w-0 flex-1 cursor-pointer"
                  >
                    <div
                      className={`w-6 h-6 rounded-lg flex items-center justify-center border transition-all ${
                        item.completed
                          ? 'bg-emerald-500 border-emerald-500 text-zinc-950 shadow-sm'
                          : 'border-zinc-600 bg-zinc-900/60'
                      }`}
                    >
                      {item.completed && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                    </div>

                    <div className="truncate flex-1">
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

                  <div className="flex items-center gap-2 shrink-0">
                    {/* Auto-learning reassign button */}
                    <button
                      type="button"
                      onClick={() => setReassigningItem(item)}
                      title="Mauvais rayon ? Changer l'emplacement pour toujours"
                      className="px-2 py-1 rounded-lg bg-zinc-900/80 hover:bg-zinc-700 text-zinc-400 hover:text-zinc-200 border border-zinc-700/50 text-[10px] font-medium flex items-center gap-1 transition active:scale-95"
                    >
                      <MoveRight className="w-3 h-3 text-emerald-400" />
                      <span>Déplacer</span>
                    </button>

                    {item.completed ? (
                      <span className="text-[10px] text-emerald-400 font-medium flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3" />
                        Pris
                      </span>
                    ) : (
                      <span className="text-[11px] text-zinc-400 font-medium">À prendre</span>
                    )}
                  </div>
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
                {selectedStep.allCompleted ? 'Rayon terminé !' : 'Cochez au fur et à mesure'}
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

      {/* Modal: Self-Improving Reassign Aisle Picker */}
      {reassigningItem && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-end sm:items-center justify-center p-3 animate-in fade-in duration-200">
          <div className="bg-zinc-900 border border-zinc-700/80 rounded-3xl max-w-lg w-full max-h-[85vh] overflow-hidden flex flex-col shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="p-4 border-b border-zinc-800 flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-emerald-400 uppercase tracking-wider flex items-center gap-1">
                    <Compass className="w-3.5 h-3.5" />
                    Apprentissage automatique
                  </span>
                </div>
                <h3 className="text-sm font-bold text-white mt-0.5">
                  Où se trouve "{reassigningItem.name}" dans ton magasin ?
                </h3>
                <p className="text-[11px] text-zinc-400">
                  Agora s'en souviendra pour toujours (sur ton écran et pour Hermes).
                </p>
              </div>
              <button
                onClick={() => setReassigningItem(null)}
                className="p-1.5 rounded-xl text-zinc-400 hover:text-white hover:bg-zinc-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Aisle Selection Grid */}
            <div className="p-3 overflow-y-auto grid grid-cols-1 sm:grid-cols-2 gap-2 flex-1">
              {STORE_AISLES.filter((a) => a.id !== 'caisses').map((aisle) => (
                <button
                  key={aisle.id}
                  onClick={() => handleSelectNewAisle(aisle)}
                  className="flex items-center gap-3 p-3 rounded-2xl bg-zinc-800/60 hover:bg-emerald-950/40 hover:border-emerald-500/50 border border-zinc-700/50 text-left transition group active:scale-[0.98]"
                >
                  <span className="text-2xl p-2 rounded-xl bg-zinc-900/80 border border-zinc-700/40 shrink-0 group-hover:scale-110 transition-transform">
                    {aisle.emoji}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="text-xs font-bold text-zinc-100 group-hover:text-emerald-300 truncate">
                      {aisle.name}
                    </div>
                    <div className="text-[10px] text-zinc-400 truncate">
                      Rayon #{aisle.rank} • {aisle.category}
                    </div>
                  </div>
                </button>
              ))}
            </div>

            <div className="p-3 bg-zinc-950/60 border-t border-zinc-800 text-center text-[11px] text-zinc-500">
              💡 Le choix sera sauvegardé instantanément dans la base de données.
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
