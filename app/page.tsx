'use client';

import { useState, useEffect } from 'react';

export const dynamic = 'force-dynamic';

interface Dish {
  id: string;
  name: string;
  description: string;
}

interface Menu {
  categories: { name: string; notes?: string; dishes: Dish[] }[];
}

export default function Home() {
  const [menu, setMenu] = useState<Menu | null>(null);
  const [name, setName] = useState('');
  const [selectedDishId, setSelectedDishId] = useState('');
  const [selectedDishName, setSelectedDishName] = useState('');
  const [observations, setObservations] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [isError, setIsError] = useState(false);
  const [ordersOpen, setOrdersOpen] = useState(true);

  useEffect(() => {
    loadMenu();
    checkStatus();
  }, []);

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedDishId) {
      setMessage('Por favor seleccioná un plato');
      setIsError(true);
      return;
    }
    
    setLoading(true);
    try {
      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, dish: selectedDishName, observations })
      });
      const data = await res.json();
      if (data.success) {
        setMessage('¡Pedido registrado!');
        setIsError(false);
        setName('');
        setSelectedDishId('');
        setSelectedDishName('');
        setObservations('');
      } else {
        setMessage(data.error || 'Error al registrar el pedido');
        setIsError(true);
      }
    } catch (error) {
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
    <div className="max-w-2xl mx-auto p-8">
      <div className="bg-white rounded-lg shadow p-8">
        <div className="flex justify-between items-center mb-2">
          <h1 className="text-4xl font-bold text-gray-800">🍽️ GoFeedMe</h1>
          <a 
            href="/admin/resumen" 
            className="text-sm text-blue-600 hover:text-blue-800 hover:underline"
          >
            Ver resumen de pedidos
          </a>
        </div>
        <p className="text-gray-600 mb-8">Elegí tu almuerzo de hoy</p>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block font-semibold mb-2">Tu nombre:</label>
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
            <label className="block font-semibold mb-2">Elegí tu plato:</label>
            <div className="space-y-2">
              {menu.categories.map((cat) => (
                <div key={cat.name}>
                  <h3 className="font-bold text-lg mb-2 text-gray-700">{cat.name}</h3>
                  {cat.notes && (
                    <div className="mb-3 p-3 bg-blue-50 border-l-4 border-blue-400 text-sm text-blue-800">
                      <span className="font-medium">ℹ️ </span>{cat.notes}
                    </div>
                  )}
                  <div className="space-y-2 mb-4">
                    {cat.dishes.map((dish) => (
                      <button
                        key={dish.id}
                        type="button"
                        onClick={() => {
                          setSelectedDishId(dish.id);
                          setSelectedDishName(dish.name);
                        }}
                        className={`w-full text-left p-4 border-2 rounded transition-all ${
                          selectedDishId === dish.id
                            ? 'border-green-500 bg-green-50'
                            : 'border-gray-200 hover:border-green-300 hover:bg-gray-50'
                        }`}
                      >
                        <div className="font-semibold text-gray-900">{dish.name}</div>
                        {dish.description && (
                          <div className="text-sm text-gray-600 mt-1">{dish.description}</div>
                        )}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
            {!selectedDishId && (
              <p className="text-sm text-red-500 mt-2">* Seleccioná un plato para continuar</p>
            )}
          </div>

          <div>
            <label className="block font-semibold mb-2">Observaciones (opcional):</label>
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
            className="w-full py-3 bg-green-500 text-white font-bold rounded hover:bg-green-600 disabled:bg-gray-300"
          >
            {loading ? 'Registrando...' : 'Hacer Pedido'}
          </button>
        </form>

        {message && (
          <div className={`mt-4 p-4 rounded text-center font-medium ${
            isError ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'
          }`}>
            {message}
          </div>
        )}
      </div>
    </div>
  );
}
