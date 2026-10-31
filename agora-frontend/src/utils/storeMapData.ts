import { Item } from '../types';

export type AisleColorType =
  | 'emerald'
  | 'green'
  | 'pink'
  | 'yellow'
  | 'amber'
  | 'blue'
  | 'orange'
  | 'cyan'
  | 'red'
  | 'purple';

export type StoreZone =
  | 'primeur'
  | 'boulangerie'
  | 'frais'
  | 'boucherie'
  | 'surgeles'
  | 'epicerie'
  | 'hygiene'
  | 'caisses';

export interface StoreAisle {
  id: string;
  name: string;
  shortLabel: string;
  category: string;
  emoji: string;
  accent: string;
  zone?: StoreZone;
  // SVG bounding box coordinates (viewBox 0 0 1000 1024)
  x: number;
  y: number;
  width: number;
  height: number;
  rx?: number;
  // Center waypoint for shopping path route
  waypoint: { x: number; y: number };
  // Optimal order in store traversal (1 to 999)
  rank: number;
  colorType: AisleColorType;
  keywords: string[];
}

export const STORE_AISLES: StoreAisle[] = [
  // 1. Entrance / Start & Promo (South Center)
  {
    id: 'promo',
    name: 'Zone Promo & Bons Plans',
    shortLabel: 'Promos',
    category: 'Promotions',
    emoji: '🏷️',
    accent: '#f97316',
    zone: 'primeur',
    x: 420,
    y: 820,
    width: 160,
    height: 36,
    rx: 8,
    waypoint: { x: 500, y: 838 },
    rank: 5,
    colorType: 'orange',
    keywords: ['promo', 'promotion', 'solde', 'bon plan', 'catalogue'],
  },

  // 2. Marché Frais & Primeur (South-West)
  {
    id: 'fruits-legumes',
    name: 'Fruits & Légumes Frais',
    shortLabel: 'Fruits & Lég.',
    category: 'Fruits & Légumes',
    emoji: '🍎',
    accent: '#10b981',
    zone: 'primeur',
    x: 150,
    y: 530,
    width: 240,
    height: 190,
    rx: 14,
    waypoint: { x: 270, y: 625 },
    rank: 10,
    colorType: 'emerald',
    keywords: [
      'pomme', 'poire', 'banane', 'tomate', 'avocat', 'salade', 'oignon', 'ail',
      'carotte', 'courgette', 'poivron', 'citron', 'fruit', 'légume', 'legume',
      'champignon', 'patate', 'pomme de terre', 'fraise', 'framboise', 'melon',
      'pasteque', 'pastèque', 'orange', 'mandarine', 'clementine', 'raisin',
      'peche', 'pêche', 'abricot', 'kiwi', 'mangue', 'concombre', 'epinard',
      'échalote', 'echalote', 'poireau', 'brocoli', 'chou', 'herbes', 'persil',
      'coriandre', 'basilic', 'gingembre', 'radis', 'haricot vert', 'potimarron'
    ],
  },
  {
    id: 'noix-cajou',
    name: 'Noix de cajou & Fruits secs',
    shortLabel: 'Fruits Secs',
    category: 'Fruits & Légumes',
    emoji: '🥜',
    accent: '#eab308',
    zone: 'primeur',
    x: 150,
    y: 490,
    width: 240,
    height: 30,
    rx: 6,
    waypoint: { x: 270, y: 505 },
    rank: 15,
    colorType: 'amber',
    keywords: [
      'cajou', 'amande', 'pistache', 'noisette', 'noix', 'fruit sec', 'raisin sec',
      'cacahuete', 'cacahuète', 'arachide', 'graines', 'graines de courge', 'baies'
    ],
  },

  // 3. Fournil & Boulangerie Artisanale (South-Center)
  {
    id: 'boulangerie-fraiche',
    name: 'Pain & Boulangerie Artisanale',
    shortLabel: 'Boulangerie',
    category: 'Boulangerie',
    emoji: '🥖',
    accent: '#f59e0b',
    zone: 'boulangerie',
    x: 460,
    y: 670,
    width: 200,
    height: 130,
    rx: 12,
    waypoint: { x: 560, y: 735 },
    rank: 20,
    colorType: 'amber',
    keywords: [
      'baguette', 'pain artisanal', 'croissant', 'pain au chocolat', 'chocolatine',
      'brioche', 'chausson', 'flan', 'tourte', 'boule de pain', 'ficelle'
    ],
  },

  // 4. Grandes Allées Épicerie Sèche (East Wall - Strictly Aligned Parallel Gondolas)
  {
    id: 'chips-apero',
    name: 'Chips, Apéro & Boissons',
    shortLabel: 'Apéro & Chips',
    category: 'Boissons',
    emoji: '🍿',
    accent: '#f97316',
    zone: 'epicerie',
    x: 710,
    y: 620,
    width: 240,
    height: 42,
    rx: 6,
    waypoint: { x: 675, y: 641 },
    rank: 30,
    colorType: 'orange',
    keywords: [
      'chips', 'pringles', 'apéro', 'apero', 'doritos', 'bretzel', 'tortillas',
      'crakers', 'biere', 'bière', 'vin', 'coca', 'soda', 'fanta', 'sprite',
      'jus', 'eau gazeuse', 'perrier', 'eau', 'cidre', 'tonic'
    ],
  },
  {
    id: 'cuisine-monde',
    name: 'Cuisine du monde (Mexicain, Asie)',
    shortLabel: 'Monde (Mex, Asie)',
    category: 'Épicerie',
    emoji: '🌮',
    accent: '#ef4444',
    zone: 'epicerie',
    x: 710,
    y: 550,
    width: 240,
    height: 42,
    rx: 6,
    waypoint: { x: 675, y: 571 },
    rank: 40,
    colorType: 'red',
    keywords: [
      'mexicain', 'asiatique', 'tacos', 'fajitas', 'sauce soja', 'nouilles',
      'ramen', 'curry', 'lait de coco', 'wasabi', 'nem', 'sushi', 'sauce piquante',
      'tabasco', 'guacamole', 'epices monde', 'riz basmati', 'riz thai'
    ],
  },
  {
    id: 'epicerie-conserves',
    name: 'Épicerie (Pâtes, Sauces) & Conserves',
    shortLabel: 'Pâtes / Conserves',
    category: 'Épicerie',
    emoji: '🍝',
    accent: '#10b981',
    zone: 'epicerie',
    x: 710,
    y: 480,
    width: 240,
    height: 42,
    rx: 6,
    waypoint: { x: 675, y: 501 },
    rank: 50,
    colorType: 'emerald',
    keywords: [
      'pate', 'pâtes', 'pates', 'spaghetti', 'coquillettes', 'penne', 'tagliatelles',
      'sauce tomate', 'pesto', 'bolognaise', 'sauce', 'conserve', 'thon', 'mais',
      'maïs', 'haricot', 'lentilles', 'pois chiche', 'concentre de tomate',
      'sardines', 'ratatouille', 'petits pois'
    ],
  },
  {
    id: 'farine-sucre',
    name: 'Farine, Sucre, Huile & Épices',
    shortLabel: 'Farine & Sucre',
    category: 'Épicerie',
    emoji: '🌾',
    accent: '#f59e0b',
    zone: 'epicerie',
    x: 710,
    y: 410,
    width: 240,
    height: 42,
    rx: 6,
    waypoint: { x: 675, y: 431 },
    rank: 60,
    colorType: 'amber',
    keywords: [
      'farine', 'sucre', 'levure', 'huile', 'vinaigre', 'sel', 'poivre', 'epice',
      'épice', 'chocolat noir', 'chocolat patissier', 'vanille', 'arome',
      'bicarbonate', 'poudre amande'
    ],
  },
  {
    id: 'bio-oeufs',
    name: 'Bio & Œufs Frais',
    shortLabel: 'Bio & Œufs',
    category: 'Épicerie',
    emoji: '🥚',
    accent: '#84cc16',
    zone: 'epicerie',
    x: 710,
    y: 340,
    width: 240,
    height: 42,
    rx: 6,
    waypoint: { x: 675, y: 361 },
    rank: 70,
    colorType: 'green',
    keywords: [
      'oeuf', 'oeufs', 'œuf', 'œufs', 'bio', 'galette de riz', 'tofu', 'quinoa',
      'lait d avoine', 'lait de soja', 'lait d amande', 'graines de chia',
      'flocons d avoine'
    ],
  },
  {
    id: 'pain-sec',
    name: 'Pain de mie, Toast & Biscottes',
    shortLabel: 'Pain de mie',
    category: 'Boulangerie',
    emoji: '🍞',
    accent: '#d97706',
    zone: 'boulangerie',
    x: 710,
    y: 270,
    width: 240,
    height: 42,
    rx: 6,
    waypoint: { x: 675, y: 291 },
    rank: 80,
    colorType: 'amber',
    keywords: [
      'pain de mie', 'biscottes', 'cracotte', 'toast', 'muffin', 'pain burger',
      'pain hot dog', 'wasa', 'swedish'
    ],
  },
  {
    id: 'cereales-cafe',
    name: 'Céréales, Café, Thé & Miel',
    shortLabel: 'Céréales & Café',
    category: 'Épicerie',
    emoji: '☕',
    accent: '#78350f',
    zone: 'epicerie',
    x: 710,
    y: 200,
    width: 240,
    height: 42,
    rx: 6,
    waypoint: { x: 675, y: 221 },
    rank: 90,
    colorType: 'amber',
    keywords: [
      'cereale', 'céréales', 'muesli', 'granola', 'cafe', 'café', 'the', 'thé',
      'infusion', 'capsules', 'confiture', 'miel', 'pate a tartiner', 'nutella',
      'chocolat chaud', 'nesquik'
    ],
  },
  {
    id: 'hygiene',
    name: 'Papier, Dentifrice, Entretien & Vaisselle',
    shortLabel: 'Hygiène & Entretien',
    category: 'Maison & Hygiène',
    emoji: '🧼',
    accent: '#8b5cf6',
    zone: 'hygiene',
    x: 710,
    y: 60,
    width: 240,
    height: 100,
    rx: 12,
    waypoint: { x: 675, y: 110 },
    rank: 100,
    colorType: 'purple',
    keywords: [
      'papier toilette', 'dentifrice', 'vaisselle', 'sopalin', 'essuie-tout',
      'lessive', 'liquide vaisselle', 'shampoing', 'savon', 'gel douche',
      'eponge', 'éponge', 'sac poubelle', 'javel', 'nettoyant', 'adoucissant',
      'deodorant', 'coton', 'brosse a dents'
    ],
  },

  // 5. Central Columnar Aisles (Fresh, Dairy, Meat, Poultry)
  {
    id: 'fromages-frais',
    name: 'Fromagerie & Fromages Frais',
    shortLabel: 'Fromages Frais',
    category: 'Produits Frais',
    emoji: '🧀',
    accent: '#eab308',
    zone: 'frais',
    x: 90,
    y: 60,
    width: 300,
    height: 70,
    rx: 10,
    waypoint: { x: 240, y: 155 },
    rank: 110,
    colorType: 'yellow',
    keywords: [
      'fromage', 'camembert', 'comte', 'comté', 'chevre', 'chèvre', 'emmental',
      'parmesan', 'mozzarella', 'roquefort', 'brie', 'feta', 'gouda', 'cantal',
      'reblochon', 'râpé', 'rape'
    ],
  },
  {
    id: 'creme-liquide',
    name: 'Crème fraîche liquide & Béchamel',
    shortLabel: 'Crème liquide',
    category: 'Produits Frais',
    emoji: '🥛',
    accent: '#38bdf8',
    zone: 'frais',
    x: 440,
    y: 310,
    width: 50,
    height: 110,
    rx: 8,
    waypoint: { x: 415, y: 365 },
    rank: 120,
    colorType: 'blue',
    keywords: ['creme liquide', 'crème liquide', 'bechamel', 'béchamel', 'fleurette', 'creme fleurette'],
  },
  {
    id: 'pates-fraiches',
    name: 'Pâtes fraîches & Pâtes brisées',
    shortLabel: 'Pâtes Fraîches',
    category: 'Produits Frais',
    emoji: '🥟',
    accent: '#facc15',
    zone: 'frais',
    x: 590,
    y: 310,
    width: 50,
    height: 110,
    rx: 8,
    waypoint: { x: 615, y: 365 },
    rank: 130,
    colorType: 'yellow',
    keywords: [
      'pates fraiches', 'pâtes fraîches', 'tagliatelles fraiches', 'ravioli frais',
      'gnocchi', 'pate brisee', 'pâte brisée', 'pate feuilletee', 'pâte feuilletée',
      'pate a pizza'
    ],
  },
  {
    id: 'viandes-rouge',
    name: 'Viandes rouges & Boucherie',
    shortLabel: 'Viande Rouge',
    category: 'Boucherie & Poisson',
    emoji: '🥩',
    accent: '#f43f5e',
    zone: 'boucherie',
    x: 515,
    y: 310,
    width: 50,
    height: 110,
    rx: 8,
    waypoint: { x: 540, y: 365 },
    rank: 140,
    colorType: 'red',
    keywords: [
      'viande', 'viandes', 'viande rouge', 'viande hachee', 'viande hachée',
      'boeuf', 'bœuf', 'steak', 'steaks', 'hache', 'haché', 'veau', 'porc',
      'agneau', 'cote de boeuf', 'côte de boeuf', 'bavette', 'faux-filet',
      'entrecote', 'entrecôte', 'bourguignon', 'roti', 'rôti', 'carpaccio', 'tartare'
    ],
  },
  {
    id: 'volailles',
    name: 'Volailles (Poulet, Dinde, Canard)',
    shortLabel: 'Volailles',
    category: 'Boucherie & Poisson',
    emoji: '🍗',
    accent: '#fb923c',
    zone: 'boucherie',
    x: 515,
    y: 450,
    width: 50,
    height: 140,
    rx: 8,
    waypoint: { x: 540, y: 520 },
    rank: 150,
    colorType: 'orange',
    keywords: [
      'volaille', 'volailles', 'poulet', 'dinde', 'canard', 'filet de poulet',
      'cuisse de poulet', 'escalope', 'blanc de poulet', 'aiguillette', 'magret'
    ],
  },
  {
    id: 'creme-solide',
    name: 'Crème fraîche épaisse (Pot)',
    shortLabel: 'Crème épaisse',
    category: 'Produits Frais',
    emoji: '🥣',
    accent: '#38bdf8',
    zone: 'frais',
    x: 440,
    y: 450,
    width: 50,
    height: 140,
    rx: 8,
    waypoint: { x: 415, y: 520 },
    rank: 160,
    colorType: 'blue',
    keywords: ['creme fraiche', 'crème fraîche', 'creme epaisse', 'crème épaisse', 'creme pot', 'creme solide'],
  },
  {
    id: 'sandwich',
    name: 'Sandwichs & Snacking Traiteur',
    shortLabel: 'Sandwichs',
    category: 'Produits Frais',
    emoji: '🥪',
    accent: '#10b981',
    zone: 'frais',
    x: 590,
    y: 450,
    width: 50,
    height: 140,
    rx: 8,
    waypoint: { x: 615, y: 520 },
    rank: 170,
    colorType: 'green',
    keywords: ['sandwich', 'wrap', 'snacking', 'salade sodebo', 'salade traiteur', 'box'],
  },
  {
    id: 'jambon-lardons',
    name: 'Frais, Jambon, Lardons & Saucisses',
    shortLabel: 'Jambon / Lardons',
    category: 'Boucherie & Poisson',
    emoji: '🥓',
    accent: '#fb7185',
    zone: 'boucherie',
    x: 655,
    y: 450,
    width: 40,
    height: 140,
    rx: 8,
    waypoint: { x: 685, y: 520 },
    rank: 180,
    colorType: 'pink',
    keywords: ['jambon', 'lardon', 'lardons', 'bacon', 'saucisse', 'knacki', 'des de jambon', 'jambon blanc'],
  },
  {
    id: 'charcuterie-traiteur',
    name: 'Charcuterie, Fromage & Plats cuisinés',
    shortLabel: 'Charcuterie / Traiteur',
    category: 'Produits Frais',
    emoji: '🍤',
    accent: '#f43f5e',
    zone: 'boucherie',
    x: 150,
    y: 280,
    width: 240,
    height: 180,
    rx: 14,
    waypoint: { x: 270, y: 370 },
    rank: 190,
    colorType: 'pink',
    keywords: [
      'traiteur', 'plat cuisine', 'quiche', 'saucisson', 'jambon sec', 'pate croute',
      'rillettes', 'terrine', 'saumon fume', 'saumon', 'truite', 'poisson', 'crevettes'
    ],
  },
  {
    id: 'yaourts',
    name: 'Frais, Laits & Yaourts (Grand Mur)',
    shortLabel: 'Frais & Yaourts',
    category: 'Produits Frais',
    emoji: '🍓',
    accent: '#ec4899',
    zone: 'frais',
    x: 45,
    y: 140,
    width: 45,
    height: 680,
    rx: 10,
    waypoint: { x: 110, y: 465 },
    rank: 200,
    colorType: 'pink',
    keywords: [
      'yaourt', 'yaourts', 'yaourt nature', 'yaourt grec', 'fromage blanc',
      'petits suisses', 'beurre', 'lait', 'creme dessert', 'danette', 'compote',
      'creme anglaise', 'mousse chocolat', 'actimel'
    ],
  },

  // 6. Pôle Grand Froid (Freezers - Always Last Before Checkouts)
  {
    id: 'surgeles',
    name: 'Congélateur (Surgelés & Glaces)',
    shortLabel: 'Surgelés (Congélo)',
    category: 'Produits Frais',
    emoji: '❄️',
    accent: '#06b6d4',
    zone: 'surgeles',
    x: 440,
    y: 60,
    width: 230,
    height: 180,
    rx: 14,
    waypoint: { x: 555, y: 150 },
    rank: 250,
    colorType: 'cyan',
    keywords: [
      'surgele', 'surgelé', 'surgeles', 'surgelés', 'glace', 'glaces',
      'frites surgelees', 'pizza surgelee', 'legumes surgeles', 'poisson pane',
      'glaçons', 'congelo', 'picard', 'magnum', 'ben & jerry'
    ],
  },

  // 7. Checkouts & Exit (South)
  {
    id: 'caisses',
    name: 'Caisses & Sortie',
    shortLabel: 'Caisses',
    category: 'Autre',
    emoji: '💳',
    accent: '#ec4899',
    zone: 'caisses',
    x: 150,
    y: 880,
    width: 320,
    height: 50,
    rx: 8,
    waypoint: { x: 310, y: 905 },
    rank: 999,
    colorType: 'pink',
    keywords: ['caisse', 'sac', 'paiement'],
  },
];

