import { NextRequest, NextResponse } from 'next/server';
import { getOrders, deleteOrder } from '@/lib/db';
import { placeOrder } from '@/lib/orderService';

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
    const { name, dish, option, category_option, category, observations, date, force } = body;

    const result = await placeOrder({
      name,
      dish,
      option,
      category_option,
      observations,
      date,
      force,
    });

    if (!result.success) {
      const statusMap: Record<string, number> = {
        MISSING_FIELDS: 400,
        CLOSED: 403,
        NO_MENU: 404,
        DISH_NOT_FOUND: 404,
        OPTION_REQUIRED: 400,
        INVALID_OPTION: 400,
        CATEGORY_OPTION_REQUIRED: 400,
        INVALID_CATEGORY_OPTION: 400,
        DUPLICATE_NAME: 409,
      };
      const status = statusMap[result.errorCode || ''] || 400;

      // Keep backward-compatible response shape for DUPLICATE_NAME
      if (result.errorCode === 'DUPLICATE_NAME') {
        return NextResponse.json(
          {
            success: false,
            error: result.errorCode,
            message: result.error,
            existingOrder: result.errorData?.existingOrder,
          },
          { status }
        );
      }

      return NextResponse.json(
        {
          success: false,
          error: result.errorCode,
          message: result.error,
          ...(result.errorData || {}),
        },
        { status }
      );
    }

    return NextResponse.json({ success: true, order: result.order });
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
