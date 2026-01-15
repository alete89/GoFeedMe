export interface SimpleMenu {
  categories: {
    name: string;
    dishes: string[];
  }[];
}

export function parseMenu(menuText: string): SimpleMenu {
  const lines = menuText.split('\n').filter(line => line.trim());
  
  const categories: { name: string; dishes: string[] }[] = [];
  let currentCategory: { name: string; dishes: string[] } | null = null;

  for (const line of lines) {
    const trimmedLine = line.trim();
    
    if (isCategory(trimmedLine)) {
      if (currentCategory) {
        categories.push(currentCategory);
      }
      currentCategory = {
        name: trimmedLine,
        dishes: []
      };
    }
    else if (isDishName(trimmedLine) && currentCategory) {
      currentCategory.dishes.push(trimmedLine);
    }
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
