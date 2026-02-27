"use client";

import { formatDishWithCategory, formatLocalTime } from "@/lib/utils";
import type { Order } from "@/lib/types";
import Link from "next/link";
import { useEffect, useState } from "react";

export const dynamic = 'force-dynamic';

export default function AdminSummaryPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [ordersOpen, setOrdersOpen] = useState(true);
  const [loading, setLoading] = useState(false);
  const [copyMessage, setCopyMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  const loadOrders = async () => {
    setLoading(true);
    const res = await fetch("/api/orders");
    const data = await res.json();
    if (data.success) setOrders(data.data);
    setLoading(false);
  };

  const loadStatus = async () => {
    const res = await fetch("/api/status");
    const data = await res.json();
    if (data.success) setOrdersOpen(data.data.status === "open");
  };

  useEffect(() => {
    loadOrders();
    loadStatus();
  }, []);

  const toggleOrders = async () => {
    const newStatus = !ordersOpen;
    await fetch("/api/status", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: newStatus ? "open" : "closed" }),
    });
    setOrdersOpen(newStatus);
  };

  const deleteOrder = async (orderId: number, personName: string) => {
    if (!confirm(`¿Estás seguro de borrar el pedido de ${personName}?`)) {
      return;
    }
    
    try {
      const res = await fetch(`/api/orders?id=${orderId}`, {
        method: "DELETE",
      });
      const data = await res.json();
      
      if (data.success) {
        await loadOrders();
      } else {
        setErrorMessage('Error al borrar el pedido');
        setTimeout(() => setErrorMessage(''), 3000);
      }
    } catch (error) {
      setErrorMessage('Error al borrar el pedido');
      setTimeout(() => setErrorMessage(''), 3000);
    }
  };

  const copyToClipboard = () => {
    // Agrupar pedidos considerando las observaciones
    const orderMap = new Map<string, number>();
    
    orders.forEach(order => {
      const dishWithCategory = formatDishWithCategory(order.category, order.dish);
      const key = order.observations 
        ? `${dishWithCategory} (${order.observations})`
        : dishWithCategory;
      orderMap.set(key, (orderMap.get(key) || 0) + 1);
    });

    // Formatear el texto
    const text = Array.from(orderMap.entries())
      .map(([key, count]) => `${count}x ${key}`)
      .join('\n');

    navigator.clipboard.writeText(text);
    setCopyMessage('¡Pedidos copiados al clipboard!');
    setTimeout(() => setCopyMessage(''), 3000);
  };

  const groupedOrders = orders.reduce((acc, order) => {
    const dishKey = formatDishWithCategory(order.category, order.dish);
    if (!acc[dishKey]) acc[dishKey] = [];
    acc[dishKey].push(order);
    return acc;
  }, {} as Record<string, Order[]>);

  return (
    <div className="max-w-6xl mx-auto p-8">
      <div className="bg-white rounded-lg shadow p-8">
        <h1 className="text-3xl font-bold mb-6">📋 Resumen de Pedidos</h1>

        <div className="flex justify-between items-center p-4 bg-gray-50 rounded mb-8">
          <label className="flex items-center gap-2">
            <input type="checkbox" checked={ordersOpen} onChange={toggleOrders} className="w-5 h-5" />
            <span
              className={`font-bold px-4 py-2 rounded ${
                ordersOpen ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"
              }`}
            >
              Pedidos {ordersOpen ? "ABIERTOS" : "CERRADOS"}
            </span>
          </label>
          <div className="flex gap-2">
            <button
              onClick={copyToClipboard}
              className="py-2 px-4 bg-blue-500 text-white font-bold rounded hover:bg-blue-600"
            >
              📋 Copiar pedidos
            </button>
            <button
              onClick={loadOrders}
              disabled={loading}
              className="py-2 px-4 bg-green-500 text-white font-bold rounded hover:bg-green-600 disabled:bg-gray-300"
            >
              {loading ? "Actualizando..." : "🔄 Actualizar"}
            </button>
          </div>
        </div>

        {copyMessage && (
          <div className="mb-4 p-4 rounded text-center font-medium bg-green-100 text-green-800">
            {copyMessage}
          </div>
        )}

        {errorMessage && (
          <div className="mb-4 p-4 rounded text-center font-medium bg-red-100 text-red-800">
            {errorMessage}
          </div>
        )}

        <div className="mb-8">
          <div className="text-center p-6 bg-gray-50 rounded border-2">
            <div className="text-5xl font-bold text-green-500">{orders.length}</div>
            <div className="text-sm text-gray-600 uppercase tracking-wide mt-2">Total de pedidos</div>
          </div>
        </div>

        <div className="mb-8">
          <h2 className="text-2xl font-bold mb-4">Pedidos agrupados por plato</h2>
          {Object.keys(groupedOrders).length === 0 ? (
            <p className="text-center py-8 text-gray-400 italic">No hay pedidos aún</p>
          ) : (
            (Object.entries(groupedOrders) as [string, Order[]][]).map(([dish, dishOrders]) => (
              <div key={dish} className="mb-4 p-4 bg-gray-50 rounded border-l-4 border-green-500">
                <h3 className="font-bold mb-3">
                  {dish} <span className="text-green-500">({dishOrders.length})</span>
                </h3>
                <ul className="space-y-2">
                  {dishOrders.map((order: Order) => (
                    <li key={order.id} className="flex justify-between items-center pb-2 border-b last:border-0">
                      <div className="flex items-center gap-3">
                        <button
                          onClick={() => deleteOrder(order.id, order.name)}
                          className="text-red-500 hover:text-red-700 transition-colors"
                          title="Borrar pedido"
                        >
                          🗑️
                        </button>
                        <span className="font-semibold">{order.name}</span>
                      </div>
                      {order.observations && <span className="text-gray-600 italic mx-4">{order.observations}</span>}
                      <span className="text-gray-400 text-sm">{formatLocalTime(order.created_at)}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))
          )}
        </div>

        <div className="pt-6 border-t flex gap-4">
          <Link href="/admin/menu" className="text-green-500 hover:underline">
            Cargar Nuevo Menú
          </Link>
          <Link href="/" className="text-green-500 hover:underline">
            Ver Menú
          </Link>
        </div>
      </div>
    </div>
  );
}
