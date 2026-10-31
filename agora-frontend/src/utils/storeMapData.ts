import { Item } from '../types';

export interface StoreAisle {
  id: string;
  name: string;
  shortLabel: string;
  category: string;
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
  colorType: 'green' | 'pink' | 'yellow' | 'blue' | 'orange' | 'cyan';
  keywords: string[];
}

export const STORE_AISLES: StoreAisle[] = [
  // 1. Entrance / Start
  {
    id: 'promo',
    name: 'Zone Promo',
    shortLabel: 'Promo',
    category: 'Promotions',
    x: 293,
    y: 931,
    width: 141,
    height: 14,
    rx: 4,
    waypoint: { x: 363, y: 920 },
    rank: 5,
    colorType: 'orange',
    keywords: ['promo', 'promotion', 'solde', 'bon plan', 'catalogue'],
  },
  {
    id: 'fruits-legumes',
    name: 'Fruits & Légumes',
    shortLabel: 'Fruits & Lég.',
    category: 'Fruits & Légumes',
    x: 285,
    y: 796,
    width: 148,
    height: 126,
    rx: 16,
    waypoint: { x: 359, y: 840 },
    rank: 10,
    colorType: 'green',
    keywords: [
      'pomme', 'poire', 'banane', 'tomate', 'avocat', 'salade', 'oignon', 'ail',
      'carotte', 'courgette', 'poivron', 'citron', 'fruit', 'légume', 'legume',
      'champignon', 'patate', 'pomme de terre', 'fraise', 'framboise', 'melon',
      'pasteque', 'pastèque', 'orange', 'mandarine', 'clementine', 'raisin',
      'peche', 'pêche', 'abricot', 'kiwi', 'mangue', 'concombre', 'epinard',
      'échalote', 'echalote', 'poireau', 'brocoli', 'chou', 'herbes', 'persil',
      'coriandre', 'basilic', 'gingembre'
    ],
  },
  {
    id: 'noix-cajou',
    name: 'Noix de cajou & Fruits secs',
    shortLabel: 'Fruits Secs',
    category: 'Fruits & Légumes',
    x: 285,
    y: 735,
    width: 113,
    height: 22,
    rx: 8,
    waypoint: { x: 341, y: 746 },
    rank: 15,
    colorType: 'yellow',
    keywords: [
      'cajou', 'amande', 'pistache', 'noisette', 'noix', 'fruit sec', 'raisin sec',
      'cacahuete', 'cacahuète', 'arachide', 'graines', 'graines de courge', 'baies'
    ],
  },
  {
    id: 'boulangerie-fraiche',
    name: 'Pain & Boulangerie',
    shortLabel: 'Boulangerie',
    category: 'Boulangerie',
    x: 456,
    y: 816,
    width: 114,
    height: 125,
    rx: 16,
    waypoint: { x: 513, y: 860 },
    rank: 20,
    colorType: 'yellow',
    keywords: [
      'baguette', 'pain artisanal', 'croissant', 'pain au chocolat', 'chocolatine',
      'brioche', 'chausson', 'flan', 'tourte', 'boule de pain', 'ficelle'
    ],
  },

  // 2. Right Side Aisles (Dry grocery, climbing from bottom to top)
  {
    id: 'chips-apero',
    name: 'Chips & Apéro',
    shortLabel: 'Apéro & Chips',
    category: 'Boissons',
    x: 654,
    y: 666,
    width: 303,
    height: 31,
    rx: 12,
    waypoint: { x: 790, y: 681 },
    rank: 30,
    colorType: 'green',
    keywords: [
      'chips', 'pringles', 'apéro', 'apero', 'doritos', 'bretzel', 'tortillas',
      'crakers', 'biere', 'bière', 'vin', 'coca', 'soda', 'fanta', 'sprite',
      'jus', 'eau gazeuse', 'perrier', 'eau', 'cidre', 'tonic'
    ],
  },
  {
    id: 'cuisine-monde',
    name: 'Cuisine du monde',
    shortLabel: 'Monde (Mex, Asie)',
    category: 'Épicerie',
    x: 657,
    y: 613,
    width: 293,
    height: 30,
    rx: 12,
    waypoint: { x: 790, y: 628 },
    rank: 40,
    colorType: 'green',
    keywords: [
      'mexicain', 'asiatique', 'tacos', 'fajitas', 'sauce soja', 'nouilles',
      'ramen', 'curry', 'lait de coco', 'wasabi', 'nem', 'sushi', 'sauce piquante',
      'tabasco', 'guacamole', 'epices monde', 'riz basmati', 'riz thai'
    ],
  },
  {
    id: 'epicerie-conserves',
    name: 'Épicerie & Conserves (Pâtes, Sauces)',
    shortLabel: 'Pâtes / Conserves',
    category: 'Épicerie',
    x: 654,
    y: 556,
    width: 304,
    height: 31,
    rx: 12,
    waypoint: { x: 790, y: 571 },
    rank: 50,
    colorType: 'green',
    keywords: [
      'pate', 'pâtes', 'pates', 'spaghetti', 'coquillettes', 'penne', 'tagliatelles',
      'sauce tomate', 'pesto', 'bolognaise', 'sauce', 'conserve', 'thon', 'mais',
      'maïs', 'haricot', 'lentilles', 'pois chiche', 'concentre de tomate',
      'sardines', 'ratatouille', 'petits pois'
    ],
  },
  {
    id: 'farine-sucre',
    name: 'Farine, Sucre, Huile etc.',
    shortLabel: 'Farine & Sucre',
    category: 'Épicerie',
    x: 653,
    y: 465,
    width: 285,
    height: 34,
    rx: 12,
    waypoint: { x: 790, y: 482 },
    rank: 60,
    colorType: 'green',
    keywords: [
      'farine', 'sucre', 'levure', 'huile', 'vinaigre', 'sel', 'poivre', 'epice',
      'épice', 'chocolat noir', 'chocolat patissier', 'vanille', 'arome',
      'bicarbonate', 'poudre amande'
    ],
  },
  {
    id: 'bio-oeufs',
    name: 'Bio & Œufs',
    shortLabel: 'Bio & Œufs',
    category: 'Épicerie',
    x: 646,
    y: 352,
    width: 304,
    height: 31,
    rx: 12,
    waypoint: { x: 790, y: 367 },
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
    name: 'Pain de mie & Biscottes',
    shortLabel: 'Pain de mie',
    category: 'Boulangerie',
    x: 648,
    y: 272,
    width: 303,
    height: 32,
    rx: 12,
    waypoint: { x: 790, y: 288 },
    rank: 80,
    colorType: 'green',
    keywords: [
      'pain de mie', 'biscottes', 'cracotte', 'toast', 'muffin', 'pain burger',
      'pain hot dog', 'wasa', 'swedish'
    ],
  },
  {
    id: 'cereales-cafe',
    name: 'Céréales & Café',
    shortLabel: 'Céréales & Café',
    category: 'Épicerie',
    x: 648,
    y: 171,
    width: 304,
    height: 31,
    rx: 12,
    waypoint: { x: 790, y: 186 },
    rank: 90,
    colorType: 'green',
    keywords: [
      'cereale', 'céréales', 'muesli', 'granola', 'cafe', 'café', 'the', 'thé',
      'infusion', 'capsules', 'confiture', 'miel', 'pate a tartiner', 'nutella',
      'chocolat chaud', 'nesquik'
    ],
  },
  {
    id: 'hygiene',
    name: 'Papier / Dentifrice / Vaisselle etc.',
    shortLabel: 'Hygiène & Entretien',
    category: 'Maison & Hygiène',
    x: 645,
    y: 21,
    width: 304,
    height: 92,
    rx: 16,
    waypoint: { x: 790, y: 67 },
    rank: 100,
    colorType: 'green',
    keywords: [
      'papier toilette', 'dentifrice', 'vaisselle', 'sopalin', 'essuie-tout',
      'lessive', 'liquide vaisselle', 'shampoing', 'savon', 'gel douche',
      'eponge', 'éponge', 'sac poubelle', 'javel', 'nettoyant', 'adoucissant',
      'deodorant', 'coton', 'brosse a dents'
    ],
  },

  // 3. Central & Upper-Left (Fresh, Meats, Dairy)
  {
    id: 'fromages-frais',
    name: 'Fromages - Frais',
    shortLabel: 'Fromages Frais',
    category: 'Produits Frais',
    x: 50,
    y: 359,
    width: 326,
    height: 44,
    rx: 12,
    waypoint: { x: 213, y: 381 },
    rank: 110,
    colorType: 'green',
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
    x: 500,
    y: 340,
    width: 66,
    height: 52,
    rx: 8,
    waypoint: { x: 533, y: 366 },
    rank: 120,
    colorType: 'green',
    keywords: ['creme liquide', 'crème liquide', 'bechamel', 'béchamel', 'fleurette', 'creme fleurette'],
  },
  {
    id: 'pates-fraiches',
    name: 'Pâtes fraîches & Pâtes brisées',
    shortLabel: 'Pâtes Fraîches',
    category: 'Produits Frais',
    x: 541,
    y: 442,
    width: 39,
    height: 130,
    rx: 12,
    waypoint: { x: 560, y: 507 },
    rank: 130,
    colorType: 'green',
    keywords: [
      'pates fraiches', 'pâtes fraîches', 'tagliatelles fraiches', 'ravioli frais',
      'gnocchi', 'pate brisee', 'pâte brisée', 'pate feuilletee', 'pâte feuilletée',
      'pate a pizza'
    ],
  },
  {
    id: 'viandes-rouge',
    name: 'Viandes rouges',
    shortLabel: 'Viande Rouge',
    category: 'Boucherie & Poisson',
    x: 479,
    y: 458,
    width: 38,
    height: 111,
    rx: 12,
    waypoint: { x: 498, y: 513 },
    rank: 140,
    colorType: 'green',
    keywords: ['boeuf', 'bœuf', 'steak', 'hache', 'haché', 'veau', 'porc', 'agneau', 'cote de boeuf', 'bavette', 'faux-filet'],
  },
  {
    id: 'volailles',
    name: 'Volailles',
    shortLabel: 'Volailles',
    category: 'Boucherie & Poisson',
    x: 387,
    y: 457,
    width: 38,
    height: 167,
    rx: 12,
    waypoint: { x: 406, y: 540 },
    rank: 150,
    colorType: 'green',
    keywords: ['poulet', 'dinde', 'canard', 'filet de poulet', 'cuisse de poulet', 'escalope', 'blanc de poulet', 'aiguillette'],
  },
  {
    id: 'creme-solide',
    name: 'Crème fraîche solide',
    shortLabel: 'Crème épaisse',
    category: 'Produits Frais',
    x: 353,
    y: 459,
    width: 31,
    height: 176,
    rx: 12,
    waypoint: { x: 368, y: 547 },
    rank: 160,
    colorType: 'green',
    keywords: ['creme fraiche', 'crème fraîche', 'creme epaisse', 'crème épaisse', 'creme pot', 'creme solide'],
  },
  {
    id: 'sandwich',
    name: 'Sandwichs & Snacking',
    shortLabel: 'Sandwichs',
    category: 'Produits Frais',
    x: 477,
    y: 573,
    width: 40,
    height: 130,
    rx: 12,
    waypoint: { x: 497, y: 638 },
    rank: 170,
    colorType: 'green',
    keywords: ['sandwich', 'wrap', 'snacking', 'salade sodebo', 'salade traiteur', 'box'],
  },
  {
    id: 'jambon-lardons',
    name: 'Frais, Jambon, Lardons etc.',
    shortLabel: 'Jambon / Lardons',
    category: 'Boucherie & Poisson',
    x: 541,
    y: 576,
    width: 40,
    height: 129,
    rx: 12,
    waypoint: { x: 561, y: 640 },
    rank: 180,
    colorType: 'green',
    keywords: ['jambon', 'lardon', 'lardons', 'bacon', 'saucisse', 'knacki', 'des de jambon', 'jambon blanc'],
  },
  {
    id: 'charcuterie-traiteur',
    name: 'Charcuterie, Fromage, Plats cuisinés',
    shortLabel: 'Charcuterie / Traiteur',
    category: 'Produits Frais',
    x: 128,
    y: 483,
    width: 170,
    height: 146,
    rx: 16,
    waypoint: { x: 213, y: 556 },
    rank: 190,
    colorType: 'green',
    keywords: [
      'traiteur', 'plat cuisine', 'quiche', 'saucisson', 'jambon sec', 'pate croute',
      'rillettes', 'terrine', 'saumon fume', 'saumon', 'truite', 'poisson', 'crevettes'
    ],
  },
  {
    id: 'yaourts',
    name: 'Frais & Yaourts',
    shortLabel: 'Frais & Yaourts',
    category: 'Produits Frais',
    // Representative bounding box for the L-shape wall
    x: 23,
    y: 476,
    width: 247,
    height: 485,
    rx: 14,
    waypoint: { x: 130, y: 728 },
    rank: 200,
    colorType: 'pink',
    keywords: [
      'yaourt', 'yaourts', 'yaourt nature', 'yaourt grec', 'fromage blanc',
      'petits suisses', 'beurre', 'lait', 'creme dessert', 'danette', 'compote',
      'creme anglaise', 'mousse chocolat', 'actimel'
    ],
  },

  // 4. Frozen Foods (Always last before checkout for cold chain!)
  {
    id: 'surgeles',
    name: 'Congélateur (Surgelés)',
    shortLabel: 'Surgelés (Congélo)',
    category: 'Produits Frais',
    x: 443,
    y: 104,
    width: 92,
    height: 213,
    rx: 18,
    waypoint: { x: 489, y: 210 },
    rank: 250,
    colorType: 'cyan',
    keywords: [
      'surgele', 'surgelé', 'surgeles', 'surgelés', 'glace', 'glaces',
      'frites surgelees', 'pizza surgelee', 'legumes surgeles', 'poisson pane',
      'glaçons', 'congelo', 'picard', 'magnum', 'ben & jerry'
    ],
  },

  // 5. Checkouts & Exit
  {
    id: 'caisses',
    name: 'Caisses & Sortie',
    shortLabel: 'Caisses',
    category: 'Autre',
    x: 285,
    y: 970,
    width: 224,
    height: 22,
    rx: 6,
    waypoint: { x: 397, y: 981 },
    rank: 999,
    colorType: 'pink',
    keywords: ['caisse', 'sac'],
  },
];

/**
 * Intelligent mapping of an item to its store aisle based on name and category.
 */
export function detectAisleForItem(item: Item): StoreAisle {
  const nameLower = item.name.toLowerCase().trim();

  // 1. Direct keyword match (most specific to least specific)
  for (const aisle of STORE_AISLES) {
    if (aisle.id === 'caisses') continue;
    for (const kw of aisle.keywords) {
      if (nameLower.includes(kw)) {
        return aisle;
      }
    }
  }

  // 2. Fallback to broad category match
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
