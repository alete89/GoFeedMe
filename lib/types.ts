export interface Dish {
  id: string;
  name: string;
  description: string;
  options?: string[];
  usesCategoryOptions?: boolean;
}

export interface CategoryOptions {
  label: string;
  options: string[];
}

export interface Category {
  name: string;
  notes?: string;
  categoryOptions?: CategoryOptions;
  dishes: Dish[];
}

export interface Menu {
  categories: Category[];
}

export interface Order {
  id: number;
  date: string;
  time: string;
  name: string;
  dish: string;
  category?: string;
  observations?: string;
  created_at: string;
}
