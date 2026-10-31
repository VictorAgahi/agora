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

  // Zoom & ViewBox State (Base: 0 0 1000 1024)
  const [zoomLevel, setZoomLevel] = useState<number>(1);
  const [focusCenter, setFocusCenter] = useState<{ x: number; y: number }>({ x: 500, y: 512 });
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

  // Compute responsive dynamic SVG ViewBox
  const computedViewBox = useMemo(() => {
    if (zoomLevel <= 1) {
      return '0 0 1000 1024';
    }
    const baseW = 1000;
    const baseH = 1024;
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
    setFocusCenter({ x: 500, y: 512 });
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
      if (next === 1) setFocusCenter({ x: 500, y: 512 });
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
      y: Math.max(100, Math.min(924, c.y - dy)),
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

      {/* Route Navigation Top Banner Card - 100% Mobile Safe */}
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

      {/* Interactive 2D Supermarket Canvas Card */}
      <div className="relative bg-zinc-950 border border-zinc-800/80 rounded-3xl overflow-hidden shadow-2xl w-full min-w-0">
        {/* Compact Responsive Header */}
        <div className="p-2.5 sm:p-3 bg-zinc-900/90 border-b border-zinc-800/80 backdrop-blur-md flex items-center justify-between gap-2 min-w-0">
          <div className="flex items-center gap-2 min-w-0">
            <div className="p-1 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 shrink-0">
              <MapPin className="w-3.5 h-3.5" />
            </div>
            <span className="text-xs font-bold text-zinc-100 truncate">Plan Supermarché 2D</span>
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-400 font-mono shrink-0 hidden xs:inline">
              Vue {zoomLevel > 1 ? `${Math.round(zoomLevel * 100)}%` : 'complète'}
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
              placeholder="Chercher un rayon, boeuf, pâtes, yaourts..."
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

        {/* 2D Canvas Container with Floating Controls inside */}
        <div
          ref={mapContainerRef}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
          className={`relative w-full aspect-[1000/1024] bg-[#070a12] overflow-hidden select-none ${
            zoomLevel > 1 ? 'cursor-grab active:cursor-grabbing touch-none' : ''
          }`}
        >
          {/* Floating Map Controls Toolbar inside the canvas (Bottom Right) */}
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
              {/* Floor Terrazzo Fine Grid Pattern */}
              <pattern id="storeTileGrid" width="30" height="30" patternUnits="userSpaceOnUse">
                <rect width="30" height="30" fill="#090d16" />
                <path d="M 30 0 L 0 0 0 30" fill="none" stroke="#131c2e" strokeWidth="0.8" />
              </pattern>

              {/* Department Ambient Lighting Glows */}
              <radialGradient id="glowPrimeur" cx="50%" cy="50%" r="50%">
                <stop offset="0%" stopColor="#10b981" stopOpacity="0.18" />
                <stop offset="100%" stopColor="#10b981" stopOpacity="0" />
              </radialGradient>

              <radialGradient id="glowBoulangerie" cx="50%" cy="50%" r="50%">
                <stop offset="0%" stopColor="#f59e0b" stopOpacity="0.18" />
                <stop offset="100%" stopColor="#f59e0b" stopOpacity="0" />
              </radialGradient>

              <radialGradient id="glowBoucherie" cx="50%" cy="50%" r="50%">
                <stop offset="0%" stopColor="#f43f5e" stopOpacity="0.18" />
                <stop offset="100%" stopColor="#f43f5e" stopOpacity="0" />
              </radialGradient>

              <radialGradient id="glowSurgeles" cx="50%" cy="50%" r="50%">
                <stop offset="0%" stopColor="#06b6d4" stopOpacity="0.25" />
                <stop offset="100%" stopColor="#06b6d4" stopOpacity="0" />
              </radialGradient>

              <radialGradient id="glowFrais" cx="50%" cy="50%" r="50%">
                <stop offset="0%" stopColor="#ec4899" stopOpacity="0.15" />
                <stop offset="100%" stopColor="#ec4899" stopOpacity="0" />
              </radialGradient>

              <radialGradient id="glowEpicerie" cx="50%" cy="50%" r="50%">
                <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.12" />
                <stop offset="100%" stopColor="#3b82f6" stopOpacity="0" />
              </radialGradient>

              {/* Realistic 2.5D Department Shelf Color Gradients */}
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

              {/* Wireframe blueprint gradient for non-active aisles in guided mode */}
              <linearGradient id="shelfMuted" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#1e293b" />
                <stop offset="100%" stopColor="#0f172a" />
              </linearGradient>

              {/* Advanced Drop Shadows */}
              <filter id="shelfShadow" x="-10%" y="-10%" width="120%" height="125%">
                <feDropShadow dx="0" dy="5" stdDeviation="4" floodColor="#000000" floodOpacity="0.65" />
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

            {/* 1. Floor Background & Fine Terrazzo Grid */}
            <rect width="1000" height="1024" fill="url(#storeTileGrid)" rx="24" />

            {/* 2. Department Ambient Lighting Radiance Underlay */}
            <circle cx="359" cy="850" r="160" fill="url(#glowPrimeur)" pointerEvents="none" />
            <circle cx="513" cy="870" r="140" fill="url(#glowBoulangerie)" pointerEvents="none" />
            <circle cx="489" cy="210" r="160" fill="url(#glowSurgeles)" pointerEvents="none" />
            <circle cx="450" cy="540" r="180" fill="url(#glowBoucherie)" pointerEvents="none" />
            <circle cx="160" cy="650" r="220" fill="url(#glowFrais)" pointerEvents="none" />
            <circle cx="790" cy="450" r="260" fill="url(#glowEpicerie)" pointerEvents="none" />

            {/* 3. Architectural Exterior & Partition Walls */}
            <g stroke="#334155" strokeWidth="4" fill="none" strokeLinecap="round" opacity="0.8">
              {/* Top and Right exterior boundary */}
              <line x1="292" y1="12" x2="965" y2="12" />
              <line x1="965" y1="12" x2="965" y2="990" />
              {/* Left exterior wall & refrigerated perimeter */}
              <line x1="12" y1="265" x2="12" y2="760" />
              <line x1="12" y1="334" x2="380" y2="334" />
              <line x1="380" y1="50" x2="380" y2="325" />
              <line x1="560" y1="90" x2="560" y2="334" />
              <line x1="482" y1="765" x2="482" y2="815" />
              <line x1="482" y1="765" x2="965" y2="765" />
            </g>

            {/* 4. Elegant Illuminated Department Floor Typography */}
            <g
              fill="#334155"
              fontSize="12"
              fontWeight="900"
              letterSpacing="2.5"
              textAnchor="middle"
              className="pointer-events-none select-none opacity-40 font-mono"
            >
              <text x="360" y="785">HALL PRIMEURS</text>
              <text x="515" y="805">FOURNIL</text>
              <text x="790" y="725">GRANDES ALLÉES ÉPICERIE</text>
              <text x="790" y="145">ENTRETIEN & SOIN</text>
              <text x="490" y="75">PÔLE GRAND FROID</text>
              <text x="450" y="430">BOUCHERIE & CHARCUTERIE</text>
              <text x="210" y="465">CRÈMERIE & TRAITEUR</text>
            </g>

            {/* 5. Directional Circulation Floor Arrows */}
            <g fill="#334155" opacity="0.35" className="pointer-events-none font-bold">
              <text x="615" y="680" fontSize="18">↑</text>
              <text x="615" y="470" fontSize="18">↑</text>
              <text x="615" y="270" fontSize="18">↑</text>
              <text x="430" y="380" fontSize="18">←</text>
              <text x="325" y="670" fontSize="18">↓</text>
            </g>

            {/* 6. Grand Mur L-Shape Frais & Yaourts Fixture */}
            {(() => {
              const step = stepByAisleId.get('yaourts');
              const hasItems = !!step && step.items.length > 0;
              const isSelected = selectedAisle?.id === 'yaourts';
              const isDimmed = viewMode === 'guided' && !hasItems;
              const isSearched = searchedAisleIds ? searchedAisleIds.has('yaourts') : false;

              return (
                <g
                  id="yaourts-wall"
                  className="cursor-pointer transition-all duration-200"
                  onClick={() => {
                    triggerHaptic(20);
                    setSelectedAisleId('yaourts');
                  }}
                  opacity={isDimmed ? 0.35 : 1}
                >
                  {/* Selection Pulsing Glow */}
                  {(isSelected || isSearched) && (
                    <g stroke="#10b981" strokeWidth="4" fill="none" className="animate-pulse">
                      <rect x="18" y="471" width="39" height="247" rx="12" />
                      <rect x="21" y="714" width="211" height="30" rx="10" />
                      <rect x="225" y="715" width="50" height="251" rx="14" />
                    </g>
                  )}

                  {/* Vertical Top Section */}
                  <rect
                    x="23"
                    y="476"
                    width="29"
                    height="237"
                    rx="8"
                    fill={isDimmed ? 'url(#shelfMuted)' : 'url(#shelfPink)'}
                    stroke={isSelected ? '#10b981' : isDimmed ? '#1e293b' : '#db2777'}
                    strokeWidth={isSelected ? 2.5 : 1.5}
                    filter="url(#shelfShadow)"
                  />
                  {/* Glass Sliding Reflection */}
                  <line x1="28" y1="485" x2="46" y2="705" stroke="#ffffff" strokeWidth="1" opacity="0.3" pointerEvents="none" />

                  {/* Horizontal Bottom Section */}
                  <rect
                    x="26"
                    y="719"
                    width="201"
                    height="20"
                    rx="6"
                    fill={isDimmed ? 'url(#shelfMuted)' : 'url(#shelfPink)'}
                    stroke={isSelected ? '#10b981' : isDimmed ? '#1e293b' : '#db2777'}
                    strokeWidth={isSelected ? 2.5 : 1.5}
                    filter="url(#shelfShadow)"
                  />

                  {/* Vertical Bottom Section */}
                  <rect
                    x="230"
                    y="720"
                    width="40"
                    height="241"
                    rx="10"
                    fill={isDimmed ? 'url(#shelfMuted)' : 'url(#shelfPink)'}
                    stroke={isSelected ? '#10b981' : isDimmed ? '#1e293b' : '#db2777'}
                    strokeWidth={isSelected ? 2.5 : 1.5}
                    filter="url(#shelfShadow)"
                  />
                  <line x1="236" y1="730" x2="264" y2="950" stroke="#ffffff" strokeWidth="1" opacity="0.3" pointerEvents="none" />

                  {/* Wall Fixture Labels */}
                  <text
                    x="37"
                    y="595"
                    fill="#ffffff"
                    fontSize="11"
                    fontWeight="900"
                    textAnchor="middle"
                    transform="rotate(-90, 37, 595)"
                    className="pointer-events-none select-none drop-shadow"
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
                    className="pointer-events-none select-none drop-shadow"
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
                    className="pointer-events-none select-none drop-shadow"
                  >
                    🧈 BEURRE & CRÈMERIE
                  </text>
                </g>
              );
            })()}

            {/* 7. Entrance, Turnstiles & Checkout Belts */}
            <g id="entrance-checkout">
              {/* Entrance Gate */}
              <rect
                x="286"
                y="996"
                width="221"
                height="24"
                rx="8"
                fill="url(#shelfBlue)"
                stroke="#1d4ed8"
                strokeWidth="1.5"
                filter="url(#shelfShadow)"
              />
              <text
                x="396"
                y="1012"
                fill="#ffffff"
                fontSize="11"
                fontWeight="900"
                textAnchor="middle"
                className="pointer-events-none tracking-wider"
              >
                🚪 ENTRÉE DU MAGASIN
              </text>

              {/* Checkout Belt Fixtures */}
              <rect
                x="285"
                y="970"
                width="224"
                height="22"
                rx="6"
                fill="#0f172a"
                stroke="#334155"
                strokeWidth="1.5"
              />
              {/* Motorized rollers tick marks */}
              <line x1="310" y1="970" x2="310" y2="992" stroke="#1e293b" strokeWidth="2" />
              <line x1="340" y1="970" x2="340" y2="992" stroke="#1e293b" strokeWidth="2" />
              <line x1="370" y1="970" x2="370" y2="992" stroke="#1e293b" strokeWidth="2" />
              <line x1="400" y1="970" x2="400" y2="992" stroke="#1e293b" strokeWidth="2" />
              <line x1="430" y1="970" x2="430" y2="992" stroke="#1e293b" strokeWidth="2" />
              <line x1="460" y1="970" x2="460" y2="992" stroke="#1e293b" strokeWidth="2" />
              <line x1="490" y1="970" x2="490" y2="992" stroke="#1e293b" strokeWidth="2" />

              {/* Checkout open lane lights */}
              <circle cx="295" cy="981" r="3" fill="#22c55e" />
              <circle cx="355" cy="981" r="3" fill="#22c55e" />
              <circle cx="415" cy="981" r="3" fill="#22c55e" />
              <circle cx="475" cy="981" r="3" fill="#22c55e" />

              <text
                x="397"
                y="985"
                fill="#f472b6"
                fontSize="10"
                fontWeight="900"
                textAnchor="middle"
                className="pointer-events-none drop-shadow"
              >
                💳 CAISSES & SORTIE
              </text>

              {/* Portique Entrée 2 */}
              <rect
                x="513"
                y="967"
                width="57"
                height="24"
                rx="6"
                fill="url(#shelfBlue)"
                stroke="#1d4ed8"
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

            {/* 8. Render All Store Aisles & 2.5D Shelves */}
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

                  {/* Main Shelf Gondola Body */}
                  <rect
                    x={aisle.x}
                    y={aisle.y}
                    width={aisle.width}
                    height={aisle.height}
                    rx={aisle.rx || 10}
                    fill={fillGradient}
                    stroke={isSelected ? '#10b981' : isDimmed ? '#1e293b' : aisle.accent}
                    strokeWidth={isSelected ? 2.5 : 1.5}
                    filter="url(#shelfShadow)"
                    className="transition-all duration-200 hover:brightness-110"
                  />

                  {/* Shelf Top Lighting Edge Highlight */}
                  <line
                    x1={aisle.x + (aisle.rx || 10)}
                    y1={aisle.y + 2}
                    x2={aisle.x + aisle.width - (aisle.rx || 10)}
                    y2={aisle.y + 2}
                    stroke="#ffffff"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    opacity={isDimmed ? 0.2 : 0.5}
                    pointerEvents="none"
                  />

                  {/* Department Specific Themed Overlays */}
                  {aisle.id === 'surgeles' && !isDimmed && (
                    // Icy Crystal Frost Reflections on Freezers
                    <g opacity="0.75" className="pointer-events-none">
                      <line
                        x1={aisle.x + 8}
                        y1={aisle.y + 12}
                        x2={aisle.x + aisle.width - 8}
                        y2={aisle.y + 12}
                        stroke="#e0f2fe"
                        strokeWidth="2"
                        strokeDasharray="6 4"
                      />
                      <line
                        x1={aisle.x + 8}
                        y1={aisle.y + aisle.height - 12}
                        x2={aisle.x + aisle.width - 8}
                        y2={aisle.y + aisle.height - 12}
                        stroke="#e0f2fe"
                        strokeWidth="2"
                        strokeDasharray="6 4"
                      />
                      {/* Frosted Glass Glare */}
                      <line
                        x1={aisle.x + 15}
                        y1={aisle.y + 20}
                        x2={aisle.x + aisle.width - 15}
                        y2={aisle.y + aisle.height - 20}
                        stroke="#ffffff"
                        strokeWidth="1"
                        opacity="0.3"
                      />
                      <text x={aisle.x + aisle.width / 2} y={aisle.y + 36} fontSize="14" textAnchor="middle">
                        ❄️
                      </text>
                      <text x={aisle.x + aisle.width / 2} y={aisle.y + aisle.height - 22} fontSize="14" textAnchor="middle">
                        🍦
                      </text>
                    </g>
                  )}

                  {aisle.id === 'fruits-legumes' && !isDimmed && (
                    // Wooden Market Produce Crates
                    <g opacity="0.5" className="pointer-events-none">
                      <rect
                        x={aisle.x + 8}
                        y={aisle.y + 8}
                        width={aisle.width - 16}
                        height={aisle.height - 16}
                        rx="8"
                        fill="none"
                        stroke="#064e3b"
                        strokeWidth="2"
                        strokeDasharray="8 6"
                      />
                      <text x={aisle.x + 22} y={aisle.y + 30} fontSize="14">🍎</text>
                      <text x={aisle.x + aisle.width - 24} y={aisle.y + 30} fontSize="14">🥦</text>
                      <text x={aisle.x + 22} y={aisle.y + aisle.height - 16} fontSize="14">🥕</text>
                      <text x={aisle.x + aisle.width - 24} y={aisle.y + aisle.height - 16} fontSize="14">🥑</text>
                    </g>
                  )}

                  {aisle.id === 'boulangerie-fraiche' && !isDimmed && (
                    // Wood Slats Texture for Bakery
                    <g opacity="0.45" className="pointer-events-none">
                      <line x1={aisle.x + 10} y1={aisle.y + 25} x2={aisle.x + aisle.width - 10} y2={aisle.y + 25} stroke="#78350f" strokeWidth="2" />
                      <line x1={aisle.x + 10} y1={aisle.y + aisle.height - 25} x2={aisle.x + aisle.width - 10} y2={aisle.y + aisle.height - 25} stroke="#78350f" strokeWidth="2" />
                      <text x={aisle.x + 20} y={aisle.y + 28} fontSize="13">🥖</text>
                      <text x={aisle.x + aisle.width - 20} y={aisle.y + 28} fontSize="13">🥐</text>
                    </g>
                  )}

                  {aisle.id === 'viandes-rouge' && !isDimmed && (
                    // Butchery Cutting Texture
                    <g opacity="0.6" className="pointer-events-none">
                      <line x1={aisle.x + 6} y1={aisle.y + 18} x2={aisle.x + aisle.width - 6} y2={aisle.y + 18} stroke="#ffffff" strokeWidth="1" strokeDasharray="4 4" />
                      <text x={aisle.x + aisle.width / 2} y={aisle.y + 30} fontSize="13" textAnchor="middle">🥩</text>
                    </g>
                  )}

                  {/* Horizontal Gondola Shelf Divider Marks for Grocery Aisles */}
                  {aisle.width > 200 && !isDimmed && (
                    <g stroke="#ffffff" strokeWidth="1" opacity="0.25" pointerEvents="none">
                      <line x1={aisle.x + aisle.width * 0.33} y1={aisle.y + 3} x2={aisle.x + aisle.width * 0.33} y2={aisle.y + aisle.height - 3} />
                      <line x1={aisle.x + aisle.width * 0.66} y1={aisle.y + 3} x2={aisle.x + aisle.width * 0.66} y2={aisle.y + aisle.height - 3} />
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
                    transform={`translate(${currentStep.aisle.waypoint.x}, ${currentStep.aisle.waypoint.y - 30})`}
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
