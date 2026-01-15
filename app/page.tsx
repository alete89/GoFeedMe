'use client';

import { useState, useEffect } from 'react';

export const dynamic = 'force-dynamic';

interface Menu {
  categories: { name: string; dishes: string[] }[];
}

export default function Home() {
  const [menu, setMenu] = useState<Menu | null>(null);
  const [name, setName] = useState('');
  const [selectedDish, setSelectedDish] = useState('');
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
    setLoading(true);
    try {
      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, dish: selectedDish, observations })
      });
      const data = await res.json();
      if (data.success) {
        setMessage('¡Pedido registrado!');
        setIsError(false);
        setName('');
        setSelectedDish('');
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
          <h1 className="text-3xl font-bold mb-4 text-gray-800">🍽️ GoFeedMe</h1>
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
          <h1 className="text-3xl font-bold mb-4 text-gray-800">🍽️ GoFeedMe</h1>
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
          <h1 className="text-3xl font-bold text-gray-800">🍽️ GoFeedMe</h1>
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
            <select
              value={selectedDish}
              onChange={(e) => setSelectedDish(e.target.value)}
              required
              className="w-full p-3 border-2 rounded focus:border-green-500 outline-none"
            >
              <option value="">-- Seleccioná un plato --</option>
              {menu.categories.map((cat) => (
                <optgroup key={cat.name} label={cat.name}>
                  {cat.dishes.map((dish) => (
                    <option key={dish} value={dish}>{dish}</option>
                  ))}
                </optgroup>
              ))}
            </select>
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
