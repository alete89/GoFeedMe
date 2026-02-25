'use client';

import { useState, useEffect } from 'react';
import * as emoji from 'node-emoji';

export const dynamic = 'force-dynamic';

interface Dish {
  id: string;
  name: string;
  description: string;
  options?: string[];
  usesCategoryOptions?: boolean;
}

interface Menu {
  categories: { 
    name: string; 
    notes?: string; 
    categoryOptions?: {
      label: string;
      options: string[];
    };
    dishes: Dish[] 
  }[];
}

export default function Home() {
  const [menu, setMenu] = useState<Menu | null>(null);
  const [name, setName] = useState('');
  const [selectedDishId, setSelectedDishId] = useState('');
  const [selectedDishName, setSelectedDishName] = useState('');
  const [selectedOption, setSelectedOption] = useState('');
  const [selectedCategoryOption, setSelectedCategoryOption] = useState('');
  const [observations, setObservations] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [isError, setIsError] = useState(false);
  const [ordersOpen, setOrdersOpen] = useState(true);

  useEffect(() => {
    const loadMenu = async () => {
      const res = await fetch('/api/menu');
      const data = await res.json();
      if (data.success) setMenu(data.data);
    };

    const checkStatus = async () => {
      const res = await fetch('/api/status');
      const data = await res.json();
      if (data.success) setOrdersOpen(data.data.status === 'open');
    };

    loadMenu();
    checkStatus();
  }, []);

  const handleSubmit = async (e: React.FormEvent, forceSubmit = false) => {
    e.preventDefault();
    
    if (!selectedDishId) {
      setMessage('Por favor seleccioná un plato');
      setIsError(true);
      return;
    }
    
    // Buscar el plato y su categoría
    let selectedDish: Dish | undefined;
    let selectedCategory;
    for (const cat of menu?.categories || []) {
      const dish = cat.dishes.find(d => d.id === selectedDishId);
      if (dish) {
        selectedDish = dish;
        selectedCategory = cat;
        break;
      }
    }
    
    // Validar que si el plato tiene opciones, se haya seleccionado una
    if (selectedDish?.options && selectedDish.options.length > 0 && !selectedOption) {
      setMessage('Por favor seleccioná una opción para este plato');
      setIsError(true);
      return;
    }
    
    // Validar que si el plato usa opciones de categoría, se haya seleccionado una
    if (selectedDish?.usesCategoryOptions && selectedCategory?.categoryOptions && !selectedCategoryOption) {
      setMessage(`Por favor seleccioná ${selectedCategory.categoryOptions.label.toLowerCase()}`);
      setIsError(true);
      return;
    }
    
    // Construir el nombre completo del plato con las opciones
    let fullDishName = selectedDishName;
    if (selectedOption) {
      fullDishName += ` (${selectedOption})`;
    }
    if (selectedDish?.usesCategoryOptions && selectedCategoryOption) {
      fullDishName += selectedOption ? `, ${selectedCategoryOption}` : ` (${selectedCategoryOption})`;
    }
    
    setLoading(true);
    try {
      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          name, 
          dish: fullDishName, 
          observations,
          force: forceSubmit 
        })
      });
      const data = await res.json();
      
      if (data.success) {
        setMessage(`✅ ¡Listo, ${name}! Tu pedido de ${fullDishName} fue registrado correctamente.`);
        setIsError(false);
        setName('');
        setSelectedDishId('');
        setSelectedDishName('');
        setSelectedOption('');
        setSelectedCategoryOption('');
        setObservations('');
        
        // Auto-ocultar mensaje después de 5 segundos
        setTimeout(() => setMessage(''), 5000);
      } else if (data.error === 'DUPLICATE_NAME') {
        // Nombre duplicado detectado
        const confirmed = window.confirm(
          `⚠️ ATENCIÓN: Ya existe un pedido hoy a nombre de "${data.existingOrder.name}"\n\n` +
          `Pedido existente: ${data.existingOrder.dish}\n` +
          `Hora: ${data.existingOrder.time}\n\n` +
          `Si este pedido NO es tuyo, por favor especificá mejor tu nombre para evitar ambigüedad.\n` +
          `Por ejemplo: "${name}" → "${name} [Apellido]" o agrega un identificador único.\n\n` +
          `¿Estás seguro que querés hacer otro pedido con el mismo nombre?`
        );
        
        if (confirmed) {
          // Reenviar con force=true
          handleSubmit(e, true);
          return;
        } else {
          setMessage('Pedido cancelado. Por favor cambiá tu nombre para evitar confusión.');
          setIsError(true);
        }
      } else {
        setMessage(data.error || 'Error al registrar el pedido');
        setIsError(true);
      }
    } catch {
      setMessage('Error de conexión. Por favor intentá de nuevo.');
      setIsError(true);
    }
    setLoading(false);
  };

  if (!ordersOpen) {
    return (
      <div className="max-w-2xl mx-auto p-8">
        <div className="bg-white rounded-lg shadow p-8 text-center">
          <h1 className="text-4xl font-bold mb-4 text-gray-800">🍽️ GoFeedMe</h1>
          <h2 className="text-2xl font-bold text-red-500 mb-2">Pedidos cerrados</h2>
          <p className="text-gray-600 mb-4">Ya no se pueden hacer más pedidos hoy.</p>
          <a 
            href="/admin/resumen" 
            className="inline-block text-sm text-blue-600 hover:text-blue-800 hover:underline"
          >
            Ir al resumen (admin)
          </a>
        </div>
      </div>
    );
  }

  if (!menu) {
    return (
      <div className="max-w-2xl mx-auto p-8">
        <div className="bg-white rounded-lg shadow p-8">
          <h1 className="text-4xl font-bold mb-4 text-gray-800">🍽️ GoFeedMe</h1>
          <div className="text-center p-8 bg-gray-50 rounded border-2 border-dashed border-gray-300">
            <h2 className="text-xl font-bold mb-4 text-gray-800">📋 No hay menú cargado todavía</h2>
            <p className="text-gray-600 mb-2">Parece que aún no se cargó el menú del día.</p>
            <p className="text-gray-600 mb-8">
              Si sos admin, <a href="/admin/menu" className="text-green-600 font-semibold hover:underline">cargá el menú acá</a>.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto p-4 sm:p-8">
      <div className="bg-white rounded-lg shadow p-4 sm:p-8">
        <div className="flex justify-between items-center mb-2">
          <h1 className="text-3xl sm:text-4xl font-bold text-gray-800">🍽️ GoFeedMe</h1>
          <a 
            href="/admin/resumen" 
            className="text-sm text-blue-600 hover:text-blue-800 hover:underline"
          >
            Ver resumen
          </a>
        </div>
        <p className="text-gray-600 mb-6">Elegí tu almuerzo de hoy</p>

        {/* Layout en dos columnas */}
        <div className="flex flex-col md:flex-row gap-6">
          {/* Columna izquierda: Lista de platos */}
          <div className="flex-1 md:min-w-0">
            <label className="block font-semibold mb-3">Elegí tu plato:</label>
            <div className="space-y-2 max-h-[70vh] overflow-y-auto pr-2">
              {menu.categories.map((cat) => (
                <div key={cat.name}>
                  <h3 className="font-bold text-lg mb-2 text-gray-700 sticky top-0 bg-white pt-2 pb-1">
                    {emoji.emojify(cat.name)}
                  </h3>
                  {cat.notes && (
                    <div className="mb-2 p-2 bg-blue-50 border-l-4 border-blue-400 text-sm text-blue-800">
                      <span className="font-medium">ℹ️ </span>{cat.notes}
                    </div>
                  )}
                  <div className="space-y-1.5 mb-3">
                    {cat.dishes.map((dish) => (
                      <div
                        key={dish.id}
                        className={`w-full text-left p-2.5 border-2 rounded transition-all ${
                          selectedDishId === dish.id
                            ? 'border-green-500 bg-green-50'
                            : 'border-gray-200 hover:border-green-300 hover:bg-gray-50'
                        }`}
                      >
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedDishId(dish.id);
                            setSelectedDishName(dish.name);
                            // Siempre limpiar las opciones al cambiar de plato
                            setSelectedOption('');
                            setSelectedCategoryOption('');
                          }}
                          className="w-full text-left"
                        >
                          <div className="font-semibold text-gray-900 text-sm sm:text-base">{dish.name}</div>
                        </button>
                        
                        {dish.options && dish.options.length > 0 && (
                          <div className="mt-2 ml-2 space-y-1">
                            {dish.options.map((option) => (
                              <label key={option} className="flex items-center gap-2 cursor-pointer">
                                <input
                                  type="radio"
                                  name={`option-${dish.id}`}
                                  value={option}
                                  checked={selectedDishId === dish.id && selectedOption === option}
                                  onChange={(e) => {
                                    setSelectedDishId(dish.id);
                                    setSelectedDishName(dish.name);
                                    setSelectedOption(e.target.value);
                                  }}
                                  className="w-4 h-4 text-green-500 focus:ring-green-500"
                                />
                                <span className="text-sm text-gray-700">{option}</span>
                              </label>
                            ))}
                          </div>
                        )}
                        
                        {dish.usesCategoryOptions && cat.categoryOptions && (
                          <div className="mt-2 ml-2 space-y-1">
                            <div className="text-xs font-semibold text-gray-600 mb-1">
                              {cat.categoryOptions.label}:
                            </div>
                            {cat.categoryOptions.options.map((catOption) => (
                              <label key={catOption} className="flex items-center gap-2 cursor-pointer">
                                <input
                                  type="radio"
                                  name={`cat-option-${dish.id}`}
                                  value={catOption}
                                  checked={selectedDishId === dish.id && selectedCategoryOption === catOption}
                                  onChange={(e) => {
                                    setSelectedDishId(dish.id);
                                    setSelectedDishName(dish.name);
                                    setSelectedCategoryOption(e.target.value);
                                  }}
                                  className="w-4 h-4 text-blue-500 focus:ring-blue-500"
                                />
                                <span className="text-sm text-gray-700">{catOption}</span>
                              </label>
                            ))}
                          </div>
                        )}
                        
                        {dish.description && (
                          <div className="text-xs sm:text-sm text-gray-600 mt-2">{dish.description}</div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
            {!selectedDishId && (
              <p className="text-sm text-red-500 mt-2">* Seleccioná un plato para continuar</p>
            )}
          </div>

          {/* Columna derecha: Formulario y acciones */}
          <div className="md:w-96 md:flex-shrink-0 md:sticky md:top-4 md:h-fit">
            <form onSubmit={handleSubmit} className="space-y-4 p-4 bg-gray-50 rounded-lg border-2 border-gray-200">
              <div>
                <label className="block font-semibold mb-2 text-sm">Tu nombre:</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  className="w-full p-3 border-2 rounded focus:border-green-500 outline-none"
                  placeholder="Ingresá tu nombre"
                />
              </div>

              <div>
                <label className="block font-semibold mb-2 text-sm">Plato seleccionado:</label>
                <div className="p-3 bg-white border-2 border-gray-300 rounded min-h-[48px] flex items-center">
                  {selectedDishName ? (
                    <span className="font-medium text-green-700">
                      ✓ {selectedDishName}
                      {selectedOption && <span className="text-sm"> ({selectedOption})</span>}
                      {selectedCategoryOption && (() => {
                        // Solo mostrar opción de categoría si el plato actual la usa
                        const currentDish = menu?.categories
                          .flatMap(cat => cat.dishes)
                          .find(dish => dish.id === selectedDishId);
                        return currentDish?.usesCategoryOptions ? (
                          <span className="text-sm">
                            {selectedOption ? `, ${selectedCategoryOption}` : ` (${selectedCategoryOption})`}
                          </span>
                        ) : null;
                      })()}
                    </span>
                  ) : (
                    <span className="text-gray-400 text-sm">Ninguno seleccionado</span>
                  )}
                </div>
              </div>

              <div>
                <label className="block font-semibold mb-2 text-sm">Observaciones (opcional):</label>
                <textarea
                  value={observations}
                  onChange={(e) => setObservations(e.target.value)}
                  rows={3}
                  className="w-full p-3 border-2 rounded focus:border-green-500 outline-none resize-y"
                  placeholder="Ej: sin cebolla, con papas fritas, etc."
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 bg-green-500 text-white font-bold rounded hover:bg-green-600 disabled:bg-gray-300 transition-colors"
              >
                {loading ? 'Registrando...' : 'Hacer Pedido'}
              </button>

              {message && (
                <div className={`p-3 rounded text-sm font-medium ${
                  isError ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'
                }`}>
                  {message}
                </div>
              )}
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
