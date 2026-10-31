import { useState } from 'react';
import { useShoppingList } from './hooks/useShoppingList';
import { Header } from './components/Header';
import { AddItemForm } from './components/AddItemForm';
import { ItemList } from './components/ItemList';
import { StoreMap } from './components/StoreMap';
import { AlertCircle, Bot, Sparkles, List, Map } from 'lucide-react';

export function App() {
  const [viewMode, setViewMode] = useState<'list' | 'map'>('list');
  const {
    items,
    loading,
    connected,
    error,
    addItem,
    toggleItem,
    deleteItem,
    clearCompleted,
    refresh,
  } = useShoppingList();

  const completedCount = items.filter((it) => it.completed).length;
  const pendingCount = items.filter((it) => !it.completed).length;

  return (
    <div className="min-h-[100dvh] bg-zinc-950 flex flex-col font-sans pb-[max(3rem,calc(env(safe-area-inset-bottom)+1.5rem))] w-full max-w-full overflow-x-hidden">
      <Header
        connected={connected}
        completedCount={completedCount}
        onClearCompleted={clearCompleted}
        onRefresh={refresh}
      />

      <main className="flex-1 max-w-2xl w-full mx-auto px-3 sm:px-6 pt-3 sm:pt-4 space-y-4 min-w-0 overflow-x-hidden">
        {error && (
          <div className="flex items-center gap-3 p-3.5 rounded-2xl bg-red-950/40 border border-red-800/60 text-red-300 text-xs shadow-sm">
            <AlertCircle className="w-4 h-4 shrink-0 text-red-400" />
            <div className="flex-1">{error}</div>
            <button
              onClick={refresh}
              className="underline hover:text-red-200 font-medium shrink-0"
            >
              Réessayer
            </button>
          </div>
        )}

        {/* Input Form */}
        <AddItemForm onAdd={addItem} />

        {/* View Switcher: Liste vs Plan 2D */}
        <div className="flex p-1 bg-zinc-900/90 border border-zinc-800/90 rounded-2xl shadow-inner">
          <button
            type="button"
            onClick={() => setViewMode('list')}
            className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-xl text-xs font-semibold transition-all duration-150 ${
              viewMode === 'list'
                ? 'bg-zinc-800 text-white shadow-sm'
                : 'text-zinc-400 hover:text-zinc-200 active:scale-[0.98]'
            }`}
          >
            <List className="w-4 h-4" />
            <span>Liste classique ({pendingCount})</span>
          </button>

          <button
            type="button"
            onClick={() => setViewMode('map')}
            className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-xl text-xs font-semibold transition-all duration-150 ${
              viewMode === 'map'
                ? 'bg-emerald-600 text-white shadow-md shadow-emerald-950/40'
                : 'text-zinc-400 hover:text-zinc-200 active:scale-[0.98]'
            }`}
          >
            <Map className="w-4 h-4" />
            <span>Plan Magasin 2D</span>
            {pendingCount > 0 && (
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            )}
          </button>
        </div>

        {/* Content View: Map or List */}
        {loading ? (
          <div className="space-y-2.5 py-6">
            {[1, 2, 3].map((n) => (
              <div
                key={n}
                className="h-16 bg-zinc-900/40 rounded-2xl animate-pulse border border-zinc-800/40"
              />
            ))}
          </div>
        ) : viewMode === 'map' ? (
          <StoreMap
            items={items}
            onToggle={toggleItem}
            onDelete={deleteItem}
          />
        ) : (
          <ItemList
            items={items}
            onToggle={toggleItem}
            onDelete={deleteItem}
          />
        )}

        {/* Hermes AI integration banner */}
        <div className="mt-8 p-4 rounded-2xl bg-gradient-to-r from-emerald-950/20 via-zinc-900/60 to-zinc-900/30 border border-emerald-900/30 flex items-start gap-3.5">
          <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 shrink-0">
            <Bot className="w-5 h-5" />
          </div>
          <div className="text-xs">
            <div className="flex items-center gap-1.5 font-semibold text-emerald-300">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Connecté à l'agent Hermes</span>
            </div>
            <p className="text-zinc-400 mt-1 leading-relaxed">
              Hermes peut ajouter des courses directement par MCP via{' '}
              <code className="text-emerald-300 bg-zinc-800/80 px-1 py-0.5 rounded font-mono text-[11px]">
                add_shopping_items
              </code>
              . Les articles se placent automatiquement sur le plan 2D !
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}

export default App;
