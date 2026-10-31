import React from 'react';
import { Wifi, WifiOff, Trash2, RotateCw } from 'lucide-react';

interface HeaderProps {
  connected: boolean;
  completedCount: number;
  onClearCompleted: () => void;
  onRefresh: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  connected,
  completedCount,
  onClearCompleted,
  onRefresh,
}) => {
  return (
    <header className="sticky top-0 z-30 backdrop-blur-xl bg-zinc-950/85 border-b border-zinc-800/60 px-4 pb-3 sm:px-6 pt-[max(0.75rem,env(safe-area-inset-top))] transition-all">
      <div className="max-w-2xl mx-auto flex items-center justify-between">
        <div className="flex items-center gap-3">
          {/* Custom Agora App Logo */}
          <img
            src="/apple-touch-icon.png"
            alt="Agora Logo"
            className="w-10 h-10 rounded-2xl shadow-md shadow-emerald-950/50 object-cover border border-emerald-500/20 active:scale-95 transition-transform"
          />
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold tracking-tight text-white leading-none">Agora</h1>
              <span
                className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium transition-colors ${
                  connected
                    ? 'bg-emerald-950/70 text-emerald-400 border border-emerald-800/60'
                    : 'bg-zinc-800/80 text-zinc-400 border border-zinc-700/60'
                }`}
              >
                {connected ? (
                  <>
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    <Wifi className="w-2.5 h-2.5" />
                    Live
                  </>
                ) : (
                  <>
                    <WifiOff className="w-2.5 h-2.5" />
                    Hors-ligne
                  </>
                )}
              </span>
            </div>
            <p className="text-[11px] text-zinc-400 mt-0.5">Liste de courses • Hermes AI</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={onRefresh}
            className="p-2 rounded-xl text-zinc-400 hover:text-white hover:bg-zinc-800/60 transition active:scale-90"
            title="Rafraîchir"
            aria-label="Rafraîchir"
          >
            <RotateCw className="w-4 h-4" />
          </button>

          {completedCount > 0 && (
            <button
              onClick={onClearCompleted}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium bg-red-950/40 hover:bg-red-900/60 text-red-300 border border-red-800/50 transition active:scale-95 shadow-sm"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Vider ({completedCount})</span>
            </button>
          )}
        </div>
      </div>
    </header>
  );
};
