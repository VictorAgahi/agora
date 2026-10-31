import React from 'react';
import { Check, X } from 'lucide-react';
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
      className={`group flex items-center justify-between p-3.5 rounded-2xl border transition-all duration-200 select-none ${
        item.completed
          ? 'bg-zinc-950/40 border-zinc-800/40 opacity-60'
          : 'bg-zinc-900/90 hover:bg-zinc-900 border-zinc-800 hover:border-zinc-700 shadow-sm'
      }`}
    >
      <div
        onClick={() => onToggle(item.id)}
        className="flex items-center gap-3.5 flex-1 min-w-0 cursor-pointer"
      >
        {/* Checkbox button */}
        <button
          type="button"
          aria-label={item.completed ? 'Marquer non fait' : 'Marquer acheté'}
          className={`w-6 h-6 rounded-lg flex items-center justify-center border transition-all duration-150 shrink-0 ${
            item.completed
              ? 'bg-emerald-500 border-emerald-500 text-zinc-950 shadow-sm'
              : 'border-zinc-700 hover:border-emerald-500/80 bg-zinc-800/50'
          }`}
        >
          {item.completed && <Check className="w-4 h-4 stroke-[3]" />}
        </button>

        {/* Text and badges */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span
              className={`text-sm font-medium transition-all ${
                item.completed ? 'line-through text-zinc-500' : 'text-zinc-100'
              }`}
            >
              {item.name}
            </span>

            {item.quantity && (
              <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-medium bg-zinc-800 text-emerald-400 border border-zinc-700/60 shrink-0">
                {item.quantity}
              </span>
            )}
          </div>

          <div className="flex items-center gap-2 mt-1">
            {item.category && (
              <span
                className={`inline-flex items-center text-[10px] font-medium px-2 py-0.5 rounded-md border ${badgeClass}`}
              >
                {item.category}
              </span>
            )}

            {item.notes && (
              <span className="text-xs text-zinc-400 truncate max-w-[200px]">
                {item.notes}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Delete action */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          onDelete(item.id);
        }}
        className="opacity-0 group-hover:opacity-100 focus:opacity-100 sm:transition-opacity p-1.5 rounded-lg text-zinc-500 hover:text-red-400 hover:bg-zinc-800/80"
        title="Supprimer"
        aria-label="Supprimer l'article"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
};
