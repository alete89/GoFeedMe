import type { Dish, Menu } from './types';

// Re-export types for backward compatibility
export type { Dish };
export type SimpleMenu = Menu;

export function parseMenu(menuText: string): Menu {
  const lines = menuText.split('\n').filter(line => line.trim());
  
  const categories: Menu['categories'] = [];
  let currentCategory: Menu['categories'][number] | null = null;
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
      // Nuevo plato (### NOMBRE o ### NOMBRE*)
      if (currentDish) {
        currentCategory.dishes.push(currentDish);
      }
      const { name: dishName, usesCategoryOptions } = extractDishName(line);
      // Generar ID único usando categoría, nombre y contador
      const categorySlug = currentCategory.name.replace(/[^a-zA-Z0-9]/g, '-').toLowerCase();
      const dishSlug = dishName.replace(/[^a-zA-Z0-9]/g, '-').toLowerCase();
      dishCounter++;
      const dishId = `${categorySlug}-${dishSlug}-${dishCounter}`;
      currentDish = {
        id: dishId,
        name: dishName,
        description: '',
        usesCategoryOptions
      };
    }
    else if (isOption(line) && currentDish) {
      // Opción del plato (- Opción)
      if (!currentDish.options) {
        currentDish.options = [];
      }
      currentDish.options.push(extractOption(line));
    }
    else if (isCategoryOptionStart(line, lines, i) && currentCategory && !currentDish) {
      // Opciones de categoría (> Label:\n> - Opción)
      const label = extractCategoryOptionLabel(line);
      const options: string[] = [];
      
      // Mirar las siguientes líneas para recolectar opciones
      i++;
      while (i < lines.length && lines[i].trim().startsWith('> -')) {
        options.push(extractCategoryOption(lines[i].trim()));
        i++;
      }
      i--; // Retroceder una línea porque el for loop va a incrementar
      
      currentCategory.categoryOptions = { label, options };
    }
    else if (isNote(line) && currentCategory && !currentDish) {
      // Nota de categoría (> texto informativo simple)
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

function isOption(line: string): boolean {
  return line.startsWith('- ') && !line.startsWith('- [ ]') && !line.startsWith('- [x]');
}

function extractCategory(line: string): string {
  return line.replace(/^## /, '');
}

function extractDishName(line: string): { name: string; usesCategoryOptions: boolean } {
  const cleaned = line.replace(/^### /, '');
  const usesCategoryOptions = cleaned.endsWith('*');
  const name = usesCategoryOptions ? cleaned.slice(0, -1).trim() : cleaned;
  return { name, usesCategoryOptions };
}

function extractNote(line: string): string {
  return line.replace(/^> /, '');
}

function extractOption(line: string): string {
  return line.replace(/^- /, '').trim();
}

function isCategoryOptionStart(line: string, lines: string[], index: number): boolean {
  // Es una opción de categoría si:
  // 1. La línea empieza con >
  // 2. La siguiente línea empieza con > -
  if (!line.startsWith('> ')) return false;
  if (index + 1 >= lines.length) return false;
  return lines[index + 1].trim().startsWith('> -');
}

function extractCategoryOptionLabel(line: string): string {
  return line.replace(/^> /, '').replace(/:$/, '').trim();
}

function extractCategoryOption(line: string): string {
  return line.replace(/^> - /, '').trim();
}