const LOCAL_STORAGE_LEARNED_KEY = 'agora_learned_aisles_v1';
const API_BASE = import.meta.env.VITE_API_URL || '';

/**
 * Loads learned mappings from localStorage.
 */
export function getLocalLearnings(): Record<string, string> {
  if (typeof window === 'undefined') return {};
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_LEARNED_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

/**
 * Persists an item keyword -> aisleId mapping permanently.
 * Synchronizes with localStorage and calls the backend API.
 */
export async function learnItemAisle(itemName: string, aisleId: string): Promise<void> {
  const cleanName = itemName.toLowerCase().trim();
  if (!cleanName || !aisleId) return;

  // 1. Instant local storage persistence
  try {
    const current = getLocalLearnings();
    current[cleanName] = aisleId;
    localStorage.setItem(LOCAL_STORAGE_LEARNED_KEY, JSON.stringify(current));
    // Dispatch local event for reactive updates across the app
    window.dispatchEvent(new CustomEvent('agora:aisle_learned', { detail: { keyword: cleanName, aisleId } }));
  } catch (err) {
    console.error('Failed to save to localStorage', err);
  }

  // 2. Persist to backend SQLite so Hermes agent also learns
  try {
    await fetch(`${API_BASE}/api/learn-aisle`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ keyword: cleanName, aisle_id: aisleId }),
    });
  } catch (err) {
    // Non-blocking if offline
    console.warn('Backend sync failed, saved locally', err);
  }
}

