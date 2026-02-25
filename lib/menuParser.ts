export interface Dish {
  id: string;
  name: string;
  description: string;
}

export interface SimpleMenu {
  categories: {
    name: string;
    notes?: string;
    dishes: Dish[];
  }[];
}

export function parseMenu(menuText: string): SimpleMenu {
  const lines = menuText.split('\n').filter(line => line.trim());
  
  const categories: { name: string; notes?: string; dishes: Dish[] }[] = [];
  let currentCategory: { name: string; notes?: string; dishes: Dish[] } | null = null;
  let currentDish: Dish | null = null;
  let dishCounter = 0;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    
    if (isCategory(line)) {
      // Nueva categoría (## Título)
      if (currentCategory) {
        if (currentDish) {
          currentCategory.dishes.push(currentDish);
          currentDish = null;
        }
        categories.push(currentCategory);
      }
      currentCategory = {
        name: extractCategory(line),
        dishes: []
      };
    }
    else if (isDishName(line) && currentCategory) {
      // Nuevo plato (### NOMBRE)
      if (currentDish) {
        currentCategory.dishes.push(currentDish);
      }
      const dishName = extractDishName(line);
      // Generar ID único usando categoría, nombre y contador
      const categorySlug = currentCategory.name.replace(/[^a-zA-Z0-9]/g, '-').toLowerCase();
      const dishSlug = dishName.replace(/[^a-zA-Z0-9]/g, '-').toLowerCase();
      dishCounter++;
      const dishId = `${categorySlug}-${dishSlug}-${dishCounter}`;
      currentDish = {
        id: dishId,
        name: dishName,
        description: ''
      };
    }
    else if (isNote(line) && currentCategory && !currentDish) {
      // Nota de categoría (> texto informativo)
      if (currentCategory.notes) {
        currentCategory.notes += ' ';
      } else {
        currentCategory.notes = '';
      }
      currentCategory.notes += extractNote(line);
    }
    else if (currentDish && line.length > 0) {
      // Descripción del plato actual
      if (currentDish.description) {
        currentDish.description += ' ';
      }
      currentDish.description += line;
    }
  }

  // Agregar el último plato y categoría
  if (currentDish && currentCategory) {
    currentCategory.dishes.push(currentDish);
  }
  if (currentCategory) {
    categories.push(currentCategory);
  }

  return { categories };
}

function isCategory(line: string): boolean {
  return line.startsWith('## ') && !line.startsWith('### ');
}

function isDishName(line: string): boolean {
  return line.startsWith('### ');
}

function isNote(line: string): boolean {
  return line.startsWith('> ');
}

function extractCategory(line: string): string {
  return line.replace(/^## /, '');
}

function extractDishName(line: string): string {
  return line.replace(/^### /, '');
}

function extractNote(line: string): string {
  return line.replace(/^> /, '');
}
