'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

interface PreviousMenu {
  date: string;
  menu_json: { categories: { name: string; dishes: string[] }[] };
  menu_name?: string;
  created_at: string;
}

export default function AdminMenuPage() {
  const [menuText, setMenuText] = useState('');
  const [menuName, setMenuName] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [previousMenus, setPreviousMenus] = useState<PreviousMenu[]>([]);
  const router = useRouter();

  useEffect(() => {
    loadPreviousMenus();
  }, []);

  const loadPreviousMenus = async () => {
    const res = await fetch('/api/menu?action=unique');
    const data = await res.json();
    if (data.success) {
      setPreviousMenus(data.data);
    }
  };

  const loadPreviousMenu = (menu: PreviousMenu) => {
    // Convertir el JSON del menú de vuelta a texto
    const text = menu.menu_json.categories
      .map((cat) => {
        const categoryLine = cat.name;
        const dishes = cat.dishes.join('\n');
        return `${categoryLine}\n${dishes}`;
      })
      .join('\n');
    setMenuText(text);
    setMessage('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const res = await fetch('/api/menu', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ menuText, menuName: menuName.trim() || undefined })
    });
    const data = await res.json();
    if (data.success) {
      setMessage(`¡Menú cargado! ${data.data.categories} categorías, ${data.data.dishes} platos`);
      setMenuText('');
      setMenuName('');
      setTimeout(() => router.push('/'), 2000);
    } else {
      setMessage('Error: ' + data.error);
    }
    setLoading(false);
  };

  return (
    <div className="max-w-4xl mx-auto p-8">
      <div className="bg-white rounded-lg shadow p-8">
        <h1 className="text-4xl font-bold mb-2">🍽️ GoFeedMe - Cargar Menú</h1>
        <p className="text-gray-600 mb-8">Pegá el menú del día</p>

        <div className="mb-6">
          <h2 className="text-lg font-semibold mb-3 text-gray-700">📋 Menús anteriores</h2>
          {previousMenus.length === 0 ? (
            <p className="text-sm text-gray-500 italic">No hay menús anteriores guardados</p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {previousMenus.map((menu, index) => (
                <button
                  key={index}
                  onClick={() => loadPreviousMenu(menu)}
                  className="px-4 py-2 bg-blue-100 text-blue-700 rounded hover:bg-blue-200 text-sm font-medium transition-colors"
                  type="button"
                >
                  {menu.menu_name || `Menú del ${new Date(menu.date).toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit' })}`}
                </button>
              ))}
            </div>
          )}
        </div>

        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label className="block text-sm font-semibold mb-2 text-gray-700">
              Nombre del menú (opcional)
            </label>
            <input
              type="text"
              value={menuName}
              onChange={(e) => setMenuName(e.target.value)}
              placeholder="Ej: Menú Verano, Menú Invierno, etc."
              className="w-full p-3 border-2 rounded focus:border-green-500 outline-none"
              maxLength={100}
            />
          </div>
          <textarea
            value={menuText}
            onChange={(e) => setMenuText(e.target.value)}
            placeholder="Pegá el menú acá..."
            rows={20}
            required
            className="w-full p-4 border-2 rounded font-mono text-sm resize-y focus:border-green-500 outline-none"
          />
          <button
            type="submit"
            disabled={loading || !menuText.trim()}
            className="mt-4 w-full py-3 bg-green-500 text-white font-bold rounded hover:bg-green-600 disabled:bg-gray-300"
          >
            {loading ? 'Cargando...' : 'Cargar Menú'}
          </button>
        </form>

        {message && (
          <div className={`mt-4 p-4 rounded text-center ${
            message.includes('Error') ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'
          }`}>
            {message}
          </div>
        )}

        <div className="mt-8 pt-6 border-t flex gap-4">
          <Link href="/" className="text-green-500 hover:underline">Ver Menú</Link>
          <Link href="/admin/resumen" className="text-green-500 hover:underline">Ver Resumen</Link>
        </div>
      </div>
    </div>
  );
}