/**
 * Word-boundary keyword matcher so short keywords like "oeuf" don't match inside "boeuf",
 * "ail" inside "volaille", or "eau" inside "poireau".
 */
export function matchKeyword(text: string, kw: string): boolean {
  const t = text.toLowerCase();
  const k = kw.toLowerCase();
  if (k.includes(' ')) {
    return t.includes(k);
  }
  const regex = new RegExp(`(^|[^a-z0-9à-ÿ])${k}([^a-z0-9à-ÿ]|$)`, 'i');
  return regex.test(t);
}

/**
 * Intelligent mapping of an item to its store aisle based on name, manual override, learned mappings, and keywords.
 */
export function detectAisleForItem(item: Item): StoreAisle {
  // 1. Direct explicit aisle_id on the item
  if (item.aisle_id) {
    const direct = STORE_AISLES.find((a) => a.id === item.aisle_id);
    if (direct) return direct;
  }

  const nameLower = item.name.toLowerCase().trim();

  // 2. Check dynamic learned mappings (self-improving system)
  const learnings = getLocalLearnings();
  if (learnings[nameLower]) {
    const learnedAisle = STORE_AISLES.find((a) => a.id === learnings[nameLower]);
    if (learnedAisle) return learnedAisle;
  }
  // Check word matches in learned keywords
  for (const [kw, aisleId] of Object.entries(learnings)) {
    if (matchKeyword(nameLower, kw)) {
      const learnedAisle = STORE_AISLES.find((a) => a.id === aisleId);
      if (learnedAisle) return learnedAisle;
    }
  }

  // 3. Priority check for frozen items to preserve cold chain (e.g., "glace vanille", "pizza surgelée")
  const frozenAisle = STORE_AISLES.find((a) => a.id === 'surgeles');
  if (frozenAisle) {
    for (const kw of frozenAisle.keywords) {
      if (matchKeyword(nameLower, kw)) {
        return frozenAisle;
      }
    }
  }

  // 4. Direct keyword match across store aisles with word boundary
  for (const aisle of STORE_AISLES) {
    if (aisle.id === 'caisses' || aisle.id === 'surgeles') continue;
    for (const kw of aisle.keywords) {
      if (matchKeyword(nameLower, kw)) {
        return aisle;
      }
    }
  }

  // 5. Fallback to broad category match
  const cat = item.category || '';
  if (cat === 'Fruits & Légumes') {
    return STORE_AISLES.find((a) => a.id === 'fruits-legumes')!;
  }
  if (cat === 'Boulangerie') {
    return STORE_AISLES.find((a) => a.id === 'boulangerie-fraiche')!;
  }
  if (cat === 'Maison & Hygiène') {
    return STORE_AISLES.find((a) => a.id === 'hygiene')!;
  }
  if (cat === 'Boissons') {
    return STORE_AISLES.find((a) => a.id === 'chips-apero')!;
  }
  if (cat === 'Boucherie & Poisson') {
    return STORE_AISLES.find((a) => a.id === 'viandes-rouge')!;
  }
  if (cat === 'Produits Frais') {
    return STORE_AISLES.find((a) => a.id === 'yaourts')!;
  }
  if (cat === 'Épicerie') {
    return STORE_AISLES.find((a) => a.id === 'epicerie-conserves')!;
  }

  // Default fallback
  return STORE_AISLES.find((a) => a.id === 'epicerie-conserves')!;
}

export interface OptimizedRouteStep {
  aisle: StoreAisle;
  stepNumber: number;
  items: Item[];
  allCompleted: boolean;
}

/**
 * Calculates the optimal shopping path through the store based on the active items.
 * Orders aisles from entrance -> produce -> dry goods -> fresh/meats -> frozen (last!) -> checkouts.
 */
export function computeOptimizedRoute(items: Item[]): OptimizedRouteStep[] {
  // Group items by aisle
  const aisleMap = new Map<string, Item[]>();
  for (const it of items) {
    const aisle = detectAisleForItem(it);
    const existing = aisleMap.get(aisle.id) || [];
    existing.push(it);
    aisleMap.set(aisle.id, existing);
  }

  // Filter only aisles that have items, sorted by their optimal rank
  const activeAisles = STORE_AISLES.filter((a) => aisleMap.has(a.id)).sort(
    (a, b) => a.rank - b.rank
  );

  return activeAisles.map((aisle, idx) => {
    const aisleItems = aisleMap.get(aisle.id) || [];
    return {
      aisle,
      stepNumber: idx + 1,
      items: aisleItems,
      allCompleted: aisleItems.length > 0 && aisleItems.every((it) => it.completed),
    };
  });
}
