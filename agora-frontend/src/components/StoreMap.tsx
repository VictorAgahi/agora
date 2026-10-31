import React, { useState, useMemo, useEffect, useRef } from 'react';
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
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Eye,
  EyeOff,
  Search,
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
  const [viewMode, setViewMode] = useState<'guided' | 'all'>('guided');
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [, setForceRender] = useState(0);

  // Zoom & ViewBox State (Base: 0 0 1000 1000)
  const [zoomLevel, setZoomLevel] = useState<number>(1);
  const [focusCenter, setFocusCenter] = useState<{ x: number; y: number }>({ x: 500, y: 500 });
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

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

    // Start at entrance (x: 600, y: 905)
    const points: { x: number; y: number }[] = [{ x: 600, y: 905 }];

    for (const s of routeSteps) {
      points.push(s.aisle.waypoint);
    }

    // End at checkouts (x: 310, y: 905)
    points.push({ x: 310, y: 905 });

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

  // Compute responsive dynamic SVG ViewBox
  const computedViewBox = useMemo(() => {
    if (zoomLevel <= 1) {
      return '0 0 1000 1000';
    }
    const baseW = 1000;
    const baseH = 1000;
    const w = baseW / zoomLevel;
    const h = baseH / zoomLevel;

    // Center around focusCenter and clamp within store boundary
    const x = Math.max(0, Math.min(baseW - w, focusCenter.x - w / 2));
    const y = Math.max(0, Math.min(baseH - h, focusCenter.y - h / 2));

    return `${x} ${y} ${w} ${h}`;
  }, [zoomLevel, focusCenter]);

  // Reset to 100% full view
  const handleResetView = () => {
    triggerHaptic(15);
    setZoomLevel(1);
    setFocusCenter({ x: 500, y: 500 });
  };

  // Zoom In
  const handleZoomIn = () => {
    triggerHaptic(15);
    setZoomLevel((z) => Math.min(2.4, +(z + 0.4).toFixed(2)));
  };

  // Zoom Out
  const handleZoomOut = () => {
    triggerHaptic(15);
    setZoomLevel((z) => {
      const next = Math.max(1, +(z - 0.4).toFixed(2));
      if (next === 1) setFocusCenter({ x: 500, y: 500 });
      return next;
    });
  };

  // Pan dragging handler for zoomed view
  const handlePointerDown = (e: React.PointerEvent) => {
    if (zoomLevel <= 1) return;
    setIsDragging(true);
    setDragStart({ x: e.clientX, y: e.clientY });
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDragging || zoomLevel <= 1) return;
    const rect = mapContainerRef.current?.getBoundingClientRect();
    const widthPx = rect?.width || 360;
    const scale = (1000 / widthPx) / zoomLevel;
    const dx = (e.clientX - dragStart.x) * scale;
    const dy = (e.clientY - dragStart.y) * scale;

    setDragStart({ x: e.clientX, y: e.clientY });
    setFocusCenter((c) => ({
      x: Math.max(100, Math.min(900, c.x - dx)),
      y: Math.max(100, Math.min(900, c.y - dy)),
    }));
  };

  const handlePointerUp = () => {
    setIsDragging(false);
  };

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

  // Filtered aisles based on search
  const searchedAisleIds = useMemo(() => {
    if (!searchQuery.trim()) return null;
    const q = searchQuery.toLowerCase().trim();
    const matches = new Set<string>();
    for (const a of STORE_AISLES) {
      if (
        a.name.toLowerCase().includes(q) ||
        a.shortLabel.toLowerCase().includes(q) ||
        a.category.toLowerCase().includes(q) ||
        a.keywords.some((k) => k.includes(q))
      ) {
        matches.add(a.id);
      }
    }
    return matches;
  }, [searchQuery]);

  return (
    <div className="space-y-3.5 select-none w-full max-w-full overflow-hidden">
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

      {/* Route Navigation Top Banner Card */}
      {totalSteps > 0 ? (
        <div className="bg-gradient-to-r from-emerald-950/50 via-zinc-900/90 to-zinc-900/60 border border-emerald-800/40 rounded-3xl p-3 sm:p-4 shadow-xl min-w-0 overflow-hidden">
          <div className="flex items-center justify-between gap-2.5 min-w-0">
            <div className="flex items-center gap-2.5 min-w-0 flex-1">
              <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-2xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center shrink-0 shadow-inner">
                <Navigation className="w-4 h-4 sm:w-5 sm:h-5 animate-pulse" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="text-[11px] sm:text-xs font-semibold text-emerald-400 uppercase tracking-wider">
                    Parcours Optimisé
                  </span>
                  <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-zinc-800 text-zinc-300 border border-zinc-700/60 font-mono">
                    {completedSteps}/{totalSteps}
                  </span>
                </div>
                <h3 className="text-xs sm:text-sm font-bold text-white mt-0.5 truncate">
                  {currentStep && !currentStep.allCompleted ? (
                    <span className="flex items-center gap-1 truncate">
                      <span className="text-zinc-400">Prochain :</span>
                      <span className="text-emerald-300 font-extrabold truncate">
                        {currentStep.aisle.emoji} {currentStep.aisle.shortLabel}
                      </span>
                    </span>
                  ) : (
                    <span className="text-emerald-300 truncate">Direction les caisses 🛒</span>
                  )}
                </h3>
              </div>
            </div>

            {/* Quick step action button */}
            <div className="shrink-0">
              <button
                type="button"
                onClick={() => {
                  if (currentStep) {
                    triggerHaptic(20);
                    setSelectedAisleId(currentStep.aisle.id);
                  }
                }}
                className="px-2.5 sm:px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold flex items-center gap-1 shadow-md shadow-emerald-700/30 active:scale-95 transition"
              >
                <span>Localiser</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Progress bar */}
          <div className="w-full bg-zinc-800/80 rounded-full h-1.5 mt-3 overflow-hidden">
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

      {/* Architect-Grade 2D Supermarket Canvas Card */}
      <div className="relative bg-zinc-950 border border-zinc-800/80 rounded-3xl overflow-hidden shadow-2xl w-full min-w-0">
        {/* Compact Responsive Header */}
        <div className="p-2.5 sm:p-3 bg-zinc-900/90 border-b border-zinc-800/80 backdrop-blur-md flex items-center justify-between gap-2 min-w-0">
          <div className="flex items-center gap-2 min-w-0">
            <div className="p-1 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 shrink-0">
              <MapPin className="w-3.5 h-3.5" />
            </div>
            <span className="text-xs font-bold text-zinc-100 truncate">Plan Supermarché 2D</span>
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-400 font-mono shrink-0 hidden xs:inline">
              Plan d’Architecte CAD
            </span>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            {/* Search Toggle */}
            <button
              type="button"
              onClick={() => {
                triggerHaptic(15);
                setSearchOpen((o) => !o);
              }}
              title="Chercher un rayon"
              className={`p-1.5 rounded-xl border text-xs transition ${
                searchOpen || searchQuery
                  ? 'bg-emerald-950/60 border-emerald-500/40 text-emerald-300'
                  : 'bg-zinc-800/80 border-zinc-700/60 text-zinc-300 hover:text-white'
              }`}
            >
              <Search className="w-3.5 h-3.5" />
            </button>

            {/* View Mode Toggle: Guided vs All */}
            <button
              type="button"
              onClick={() => {
                triggerHaptic(15);
                setViewMode((m) => (m === 'guided' ? 'all' : 'guided'));
              }}
              title={viewMode === 'guided' ? 'Afficher tous les rayons' : 'Afficher seulement mes rayons'}
              className={`px-2 py-1 sm:px-2.5 sm:py-1.5 rounded-xl text-xs font-medium border flex items-center gap-1 transition ${
                viewMode === 'guided'
                  ? 'bg-emerald-950/60 border-emerald-500/40 text-emerald-300'
                  : 'bg-zinc-800/80 border-zinc-700/60 text-zinc-300 hover:text-white'
              }`}
            >
              {viewMode === 'guided' ? (
                <>
                  <Eye className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-emerald-400" />
                  <span className="text-[11px] sm:text-xs">Mes rayons</span>
                </>
              ) : (
                <>
                  <EyeOff className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-zinc-400" />
                  <span className="text-[11px] sm:text-xs">Tous</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Expandable Search Input Bar */}
        {searchOpen && (
          <div className="p-2 bg-zinc-900 border-b border-zinc-800/80 flex items-center gap-2 animate-in fade-in slide-in-from-top-1 duration-150">
            <Search className="w-3.5 h-3.5 text-zinc-500 shrink-0 ml-1" />
            <input
              type="text"
              autoFocus
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Chercher boeuf, pâtes, yaourts, boulangerie..."
              className="flex-1 bg-zinc-950/80 border border-zinc-800 rounded-xl px-2.5 py-1 text-xs text-zinc-200 placeholder:text-zinc-500 focus:outline-none focus:border-emerald-500/50"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="p-1 text-zinc-400 hover:text-white"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        )}

        {/* 2D Architectural Canvas Container */}
        <div
          ref={mapContainerRef}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
          className={`relative w-full aspect-square bg-[#070a12] overflow-hidden select-none ${
            zoomLevel > 1 ? 'cursor-grab active:cursor-grabbing touch-none' : ''
          }`}
        >
          {/* Floating Map Controls Toolbar inside canvas */}
          <div className="absolute bottom-3 right-3 z-10 flex flex-col bg-zinc-900/90 backdrop-blur-md border border-zinc-700/80 rounded-2xl p-1 shadow-2xl space-y-1">
            <button
              type="button"
              onClick={handleZoomIn}
              disabled={zoomLevel >= 2.4}
              title="Zoomer"
              className="p-1.5 rounded-xl hover:bg-zinc-800 text-zinc-300 hover:text-white disabled:opacity-30 transition active:scale-95"
            >
              <ZoomIn className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={handleZoomOut}
              disabled={zoomLevel <= 1}
              title="Dézoomer"
              className="p-1.5 rounded-xl hover:bg-zinc-800 text-zinc-300 hover:text-white disabled:opacity-30 transition active:scale-95"
            >
              <ZoomOut className="w-4 h-4" />
            </button>
            {zoomLevel > 1 && (
              <button
                type="button"
                onClick={handleResetView}
                title="Vue complète"
                className="p-1.5 rounded-xl hover:bg-zinc-800 text-emerald-400 hover:text-white transition active:scale-95 border-t border-zinc-800"
              >
                <RotateCcw className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <svg
            viewBox={computedViewBox}
            className="w-full h-full block drop-shadow-2xl select-none"
            preserveAspectRatio="xMidYMid meet"
          >
            <defs>
              {/* Floor Architectural Grid Pattern */}
              <pattern id="storeTileGrid" width="25" height="25" patternUnits="userSpaceOnUse">
                <rect width="25" height="25" fill="#090d16" />
                <path d="M 25 0 L 0 0 0 25" fill="none" stroke="#131c2e" strokeWidth="0.75" />
              </pattern>

              {/* Department Ambient Lighting Glows */}
              <radialGradient id="glowPrimeur" cx="50%" cy="50%" r="50%">
                <stop offset="0%" stopColor="#10b981" stopOpacity="0.22" />
                <stop offset="100%" stopColor="#10b981" stopOpacity="0" />
              </radialGradient>

              <radialGradient id="glowBoulangerie" cx="50%" cy="50%" r="50%">
                <stop offset="0%" stopColor="#f59e0b" stopOpacity="0.20" />
                <stop offset="100%" stopColor="#f59e0b" stopOpacity="0" />
              </radialGradient>

              <radialGradient id="glowBoucherie" cx="50%" cy="50%" r="50%">
                <stop offset="0%" stopColor="#f43f5e" stopOpacity="0.22" />
                <stop offset="100%" stopColor="#f43f5e" stopOpacity="0" />
              </radialGradient>

              <radialGradient id="glowSurgeles" cx="50%" cy="50%" r="50%">
                <stop offset="0%" stopColor="#06b6d4" stopOpacity="0.28" />
                <stop offset="100%" stopColor="#06b6d4" stopOpacity="0" />
              </radialGradient>

              <radialGradient id="glowFrais" cx="50%" cy="50%" r="50%">
                <stop offset="0%" stopColor="#ec4899" stopOpacity="0.16" />
                <stop offset="100%" stopColor="#ec4899" stopOpacity="0" />
              </radialGradient>

              <radialGradient id="glowEpicerie" cx="50%" cy="50%" r="50%">
                <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.14" />
                <stop offset="100%" stopColor="#3b82f6" stopOpacity="0" />
              </radialGradient>

              {/* Retail Architecture Department Shelf Gradients */}
              <linearGradient id="shelfEmerald" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#34d399" />
                <stop offset="35%" stopColor="#059669" />
                <stop offset="100%" stopColor="#064e3b" />
              </linearGradient>

              <linearGradient id="shelfAmber" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#fbbf24" />
                <stop offset="35%" stopColor="#d97706" />
                <stop offset="100%" stopColor="#78350f" />
              </linearGradient>

              <linearGradient id="shelfRed" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#fb7185" />
                <stop offset="35%" stopColor="#e11d48" />
                <stop offset="100%" stopColor="#881337" />
              </linearGradient>

              <linearGradient id="shelfPink" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#f472b6" />
                <stop offset="35%" stopColor="#db2777" />
                <stop offset="100%" stopColor="#831843" />
              </linearGradient>

              <linearGradient id="shelfCyan" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#67e8f9" />
                <stop offset="35%" stopColor="#0891b2" />
                <stop offset="100%" stopColor="#164e63" />
              </linearGradient>

              <linearGradient id="shelfBlue" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#93c5fd" />
                <stop offset="35%" stopColor="#2563eb" />
                <stop offset="100%" stopColor="#1e3a8a" />
              </linearGradient>

              <linearGradient id="shelfPurple" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#c084fc" />
                <stop offset="35%" stopColor="#9333ea" />
                <stop offset="100%" stopColor="#581c87" />
              </linearGradient>

              <linearGradient id="shelfOrange" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#fdba74" />
                <stop offset="35%" stopColor="#ea580c" />
                <stop offset="100%" stopColor="#7c2d12" />
              </linearGradient>

              <linearGradient id="shelfYellow" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#fef08a" />
                <stop offset="35%" stopColor="#ca8a04" />
                <stop offset="100%" stopColor="#713f12" />
              </linearGradient>

              {/* Blueprint gradient for non-active aisles in guided mode */}
              <linearGradient id="shelfMuted" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#1e293b" />
                <stop offset="100%" stopColor="#0f172a" />
              </linearGradient>

              {/* Advanced Shelf Shadows */}
              <filter id="shelfShadow" x="-10%" y="-10%" width="120%" height="125%">
                <feDropShadow dx="0" dy="4" stdDeviation="3.5" floodColor="#000000" floodOpacity="0.6" />
              </filter>

              <filter id="cartGlow" x="-30%" y="-30%" width="160%" height="160%">
                <feGaussianBlur stdDeviation="8" result="blur" />
                <feMerge>
                  <feMergeNode in="blur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>

              <filter id="pathNeonGlow" x="-20%" y="-20%" width="140%" height="140%">
                <feGaussianBlur stdDeviation="7" result="blur" />
                <feMerge>
                  <feMergeNode in="blur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
            </defs>

            {/* 1. Base Architectural Floor with Fine Terrazzo Grid */}
            <rect width="1000" height="1000" fill="url(#storeTileGrid)" rx="20" />

            {/* 2. Department Ambient Lighting Radiance Underlay */}
            <circle cx="270" cy="625" r="160" fill="url(#glowPrimeur)" pointerEvents="none" />
            <circle cx="560" cy="735" r="140" fill="url(#glowBoulangerie)" pointerEvents="none" />
            <circle cx="555" cy="150" r="170" fill="url(#glowSurgeles)" pointerEvents="none" />
            <circle cx="540" cy="400" r="160" fill="url(#glowBoucherie)" pointerEvents="none" />
            <circle cx="250" cy="300" r="180" fill="url(#glowFrais)" pointerEvents="none" />
            <circle cx="830" cy="450" r="240" fill="url(#glowEpicerie)" pointerEvents="none" />

            {/* 3. Outer Master Architectural Wall Perimeter */}
            <rect
              x="30"
              y="30"
              width="940"
              height="930"
              rx="18"
              fill="none"
              stroke="#334155"
              strokeWidth="4"
              opacity="0.8"
            />

            {/* Internal Architectural Zone Dividers */}
            <g stroke="#1e293b" strokeWidth="2" strokeDasharray="6 6" fill="none" opacity="0.6">
              {/* Divider between grocery and fresh center */}
              <line x1="695" y1="40" x2="695" y2="850" />
              {/* Divider between entrance and north departments */}
              <line x1="40" y1="860" x2="960" y2="860" />
            </g>

            {/* 4. Architectural Floor Zone Typography */}
            <g
              fill="#334155"
              fontSize="11"
              fontWeight="900"
              letterSpacing="3"
              textAnchor="middle"
              className="pointer-events-none select-none opacity-40 font-mono"
            >
              <text x="270" y="740">HALL PRIMEURS</text>
              <text x="560" y="815">FOURNIL ARTISANAL</text>
              <text x="830" y="685">GRANDES ALLÉES ÉPICERIE</text>
              <text x="830" y="45">ESPACE SOIN & HYGIÈNE</text>
              <text x="555" y="45">PÔLE GRAND FROID</text>
              <text x="540" y="295">BOUCHERIE & VOLAILLES</text>
              <text x="270" y="265">CRÈMERIE & TRAITEUR</text>
            </g>

            {/* 5. Directional Circulation Floor Arrows */}
            <g fill="#334155" opacity="0.3" className="pointer-events-none font-bold text-center">
              <text x="680" y="590" fontSize="18">↑</text>
              <text x="680" y="380" fontSize="18">↑</text>
              <text x="415" y="275" fontSize="18">←</text>
              <text x="415" y="630" fontSize="18">↓</text>
            </g>

            {/* 6. Grand Mur Réfrigéré Yaourts (West Wall Architectural Fixture) */}
            {(() => {
              const aisle = STORE_AISLES.find((a) => a.id === 'yaourts')!;
              const step = stepByAisleId.get('yaourts');
              const hasItems = !!step && step.items.length > 0;
              const isSelected = selectedAisle?.id === 'yaourts';
              const isDimmed = viewMode === 'guided' && !hasItems;
              const isSearched = searchedAisleIds ? searchedAisleIds.has('yaourts') : false;

              return (
                <g
                  key="yaourts-wall"
                  onClick={() => {
                    triggerHaptic(20);
                    setSelectedAisleId('yaourts');
                  }}
                  className="cursor-pointer transition-all duration-200"
                  opacity={isDimmed ? 0.35 : 1}
                >
                  {(isSelected || isSearched) && (
                    <rect
                      x={aisle.x - 5}
                      y={aisle.y - 5}
                      width={aisle.width + 10}
                      height={aisle.height + 10}
                      rx={14}
                      fill="none"
                      stroke="#10b981"
                      strokeWidth="3.5"
                      className="animate-pulse"
                    />
                  )}
                  {/* Main Refrigerated Wall Body */}
                  <rect
                    x={aisle.x}
                    y={aisle.y}
                    width={aisle.width}
                    height={aisle.height}
                    rx={10}
                    fill={isDimmed ? 'url(#shelfMuted)' : 'url(#shelfPink)'}
                    stroke={isSelected ? '#10b981' : isDimmed ? '#1e293b' : aisle.accent}
                    strokeWidth={isSelected ? 2.5 : 1.5}
                    filter="url(#shelfShadow)"
                  />
                  {/* Glass Door Sections (6 door panels) */}
                  {[0, 1, 2, 3, 4, 5].map((idx) => {
                    const doorY = aisle.y + idx * (aisle.height / 6);
                    return (
                      <g key={idx} opacity={isDimmed ? 0.2 : 0.6} pointerEvents="none">
                        <line
                          x1={aisle.x + 4}
                          y1={doorY}
                          x2={aisle.x + aisle.width - 4}
                          y2={doorY}
                          stroke="#ffffff"
                          strokeWidth="1.5"
                        />
                        {/* Door handle */}
                        <line
                          x1={aisle.x + aisle.width - 6}
                          y1={doorY + 25}
                          x2={aisle.x + aisle.width - 6}
                          y2={doorY + 85}
                          stroke="#ffffff"
                          strokeWidth="2.5"
                          strokeLinecap="round"
                        />
                      </g>
                    );
                  })}
                  {/* Vertical Rotated Text */}
                  <text
                    x={aisle.x + aisle.width / 2}
                    y={aisle.y + aisle.height / 2}
                    fill="#ffffff"
                    fontSize="11"
                    fontWeight="900"
                    textAnchor="middle"
                    transform={`rotate(-90, ${aisle.x + aisle.width / 2}, ${aisle.y + aisle.height / 2})`}
                    className="pointer-events-none select-none drop-shadow tracking-wider"
                  >
                    🍓 GRAND MUR DES YAOURTS & CRÈMERIE
                  </text>

                  {/* Item Step Badge */}
                  {hasItems && (
                    <g transform={`translate(${aisle.waypoint.x}, ${aisle.waypoint.y})`}>
                      <circle r="14" fill="#090d16" stroke="#10b981" strokeWidth="2.5" />
                      <text y="4" fill="#34d399" fontSize="11" fontWeight="900" textAnchor="middle">
                        {step.stepNumber}
                      </text>
                    </g>
                  )}
                </g>
              );
            })()}

            {/* 7. South Entrance & Checkouts Section */}
            <g id="south-gate-and-checkouts">
              {/* Entrance Gate */}
              <rect
                x="510"
                y="880"
                width="180"
                height="48"
                rx="8"
                fill="url(#shelfBlue)"
                stroke="#1d4ed8"
                strokeWidth="1.5"
                filter="url(#shelfShadow)"
              />
              <text
                x="600"
                y="910"
                fill="#ffffff"
                fontSize="11"
                fontWeight="900"
                textAnchor="middle"
                className="pointer-events-none tracking-wider"
              >
                🚪 ENTRÉE PRINCIPALE
              </text>

              {/* Symmetrical Checkout Registers */}
              {(() => {
                const aisle = STORE_AISLES.find((a) => a.id === 'caisses')!;
                const isSelected = selectedAisle?.id === 'caisses';
                return (
                  <g
                    onClick={() => {
                      triggerHaptic(20);
                      setSelectedAisleId('caisses');
                    }}
                    className="cursor-pointer"
                  >
                    <rect
                      x={aisle.x}
                      y={aisle.y}
                      width={aisle.width}
                      height={aisle.height}
                      rx={8}
                      fill="#0f172a"
                      stroke={isSelected ? '#10b981' : '#334155'}
                      strokeWidth={isSelected ? 2.5 : 1.5}
                      filter="url(#shelfShadow)"
                    />
                    {/* 4 Checkout Counters */}
                    {[0, 1, 2, 3].map((idx) => {
                      const cx = aisle.x + 20 + idx * 75;
                      return (
                        <g key={idx} pointerEvents="none">
                          <rect x={cx} y={aisle.y + 8} width="55" height="32" rx="4" fill="#1e293b" />
                          <circle cx={cx + 10} cy={aisle.y + 24} r="3" fill="#22c55e" />
                          <line x1={cx + 20} y1={aisle.y + 14} x2={cx + 50} y2={aisle.y + 14} stroke="#334155" strokeWidth="1.5" />
                          <line x1={cx + 20} y1={aisle.y + 24} x2={cx + 50} y2={aisle.y + 24} stroke="#334155" strokeWidth="1.5" />
                          <line x1={cx + 20} y1={aisle.y + 34} x2={cx + 50} y2={aisle.y + 34} stroke="#334155" strokeWidth="1.5" />
                        </g>
                      );
                    })}
                    <text
                      x={aisle.x + aisle.width / 2}
                      y={aisle.y - 8}
                      fill="#f472b6"
                      fontSize="10"
                      fontWeight="900"
                      textAnchor="middle"
                      className="pointer-events-none drop-shadow"
                    >
                      💳 LIGNE DE CAISSES & SORTIE
                    </text>
                  </g>
                );
              })()}
            </g>

            {/* 8. Render All Symmetrically Aligned Store Gondolas */}
            {STORE_AISLES.filter((a) => a.id !== 'caisses' && a.id !== 'yaourts').map((aisle) => {
              const step = stepByAisleId.get(aisle.id);
              const hasItems = !!step && step.items.length > 0;
              const isAllCompleted = hasItems && step.allCompleted;
              const isSelected = selectedAisle?.id === aisle.id;
              const isCurrent = currentStep?.aisle.id === aisle.id;
              const isDimmed = viewMode === 'guided' && !hasItems;
              const isSearched = searchedAisleIds ? searchedAisleIds.has(aisle.id) : false;

              // Assign rich gradient based on aisle colorType
              let fillGradient = 'url(#shelfEmerald)';
              if (aisle.colorType === 'amber') fillGradient = 'url(#shelfAmber)';
              if (aisle.colorType === 'yellow') fillGradient = 'url(#shelfYellow)';
              if (aisle.colorType === 'red') fillGradient = 'url(#shelfRed)';
              if (aisle.colorType === 'pink') fillGradient = 'url(#shelfPink)';
              if (aisle.colorType === 'cyan') fillGradient = 'url(#shelfCyan)';
              if (aisle.colorType === 'blue') fillGradient = 'url(#shelfBlue)';
              if (aisle.colorType === 'purple') fillGradient = 'url(#shelfPurple)';
              if (aisle.colorType === 'orange') fillGradient = 'url(#shelfOrange)';
              if (isDimmed) fillGradient = 'url(#shelfMuted)';

              // Determine if this is a vertical aisle in the central section
              const isVerticalGondola = aisle.height > aisle.width;

              return (
                <g
                  key={aisle.id}
                  onClick={() => {
                    triggerHaptic(20);
                    setSelectedAisleId(aisle.id);
                  }}
                  className="cursor-pointer transition-all duration-200"
                  opacity={isDimmed ? 0.35 : 1}
                >
                  {/* Selection / Search / Current Step Pulsing Halo */}
                  {(isSelected || isSearched) && (
                    <rect
                      x={aisle.x - 5}
                      y={aisle.y - 5}
                      width={aisle.width + 10}
                      height={aisle.height + 10}
                      rx={(aisle.rx || 8) + 4}
                      fill="none"
                      stroke="#10b981"
                      strokeWidth="3.5"
                      className="animate-pulse"
                    />
                  )}

                  {/* Main Shelf Body */}
                  <rect
                    x={aisle.x}
                    y={aisle.y}
                    width={aisle.width}
                    height={aisle.height}
                    rx={aisle.rx || 8}
                    fill={fillGradient}
                    stroke={isSelected ? '#10b981' : isDimmed ? '#1e293b' : aisle.accent}
                    strokeWidth={isSelected ? 2.5 : 1.5}
                    filter="url(#shelfShadow)"
                    className="transition-all duration-200 hover:brightness-110"
                  />

                  {/* Shelf Top Bevel Highlight Line */}
                  <line
                    x1={aisle.x + (aisle.rx || 6)}
                    y1={aisle.y + 2}
                    x2={aisle.x + aisle.width - (aisle.rx || 6)}
                    y2={aisle.y + 2}
                    stroke="#ffffff"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    opacity={isDimmed ? 0.2 : 0.5}
                    pointerEvents="none"
                  />

                  {/* 1. Surgelés Architectural Freezer Bank */}
                  {aisle.id === 'surgeles' && !isDimmed && (
                    <g opacity="0.8" className="pointer-events-none">
                      {/* Center Service Divider */}
                      <line
                        x1={aisle.x + aisle.width / 2}
                        y1={aisle.y + 10}
                        x2={aisle.x + aisle.width / 2}
                        y2={aisle.y + aisle.height - 10}
                        stroke="#0e7490"
                        strokeWidth="3"
                      />
                      {/* Left & Right Glass Sliding Lids */}
                      <rect
                        x={aisle.x + 10}
                        y={aisle.y + 12}
                        width={aisle.width / 2 - 18}
                        height={aisle.height - 24}
                        rx="6"
                        fill="none"
                        stroke="#e0f2fe"
                        strokeWidth="1.5"
                        strokeDasharray="8 6"
                      />
                      <rect
                        x={aisle.x + aisle.width / 2 + 8}
                        y={aisle.y + 12}
                        width={aisle.width / 2 - 18}
                        height={aisle.height - 24}
                        rx="6"
                        fill="none"
                        stroke="#e0f2fe"
                        strokeWidth="1.5"
                        strokeDasharray="8 6"
                      />
                      <text x={aisle.x + aisle.width / 4} y={aisle.y + 40} fontSize="14" textAnchor="middle">
                        ❄️
                      </text>
                      <text x={aisle.x + (3 * aisle.width) / 4} y={aisle.y + 40} fontSize="14" textAnchor="middle">
                        🍦
                      </text>
                    </g>
                  )}

                  {/* 2. Fruits & Légumes 4-Quadrant Market Tables */}
                  {aisle.id === 'fruits-legumes' && !isDimmed && (
                    <g opacity="0.6" className="pointer-events-none">
                      {/* 4 Quadrants */}
                      <rect x={aisle.x + 8} y={aisle.y + 8} width={aisle.width / 2 - 12} height={aisle.height / 2 - 12} rx="6" fill="#064e3b" />
                      <rect x={aisle.x + aisle.width / 2 + 4} y={aisle.y + 8} width={aisle.width / 2 - 12} height={aisle.height / 2 - 12} rx="6" fill="#064e3b" />
                      <rect x={aisle.x + 8} y={aisle.y + aisle.height / 2 + 4} width={aisle.width / 2 - 12} height={aisle.height / 2 - 12} rx="6" fill="#064e3b" />
                      <rect x={aisle.x + aisle.width / 2 + 4} y={aisle.y + aisle.height / 2 + 4} width={aisle.width / 2 - 12} height={aisle.height / 2 - 12} rx="6" fill="#064e3b" />
                      <text x={aisle.x + 35} y={aisle.y + 45} fontSize="15">🍎</text>
                      <text x={aisle.x + aisle.width - 40} y={aisle.y + 45} fontSize="15">🥦</text>
                      <text x={aisle.x + 35} y={aisle.y + aisle.height - 35} fontSize="15">🥕</text>
                      <text x={aisle.x + aisle.width - 40} y={aisle.y + aisle.height - 35} fontSize="15">🥑</text>
                    </g>
                  )}

                  {/* 3. Boulangerie Wood Slats */}
                  {aisle.id === 'boulangerie-fraiche' && !isDimmed && (
                    <g opacity="0.45" className="pointer-events-none">
                      <line x1={aisle.x + 12} y1={aisle.y + 35} x2={aisle.x + aisle.width - 12} y2={aisle.y + 35} stroke="#78350f" strokeWidth="2" />
                      <line x1={aisle.x + 12} y1={aisle.y + aisle.height - 35} x2={aisle.x + aisle.width - 12} y2={aisle.y + aisle.height - 35} stroke="#78350f" strokeWidth="2" />
                      <text x={aisle.x + 30} y={aisle.y + 35} fontSize="14">🥖</text>
                      <text x={aisle.x + aisle.width - 30} y={aisle.y + 35} fontSize="14">🥐</text>
                    </g>
                  )}

                  {/* 4. Horizontal Gondola Divider End-Caps on East Wall */}
                  {aisle.width >= 200 && aisle.height <= 50 && !isDimmed && (
                    <g stroke="#ffffff" strokeWidth="1" opacity="0.3" pointerEvents="none">
                      <line x1={aisle.x + 50} y1={aisle.y + 4} x2={aisle.x + 50} y2={aisle.y + aisle.height - 4} />
                      <line x1={aisle.x + 120} y1={aisle.y + 4} x2={aisle.x + 120} y2={aisle.y + aisle.height - 4} />
                      <line x1={aisle.x + 190} y1={aisle.y + 4} x2={aisle.x + 190} y2={aisle.y + aisle.height - 4} />
                    </g>
                  )}

                  {/* Shelf Label & Emoji */}
                  {isVerticalGondola ? (
                    // Vertical Shelf Label
                    <g className="pointer-events-none select-none">
                      <text
                        x={aisle.x + aisle.width / 2}
                        y={aisle.y + 24}
                        fontSize="15"
                        textAnchor="middle"
                      >
                        {aisle.emoji}
                      </text>
                      <text
                        x={aisle.x + aisle.width / 2}
                        y={aisle.y + aisle.height / 2 + 10}
                        fill="#ffffff"
                        fontSize="9.5"
                        fontWeight="800"
                        textAnchor="middle"
                        transform={`rotate(-90, ${aisle.x + aisle.width / 2}, ${aisle.y + aisle.height / 2 + 10})`}
                        className="truncate drop-shadow tracking-tight"
                      >
                        {aisle.shortLabel}
                      </text>
                    </g>
                  ) : (
                    // Horizontal Shelf Label
                    <text
                      x={aisle.x + aisle.width / 2}
                      y={aisle.y + aisle.height / 2 + 4}
                      fill="#ffffff"
                      fontSize={aisle.height < 36 ? '9.5' : '10.5'}
                      fontWeight="800"
                      textAnchor="middle"
                      className="pointer-events-none truncate select-none drop-shadow"
                    >
                      {aisle.emoji} {aisle.shortLabel}
                    </text>
                  )}

                  {/* Item Step Badge */}
                  {hasItems && (
                    <g transform={`translate(${aisle.waypoint.x}, ${aisle.waypoint.y})`}>
                      {isAllCompleted ? (
                        <g>
                          <circle r="14" fill="#10b981" stroke="#090d16" strokeWidth="2.5" />
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
                              strokeWidth="2.5"
                              opacity="0.8"
                              className="animate-ping"
                            />
                          )}
                          <circle
                            r="15"
                            fill="#090d16"
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
                          {/* Pending items count badge */}
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

            {/* 9. Animated Glowing Shopper Trajectory & Caddie */}
            {pathD && (
              <g pointerEvents="none">
                {/* Background Neon Glow */}
                <path
                  d={pathD}
                  fill="none"
                  stroke="#059669"
                  strokeWidth="8"
                  opacity="0.35"
                  filter="url(#pathNeonGlow)"
                />
                {/* Core Animated Dash Line */}
                <path
                  d={pathD}
                  fill="none"
                  stroke="#34d399"
                  strokeWidth="4"
                  strokeDasharray="12 10"
                  strokeLinecap="round"
                  className="animate-route-flow"
                />

                {/* Animated Shopping Cart (Caddie) at Current Active Step */}
                {currentStep && (
                  <g
                    transform={`translate(${currentStep.aisle.waypoint.x}, ${currentStep.aisle.waypoint.y - 28})`}
                    className="animate-bounce"
                    filter="url(#cartGlow)"
                  >
                    <rect
                      x="-15"
                      y="-15"
                      width="30"
                      height="30"
                      rx="10"
                      fill="#10b981"
                      stroke="#ffffff"
                      strokeWidth="2"
                    />
                    <text x="0" y="5" fontSize="16" textAnchor="middle">
                      🛒
                    </text>
                  </g>
                )}
              </g>
            )}
          </svg>
        </div>
      </div>

      {/* Selected Aisle Drawer / Checklist Panel */}
      {selectedAisle && (
        <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-3.5 sm:p-5 shadow-2xl transition-all animate-in fade-in slide-in-from-bottom-2 w-full max-w-full overflow-hidden">
          <div className="flex items-center justify-between pb-3 border-b border-zinc-800/80 gap-2 min-w-0">
            <div className="flex items-center gap-2.5 min-w-0 flex-1">
              <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center justify-center font-bold text-lg shadow-inner shrink-0">
                {selectedAisle.emoji}
              </div>
              <div className="min-w-0 flex-1">
                <h4 className="text-sm font-bold text-white flex items-center gap-1.5 truncate">
                  <span className="truncate">{selectedAisle.name}</span>
                  {selectedStep && (
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-zinc-800 text-emerald-400 border border-zinc-700/60 font-mono shrink-0">
                      #{selectedStep.stepNumber}
                    </span>
                  )}
                </h4>
                <p className="text-[11px] text-zinc-400 truncate">
                  {selectedStep
                    ? `${selectedStep.items.length} article(s) à récupérer`
                    : 'Rayon vide (aucun article dans la liste)'}
                </p>
              </div>
            </div>

            <button
              onClick={() => setSelectedAisleId(null)}
              className="p-1.5 rounded-xl text-zinc-400 hover:text-white hover:bg-zinc-800 transition shrink-0"
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
                  className={`flex items-center justify-between p-2.5 sm:p-3 rounded-2xl border transition-all duration-150 gap-2 min-w-0 ${
                    item.completed
                      ? 'bg-zinc-950/40 border-zinc-900 text-zinc-500 opacity-60'
                      : 'bg-zinc-800/70 hover:bg-zinc-800 border-zinc-700/60 text-white shadow-sm'
                  }`}
                >
                  <div
                    onClick={() => onToggle(item.id)}
                    className="flex items-center gap-2.5 min-w-0 flex-1 cursor-pointer"
                  >
                    <div
                      className={`w-5 h-5 sm:w-6 sm:h-6 rounded-lg flex items-center justify-center border transition-all shrink-0 ${
                        item.completed
                          ? 'bg-emerald-500 border-emerald-500 text-zinc-950 shadow-sm'
                          : 'border-zinc-600 bg-zinc-900/60'
                      }`}
                    >
                      {item.completed && <Check className="w-3 h-3 sm:w-3.5 sm:h-3.5 stroke-[3]" />}
                    </div>

                    <div className="truncate flex-1 min-w-0">
                      <span
                        className={`text-xs sm:text-sm font-medium truncate block ${
                          item.completed ? 'line-through text-zinc-500' : 'text-zinc-100'
                        }`}
                      >
                        {item.name}
                      </span>
                    </div>

                    {item.quantity && (
                      <span className="px-1.5 py-0.5 rounded text-[10px] bg-zinc-700/50 text-emerald-300 font-mono shrink-0">
                        {item.quantity}
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    {/* Auto-learning reassign button */}
                    <button
                      type="button"
                      onClick={() => setReassigningItem(item)}
                      title="Mauvais rayon ? Corriger et mémoriser pour toujours"
                      className="px-2 py-1 rounded-lg bg-zinc-900/80 hover:bg-zinc-700 text-zinc-400 hover:text-zinc-200 border border-zinc-700/50 text-[10px] font-medium flex items-center gap-1 transition active:scale-95"
                    >
                      <MoveRight className="w-3 h-3 text-emerald-400" />
                      <span className="hidden xs:inline">Déplacer</span>
                    </button>

                    {item.completed ? (
                      <span className="text-[10px] text-emerald-400 font-medium flex items-center gap-0.5">
                        <CheckCircle2 className="w-3 h-3" />
                        <span className="hidden xs:inline">Pris</span>
                      </span>
                    ) : (
                      <span className="text-[10px] sm:text-[11px] text-zinc-400 font-medium">À prendre</span>
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
            <div className="mt-3 pt-3 border-t border-zinc-800/80 flex items-center justify-between gap-2 min-w-0">
              <span className="text-[11px] text-zinc-500 flex items-center gap-1 truncate">
                <Sparkles className="w-3 h-3 text-emerald-400 shrink-0" />
                <span className="truncate">{selectedStep.allCompleted ? 'Rayon terminé !' : 'Cochez au fur et à mesure'}</span>
              </span>

              {routeSteps.length > 1 && (
                <button
                  type="button"
                  onClick={() => {
                    const currentIndex = routeSteps.findIndex((s) => s.aisle.id === selectedAisle.id);
                    const nextIndex = (currentIndex + 1) % routeSteps.length;
                    setSelectedAisleId(routeSteps[nextIndex].aisle.id);
                  }}
                  className="px-3 py-1.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-medium flex items-center gap-1 transition active:scale-95 shrink-0"
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
