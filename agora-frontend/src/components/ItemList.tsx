import React, { useState } from 'react';
import { Layers, List as ListIcon, CheckCircle2, ShoppingCart } from 'lucide-react';
import { Item } from '../types';
import { ItemCard } from './ItemCard';

interface ItemListProps {
  items: Item[];
  onToggle: (id: number) => void;
  onDelete: (id: number) => void;
}

export const ItemList: React.FC<ItemListProps> = ({ items, onToggle, onDelete }) => {
  const [groupByCategory, setGroupByCategory] = useState(true);

  const pendingItems = items.filter((it) => !it.completed);
  const completedItems = items.filter((it) => it.completed);

  // Group pending items by category
  const groupedPending = pendingItems.reduce<Record<string, Item[]>>((acc, item) => {
    const cat = item.category || 'Autre';
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(item);
    return acc;
  }, {});

  const categories = Object.keys(groupedPending).sort();

  return (
    <div className="space-y-6">
      {/* Header bar for list mode */}
      <div className="flex items-center justify-between px-1 text-xs text-zinc-400">
        <span className="font-semibold text-zinc-300">
          À acheter ({pendingItems.length})
        </span>

        {pendingItems.length > 0 && (
          <button
            onClick={() => setGroupByCategory((prev) => !prev)}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-zinc-900 border border-zinc-800 text-zinc-300 hover:text-white transition"
          >
            {groupByCategory ? (
              <>
                <ListIcon className="w-3.5 h-3.5" />
                <span>Vue simple</span>
              </>
            ) : (
              <>
                <Layers className="w-3.5 h-3.5" />
                <span>Par rayon</span>
              </>
            )}
          </button>
        )}
      </div>

      {/* Empty State */}
      {pendingItems.length === 0 && completedItems.length === 0 && (
        <div className="text-center py-16 px-4 bg-zinc-900/40 rounded-3xl border border-zinc-800/60">
          <div className="w-14 h-14 mx-auto rounded-2xl bg-zinc-800/60 flex items-center justify-center text-zinc-500 mb-3.5">
            <ShoppingCart className="w-7 h-7" />
          </div>
          <h3 className="text-base font-semibold text-zinc-200">La liste est vide</h3>
          <p className="text-xs text-zinc-400 mt-1 max-w-sm mx-auto">
            Ajoute un article ci-dessus ou demande à <span className="text-emerald-400 font-medium">Hermes</span> d'ajouter les courses pour une recette !
          </p>
        </div>
      )}

      {/* Pending Items - Grouped or Flat */}
      {pendingItems.length > 0 && (
        <div className="space-y-4">
          {groupByCategory ? (
            categories.map((cat) => (
              <div key={cat} className="space-y-2">
                <h3 className="text-xs font-semibold text-emerald-400/90 tracking-wide uppercase px-2">
                  {cat} ({groupedPending[cat].length})
                </h3>
                <div className="space-y-2">
                  {groupedPending[cat].map((item) => (
                    <ItemCard
                      key={item.id}
                      item={item}
                      onToggle={onToggle}
                      onDelete={onDelete}
                    />
                  ))}
                </div>
              </div>
            ))
          ) : (
            <div className="space-y-2">
              {pendingItems.map((item) => (
                <ItemCard
                  key={item.id}
                  item={item}
                  onToggle={onToggle}
                  onDelete={onDelete}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Completed Items Section */}
      {completedItems.length > 0 && (
        <div className="pt-4 border-t border-zinc-900 space-y-3">
          <div className="flex items-center gap-1.5 px-1 text-xs font-semibold text-zinc-400">
            <CheckCircle2 className="w-4 h-4 text-emerald-500/80" />
            <span>Déjà dans le panier ({completedItems.length})</span>
          </div>

          <div className="space-y-2">
            {completedItems.map((item) => (
              <ItemCard
                key={item.id}
                item={item}
                onToggle={onToggle}
                onDelete={onDelete}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
