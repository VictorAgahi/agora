export interface Item {
  id: number;
  name: string;
  quantity?: string;
  category?: string;
  aisle_id?: string;
  notes?: string;
  completed: boolean;
  created_at: string;
  updated_at: string;
}

export type Category = 
  | 'Fruits & Légumes'
  | 'Produits Frais'
  | 'Boucherie & Poisson'
  | 'Boulangerie'
  | 'Épicerie'
  | 'Boissons'
  | 'Maison & Hygiène'
  | 'Autre';

export const CATEGORIES: Category[] = [
  'Fruits & Légumes',
  'Produits Frais',
  'Boucherie & Poisson',
  'Boulangerie',
  'Épicerie',
  'Boissons',
  'Maison & Hygiène',
  'Autre',
];
