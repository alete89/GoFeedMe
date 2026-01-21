export interface Dish {
  name: string;
  description: string;
}

export interface SimpleMenu {
  categories: {
    name: string;
    dishes: Dish[];
  }[];
}

export function parseMenu(menuText: string): SimpleMenu {
  const lines = menuText.split('\n').filter(line => line.trim());
  
  const categories: { name: string; dishes: Dish[] }[] = [];
  let currentCategory: { name: string; dishes: Dish[] } | null = null;
  let currentDish: Dish | null = null;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    
    if (isCategory(line)) {
      // Nueva categoría
      if (currentCategory) {
        if (currentDish) {
          currentCategory.dishes.push(currentDish);
          currentDish = null;
        }
        categories.push(currentCategory);
      }
      currentCategory = {
        name: line,
        dishes: []
      };
    }
    else if (isDishName(line) && currentCategory) {
      // Nuevo plato
      if (currentDish) {
        currentCategory.dishes.push(currentDish);
      }
      currentDish = {
        name: line,
        description: ''
      };
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
  return (line.includes(':') && /^[A-Z]/.test(line)) || 
         (/^[A-Z][a-z]+ :/.test(line));
}

function isDishName(line: string): boolean {
  const withoutSpecialChars = line.replace(/[^a-zA-ZÁÉÍÓÚáéíóúÑñ\s]/g, '');
  return withoutSpecialChars.length > 2 && 
         withoutSpecialChars === withoutSpecialChars.toUpperCase() &&
         !line.startsWith('*') && 
         !line.startsWith('-') &&
         !line.toLowerCase().includes('salsas') &&
         !line.toLowerCase().includes('elegir');
}
