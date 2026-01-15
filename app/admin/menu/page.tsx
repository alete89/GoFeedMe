'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export const dynamic = 'force-dynamic';

export default function AdminMenuPage() {
  const [menuText, setMenuText] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const res = await fetch('/api/menu', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ menuText })
    });
    const data = await res.json();
    if (data.success) {
      setMessage(`¡Menú cargado! ${data.data.categories} categorías, ${data.data.dishes} platos`);
      setMenuText('');
      setTimeout(() => router.push('/'), 2000);
    } else {
      setMessage('Error: ' + data.error);
    }
    setLoading(false);
  };

  return (
    <div className="max-w-4xl mx-auto p-8">
      <div className="bg-white rounded-lg shadow p-8">
        <h1 className="text-3xl font-bold mb-2">🍽️ GoFeedMe - Cargar Menú</h1>
        <p className="text-gray-600 mb-8">Pegá el menú del día</p>

        <form onSubmit={handleSubmit}>
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
          <a href="/" className="text-green-500 hover:underline">Ver Menú</a>
          <a href="/admin/resumen" className="text-green-500 hover:underline">Ver Resumen</a>
        </div>
      </div>
    </div>
  );
}
