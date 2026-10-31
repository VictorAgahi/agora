import React, { useState } from 'react';
import { Plus, Tag } from 'lucide-react';
import { CATEGORIES, Category } from '../types';

interface AddItemFormProps {
  onAdd: (name: string, quantity?: string, category?: string, notes?: string) => Promise<void>;
}

export const AddItemForm: React.FC<AddItemFormProps> = ({ onAdd }) => {
  const [name, setName] = useState('');
  const [quantity, setQuantity] = useState('');
  const [category, setCategory] = useState<Category | ''>('');
  const [isExpanded, setIsExpanded] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed || submitting) return;

    setSubmitting(true);
    try {
      await onAdd(trimmed, quantity.trim() || undefined, category || undefined);
      setName('');
      setQuantity('');
      setCategory('');
      setIsExpanded(false);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="relative z-10">
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-2.5 shadow-xl focus-within:border-emerald-500/60 focus-within:ring-2 focus-within:ring-emerald-500/20 transition-all">
        <div className="flex items-center gap-2">
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Ajouter un article (ex: Bananes, Lait, Café...)"
            className="flex-1 bg-transparent px-3 py-2 text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none"
            onFocus={() => setIsExpanded(true)}
          />

          <input
            type="text"
            value={quantity}
            onChange={(e) => setQuantity(e.target.value)}
            placeholder="Qté (ex: 2kg)"
            className="w-24 bg-zinc-800/80 border border-zinc-700/60 rounded-xl px-2.5 py-1.5 text-xs text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-emerald-500/50"
          />

          <button
            type="submit"
            disabled={!name.trim() || submitting}
            className="w-9 h-9 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 disabled:hover:bg-emerald-600 text-white flex items-center justify-center transition active:scale-95 shadow-md shadow-emerald-600/30 shrink-0"
            aria-label="Ajouter"
          >
            <Plus className="w-5 h-5" />
          </button>
        </div>

        {/* Expandable Category selector */}
        {isExpanded && (
          <div className="mt-2.5 pt-2.5 border-t border-zinc-800/80 flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar text-xs">
            <span className="flex items-center gap-1 text-zinc-400 font-medium pl-1 shrink-0">
              <Tag className="w-3.5 h-3.5" />
              Rayon :
            </span>
            <button
              type="button"
              onClick={() => setCategory('')}
              className={`px-2.5 py-1 rounded-lg shrink-0 transition ${
                category === ''
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                  : 'bg-zinc-800 text-zinc-400 hover:text-zinc-200'
              }`}
            >
              Auto-détecté
            </button>
            {CATEGORIES.map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => setCategory(cat)}
                className={`px-2.5 py-1 rounded-lg shrink-0 transition ${
                  category === cat
                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                    : 'bg-zinc-800 text-zinc-400 hover:text-zinc-200'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        )}
      </div>
    </form>
  );
};
