import { NextRequest, NextResponse } from 'next/server';
import { getMenu, saveMenu, getUniqueMenus, saveMenuFromMaster, deleteMasterMenu } from '@/lib/db';
import { parseMenu } from '@/lib/menuParser';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const action = searchParams.get('action');
    
    if (action === 'unique') {
      const menus = await getUniqueMenus();
      return NextResponse.json({ success: true, data: menus });
    }
    
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
    const { menuText, date, menuName, masterMenuId } = body;
    
    const currentDate = date || new Date().toISOString().split('T')[0];
    
    // Si se proporciona un masterMenuId, usar ese menú maestro
    if (masterMenuId) {
      await saveMenuFromMaster(currentDate, masterMenuId);
      return NextResponse.json({
        success: true,
        data: { message: 'Menú asignado desde menú maestro' }
      });
    }
    
    // Si no, parsear el texto del menú y crear/reusar menú maestro
    if (!menuText) {
      return NextResponse.json(
        { success: false, error: 'menuText or masterMenuId is required' },
        { status: 400 }
      );
    }
    
    const parsedMenu = parseMenu(menuText);
    
    await saveMenu(currentDate, parsedMenu, menuName);
    
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

export async function DELETE(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const masterMenuId = searchParams.get('id');
    
    if (!masterMenuId) {
      return NextResponse.json(
        { success: false, error: 'Master menu ID is required' },
        { status: 400 }
      );
    }
    
    await deleteMasterMenu(parseInt(masterMenuId));
    
    return NextResponse.json({
      success: true,
      message: 'Menu deleted successfully'
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
