import React from 'react';
import { Check, Trash2 } from 'lucide-react';
import { Item } from '../types';

interface ItemCardProps {
  item: Item;
  onToggle: (id: number) => void;
  onDelete: (id: number) => void;
}

const CATEGORY_COLORS: Record<string, string> = {
  'Fruits & Légumes': 'bg-emerald-950/60 text-emerald-400 border-emerald-800/40',
  'Produits Frais': 'bg-cyan-950/60 text-cyan-400 border-cyan-800/40',
  'Boucherie & Poisson': 'bg-rose-950/60 text-rose-400 border-rose-800/40',
  'Boulangerie': 'bg-amber-950/60 text-amber-400 border-amber-800/40',
  'Épicerie': 'bg-orange-950/60 text-orange-400 border-orange-800/40',
  'Boissons': 'bg-blue-950/60 text-blue-400 border-blue-800/40',
  'Maison & Hygiène': 'bg-purple-950/60 text-purple-400 border-purple-800/40',
  'Autre': 'bg-zinc-800/60 text-zinc-400 border-zinc-700/40',
};

export const ItemCard: React.FC<ItemCardProps> = ({ item, onToggle, onDelete }) => {
  const badgeClass = CATEGORY_COLORS[item.category || 'Autre'] || CATEGORY_COLORS['Autre'];

  return (
    <div
      onClick={() => onToggle(item.id)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onToggle(item.id);
        }
      }}
      className={`group relative flex items-center justify-between p-3.5 sm:p-4 rounded-2xl border cursor-pointer no-select transition-all duration-200 ease-out active:scale-[0.985] ${
        item.completed
          ? 'bg-zinc-950/40 border-zinc-900/60 opacity-60'
          : 'bg-zinc-900/80 hover:bg-zinc-900 border-zinc-800/80 hover:border-zinc-700 shadow-sm'
      }`}
    >
      <div className="flex items-center gap-3.5 flex-1 min-w-0">
        {/* Animated Checkbox */}
        <div
          className={`w-6 h-6 rounded-lg flex items-center justify-center border transition-all duration-150 shrink-0 ${
            item.completed
              ? 'bg-emerald-500 border-emerald-500 text-zinc-950 shadow-sm shadow-emerald-500/25 animate-check-pop'
              : 'border-zinc-700 hover:border-emerald-500/80 bg-zinc-800/60 group-hover:bg-zinc-800'
          }`}
        >
          {item.completed && (
            <Check className="w-4 h-4 stroke-[3] transition-transform scale-100" />
          )}
        </div>

        {/* Item details */}
        <div className="flex-1 min-w-0 pr-2">
          <div className="flex items-center gap-2 flex-wrap">
            <span
              className={`text-sm font-medium transition-all duration-200 ${
                item.completed
                  ? 'line-through text-zinc-500 decoration-zinc-600/80'
                  : 'text-zinc-100'
              }`}
            >
              {item.name}
            </span>

            {item.quantity && (
              <span
                className={`inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-medium border transition-colors ${
                  item.completed
                    ? 'bg-zinc-900 text-zinc-600 border-zinc-800'
                    : 'bg-zinc-800/90 text-emerald-400 border-zinc-700/60'
                }`}
              >
                {item.quantity}
              </span>
            )}
          </div>

          <div className="flex items-center gap-2 mt-1 flex-wrap">
            {item.category && (
              <span
                className={`inline-flex items-center text-[10px] font-medium px-2 py-0.5 rounded-md border transition-opacity ${
                  item.completed ? 'opacity-40' : ''
                } ${badgeClass}`}
              >
                {item.category}
              </span>
            )}

            {item.notes && (
              <span
                className={`text-xs truncate max-w-[200px] transition-colors ${
                  item.completed ? 'text-zinc-600 line-through' : 'text-zinc-400'
                }`}
              >
                {item.notes}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Delete action button */}
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onDelete(item.id);
        }}
        className="opacity-60 sm:opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity p-2 rounded-xl text-zinc-500 hover:text-red-400 hover:bg-red-950/30 active:scale-90"
        title="Supprimer"
        aria-label="Supprimer l'article"
      >
        <Trash2 className="w-4 h-4" />
      </button>
    </div>
  );
};
