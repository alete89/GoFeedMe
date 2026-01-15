import { NextRequest, NextResponse } from 'next/server';
import { getOrders, saveOrder } from '@/lib/db';

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
    const { name, dish, observations, date } = body;
    
    if (!name || !dish) {
      return NextResponse.json(
        { success: false, error: 'name and dish are required' },
        { status: 400 }
      );
    }
    
    const currentDate = date || new Date().toISOString().split('T')[0];
    const currentTime = new Date().toLocaleTimeString('es-AR', {
      hour: '2-digit',
      minute: '2-digit'
    });
    
    await saveOrder({
      date: currentDate,
      time: currentTime,
      name,
      dish,
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
