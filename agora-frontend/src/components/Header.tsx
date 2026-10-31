import React from 'react';
import { ShoppingBag, Wifi, WifiOff, Trash2, RotateCw } from 'lucide-react';

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
    <header className="sticky top-0 z-30 backdrop-blur-md bg-zinc-950/80 border-b border-zinc-800/80 px-4 py-3.5 sm:px-6">
      <div className="max-w-2xl mx-auto flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-emerald-700 flex items-center justify-center shadow-lg shadow-emerald-500/20">
            <ShoppingBag className="w-5 h-5 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold tracking-tight text-white">Agora</h1>
              <span
                className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium transition-colors ${
                  connected
                    ? 'bg-emerald-950/60 text-emerald-400 border border-emerald-800/60'
                    : 'bg-zinc-800 text-zinc-400 border border-zinc-700'
                }`}
                title={connected ? 'Connecté en direct' : 'Reconnexion...'}
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
            <p className="text-xs text-zinc-400">Liste partagée & IA Hermes</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={onRefresh}
            className="p-2 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800/60 transition active:scale-95"
            title="Rafraîchir"
            aria-label="Rafraîchir"
          >
            <RotateCw className="w-4 h-4" />
          </button>

          {completedCount > 0 && (
            <button
              onClick={onClearCompleted}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-red-950/40 hover:bg-red-900/60 text-red-300 border border-red-800/50 transition active:scale-95"
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
