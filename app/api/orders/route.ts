import { NextRequest, NextResponse } from 'next/server';
import { getOrders, saveOrder, deleteOrder } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const date = searchParams.get('date') || new Date().toISOString().split('T')[0];
    
    const orders = await getOrders(date);
    
    return NextResponse.json({ success: true, data: orders });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, dish, category, observations, date, force } = body;
    
    if (!name || !dish) {
      return NextResponse.json(
        { success: false, error: 'name and dish are required' },
        { status: 400 }
      );
    }
    
    const currentDate = date || new Date().toISOString().split('T')[0];
    
    // Verificar si ya existe un pedido con ese nombre hoy (a menos que force=true)
    if (!force) {
      const existingOrders = await getOrders(currentDate);
      const duplicateName = existingOrders.find(
        (order: any) => order.name.toLowerCase().trim() === name.toLowerCase().trim()
      );
      
      if (duplicateName) {
        return NextResponse.json(
          { 
            success: false, 
            error: 'DUPLICATE_NAME',
            existingOrder: {
              name: duplicateName.name,
              dish: duplicateName.dish,
              time: duplicateName.time
            }
          },
          { status: 409 }
        );
      }
    }
    
    const currentTime = new Date().toLocaleTimeString('es-AR', {
      hour: '2-digit',
      minute: '2-digit'
    });
    
    await saveOrder({
      date: currentDate,
      time: currentTime,
      name,
      dish,
      category,
      observations
    });
    
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const orderId = searchParams.get('id');
    
    if (!orderId) {
      return NextResponse.json(
        { success: false, error: 'Order ID is required' },
        { status: 400 }
      );
    }
    
    await deleteOrder(parseInt(orderId));
    
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
