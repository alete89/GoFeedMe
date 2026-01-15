import { NextRequest, NextResponse } from 'next/server';
import { getMenu, saveMenu } from '@/lib/db';
import { parseMenu } from '@/lib/menuParser';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const date = searchParams.get('date') || new Date().toISOString().split('T')[0];
    
    const menu = await getMenu(date);
    
    return NextResponse.json({ success: true, data: menu });
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
    const { menuText, date } = body;
    
    if (!menuText) {
      return NextResponse.json(
        { success: false, error: 'menuText is required' },
        { status: 400 }
      );
    }
    
    const currentDate = date || new Date().toISOString().split('T')[0];
    const parsedMenu = parseMenu(menuText);
    
    await saveMenu(currentDate, parsedMenu);
    
    return NextResponse.json({
      success: true,
      data: {
        categories: parsedMenu.categories.length,
        dishes: parsedMenu.categories.reduce((acc, cat) => acc + cat.dishes.length, 0)
      }
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
