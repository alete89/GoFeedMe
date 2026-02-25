'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

interface Dish {
  id: string;
  name: string;
  description: string;
  options?: string[];
  usesCategoryOptions?: boolean;
}

interface PreviousMenu {
  id: number;
  menu_json: { 
    categories: { 
      name: string; 
      notes?: string; 
      categoryOptions?: {
        label: string;
        options: string[];
      };
      dishes: Dish[] 
    }[] 
  };
  menu_name: string;
  created_at: string;
}

export default function AdminMenuPage() {
  const [menuText, setMenuText] = useState('');
  const [menuName, setMenuName] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [previousMenus, setPreviousMenus] = useState<PreviousMenu[]>([]);
  const [selectedMode, setSelectedMode] = useState<'new' | 'existing'>('existing');
  const [selectedMasterMenuId, setSelectedMasterMenuId] = useState<number | null>(null);
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

  const deleteMasterMenu = async (menuId: number) => {
    if (!confirm('¿Estás seguro de eliminar este menú? Se borrarán también todas las referencias.')) {
      return;
    }
    
    const res = await fetch(`/api/menu?id=${menuId}`, {
      method: 'DELETE',
    });
    const data = await res.json();
    
    if (data.success) {
      setMessage('Menú eliminado correctamente');
      loadPreviousMenus(); // Recargar la lista
      setTimeout(() => setMessage(''), 3000);
    } else {
      setMessage('Error al eliminar: ' + data.error);
    }
  };

  const loadPreviousMenu = (menu: PreviousMenu) => {
    // Convertir el JSON del menú de vuelta a formato markdown
    const text = menu.menu_json.categories
      .map((cat) => {
        const categoryLine = `## ${cat.name}`;
        const notes = cat.notes ? `\n> ${cat.notes}` : '';
        const categoryOptions = cat.categoryOptions 
          ? `\n\n> ${cat.categoryOptions.label}:\n` + 
            cat.categoryOptions.options.map(opt => `> - ${opt}`).join('\n')
          : '';
        const dishes = cat.dishes
          .map((dish) => {
            const dishTitle = `### ${dish.name}${dish.usesCategoryOptions ? '*' : ''}`;
            const options = dish.options && dish.options.length > 0 
              ? '\n' + dish.options.map(opt => `- ${opt}`).join('\n')
              : '';
            const description = dish.description ? `\n${dish.description}` : '';
            return `${dishTitle}${options}${description}`;
          })
          .join('\n\n');
        return `${categoryLine}${notes}${categoryOptions}\n\n${dishes}`;
      })
      .join('\n\n');
    setMenuText(text);
    setMessage('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    let body;
    if (selectedMode === 'existing' && selectedMasterMenuId) {
      // Usar menú existente
      body = { masterMenuId: selectedMasterMenuId };
    } else {
      // Crear nuevo menú
      body = { menuText, menuName: menuName.trim() || undefined };
    }
    
    const res = await fetch('/api/menu', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });
    const data = await res.json();
    if (data.success) {
      if (selectedMode === 'existing') {
        setMessage('¡Menú asignado correctamente!');
      } else {
        setMessage(`¡Menú cargado! ${data.data.categories} categorías, ${data.data.dishes} platos`);
      }
      setMenuText('');
      setMenuName('');
      setSelectedMasterMenuId(null);
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
        <p className="text-gray-600 mb-8">Asigná un menú existente o cargá uno nuevo</p>

        {/* Selector de modo */}
        <div className="mb-6 flex gap-4">
          <button
            type="button"
            onClick={() => {
              setSelectedMode('existing');
              setMenuText('');
              setMessage('');
            }}
            className={`flex-1 py-3 px-4 rounded font-medium transition-colors ${
              selectedMode === 'existing'
                ? 'bg-green-500 text-white'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            📋 Usar Menú Existente
          </button>
          <button
            type="button"
            onClick={() => {
              setSelectedMode('new');
              setSelectedMasterMenuId(null);
              setMessage('');
            }}
            className={`flex-1 py-3 px-4 rounded font-medium transition-colors ${
              selectedMode === 'new'
                ? 'bg-green-500 text-white'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            ✨ Crear Menú Nuevo
          </button>
        </div>

        {selectedMode === 'existing' && (
          <div className="mb-6">
            <h2 className="text-lg font-semibold mb-3 text-gray-700">Seleccioná un menú</h2>
            {previousMenus.length === 0 ? (
              <p className="text-sm text-gray-500 italic">No hay menús guardados</p>
            ) : (
              <div className="grid grid-cols-1 gap-2">
                {previousMenus.map((menu) => (
                  <div
                    key={menu.id}
                    className={`flex items-center gap-2 p-4 rounded transition-colors ${
                      selectedMasterMenuId === menu.id
                        ? 'bg-green-100 border-2 border-green-500'
                        : 'bg-blue-50 border-2 border-blue-200'
                    }`}
                  >
                    <button
                      onClick={() => {
                        setSelectedMasterMenuId(menu.id);
                        setMessage('');
                      }}
                      className="flex-1 text-left hover:opacity-80"
                      type="button"
                    >
                      <div className="font-semibold text-blue-900">{menu.menu_name}</div>
                      <div className="text-sm text-gray-600 mt-1">
                        {menu.menu_json.categories.length} categorías, {' '}
                        {menu.menu_json.categories.reduce((acc, cat) => acc + cat.dishes.length, 0)} platos
                      </div>
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteMasterMenu(menu.id);
                      }}
                      className="p-2 text-red-500 hover:bg-red-100 rounded transition-colors"
                      type="button"
                      title="Eliminar menú"
                    >
                      🗑️
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {selectedMode === 'new' && (
          <>
            <div className="mb-6">
              <h2 className="text-lg font-semibold mb-3 text-gray-700">📋 Vista previa de menús guardados</h2>
              {previousMenus.length === 0 ? (
                <p className="text-sm text-gray-500 italic">No hay menús guardados</p>
              ) : (
                <div className="space-y-2">
                  {previousMenus.map((menu) => (
                    <div key={menu.id} className="flex items-center gap-2">
                      <button
                        onClick={() => loadPreviousMenu(menu)}
                        className="flex-1 px-4 py-2 bg-blue-100 text-blue-700 rounded hover:bg-blue-200 text-sm font-medium transition-colors text-left"
                        type="button"
                      >
                        {menu.menu_name}
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          deleteMasterMenu(menu.id);
                        }}
                        className="p-2 text-red-500 hover:bg-red-100 rounded transition-colors"
                        type="button"
                        title="Eliminar menú"
                      >
                        🗑️
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}

        <form onSubmit={handleSubmit}>
          {selectedMode === 'new' && (
            <>
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
            </>
          )}
          <button
            type="submit"
            disabled={
              loading || 
              (selectedMode === 'new' && !menuText.trim()) ||
              (selectedMode === 'existing' && !selectedMasterMenuId)
            }
            className="mt-4 w-full py-3 bg-green-500 text-white font-bold rounded hover:bg-green-600 disabled:bg-gray-300"
          >
            {loading 
              ? 'Cargando...' 
              : selectedMode === 'existing' 
                ? 'Asignar Menú para Hoy' 
                : 'Cargar Menú Nuevo'
            }
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
