// Helper para limpiar emojis de las categorías (formato :emoji:)
export const cleanCategoryName = (categoryName: string): string => {
  return categoryName.replace(/\s*:[a-z_]+:\s*/gi, '').trim();
};

// Helper para determinar si mostrar la categoría antes del plato
export const shouldShowCategory = (categoryName: string | undefined): boolean => {
  if (!categoryName) return false;
  const cleaned = cleanCategoryName(categoryName);
  return cleaned !== 'Plato' && cleaned !== 'Pasta';
};

export const formatDishWithCategory = (categoryName: string | undefined, dishName: string): string => {
  if (shouldShowCategory(categoryName)) {
    return `${cleanCategoryName(categoryName!)} ${dishName}`;
  }
  return dishName;
};

// Formatea la hora a la zona horaria local del cliente
export const formatLocalTime = (utcTimestamp: string): string => {
  const date = new Date(utcTimestamp);
  return date.toLocaleTimeString([], { 
    hour: '2-digit', 
    minute: '2-digit',
    hour12: false 
  });
};
