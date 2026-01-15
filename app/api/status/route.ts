import { NextRequest, NextResponse } from 'next/server';
import { getOrdersStatus, setOrdersStatus } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const date = searchParams.get('date') || new Date().toISOString().split('T')[0];
    
    const status = await getOrdersStatus(date);
    
    return NextResponse.json({ success: true, data: { status } });
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
    const { status, date } = body;
    
    if (!status || !['open', 'closed'].includes(status)) {
      return NextResponse.json(
        { success: false, error: 'status must be "open" or "closed"' },
        { status: 400 }
      );
    }
    
    const currentDate = date || new Date().toISOString().split('T')[0];
    
    await setOrdersStatus(currentDate, status);
    
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
