# 🍽️ GoFeedMe
**Producción:** https://go-feed-me.vercel.app/
Aplicación web para gestionar pedidos de almuerzo en empresas. Permite cargar menús diarios, que los usuarios elijan sus platos, y ver un resumen de todos los pedidos.

## ✨ Características

- **Carga de menús**: Parser automático de menús en formato de texto
- **Menús reutilizables**: Guarda menús con nombres para reutilizarlos fácilmente
- **Pedidos de usuarios**: Interfaz simple para que cada empleado haga su pedido
- **Resumen administrativo**: Vista consolidada de todos los pedidos del día
- **Control de estado**: Abrir/cerrar ventana de pedidos
- **Exportar pedidos**: Copia todos los pedidos en formato optimizado para WhatsApp/Telegram
- **Base de datos Postgres**: Persistencia real con Vercel Postgres

## 🚀 Inicio Rápido

### Desarrollo Local

```bash
# Instalar dependencias
npm install

# Configurar base de datos (ver sección Database Setup)
# Ejecutar los scripts SQL en orden

# Iniciar servidor de desarrollo
npm run dev
```

La aplicación estará disponible en `http://localhost:3000`

### Rutas disponibles

- `/` - Pantalla de usuario para hacer pedidos
- `/admin/menu` - Pantalla para cargar el menú del día
- `/admin/resumen` - Resumen de todos los pedidos

## 🗄️ Database Setup

### 1. Crear la base de datos

Puedes usar Vercel Postgres, o cualquier base de datos PostgreSQL.

### 2. Ejecutar los scripts SQL en orden

```bash
# 1. Schema inicial
psql -d tu_database -f sql/schema.sql

# 2. Migraciones (si actualizas una DB existente)
psql -d tu_database -f sql/001_increase_varchar_limits.sql
psql -d tu_database -f sql/002_add_menu_name.sql
psql -d tu_database -f sql/003_remove_date_unique.sql
psql -d tu_database -f sql/004_create_master_menus.sql
psql -d tu_database -f sql/005_add_category_to_orders.sql
```

### 3. Configurar variables de entorno

Crear archivo `.env.local` en la raíz:

```bash
# Para Vercel Postgres
POSTGRES_URL="postgres://..."
POSTGRES_URL_NON_POOLING="postgres://..."

# O cualquier otra base Postgres
DATABASE_URL="postgresql://user:password@host:port/database"
```

## 🎨 Uso

### Como Administrador

1. **Cargar el menú** (`/admin/menu`):
   - Opcionalmente darle un nombre al menú (ej: "Menú Verano")
   - Pegar el texto completo del menú del restaurante
   - El parser automáticamente detectará categorías y platos
   - El menú se guarda y está listo para usar
   - Los menús anteriores aparecen como botones para reutilizarlos

2. **Ver resumen** (`/admin/resumen`):
   - Ver todos los pedidos agrupados por plato
   - Abrir/cerrar ventana de pedidos
   - Copiar todos los pedidos al clipboard en formato optimizado
   - Actualizar en tiempo real

### Como Usuario

1. Ir a la página principal (`/`)
2. Ingresar tu nombre
3. Seleccionar el plato deseado del menú
4. Agregar observaciones (opcional)
5. Confirmar pedido

## 🏗️ Estructura del Proyecto

```
GoFeedMe/
├── app/                    # Next.js App Router
│   ├── page.tsx           # Página principal (usuarios)
│   ├── layout.tsx         # Layout global
│   ├── globals.css        # Estilos globales
│   ├── admin/
│   │   ├── menu/
│   │   │   └── page.tsx   # Cargar menú
│   │   └── resumen/
│   │       └── page.tsx   # Resumen de pedidos
│   └── api/               # API Routes
│       ├── menu/
│       ├── orders/
│       └── status/
├── lib/
│   ├── db.ts              # Funciones de base de datos
│   └── menuParser.ts      # Parser de menús
├── sql/                    # Scripts SQL
│   ├── schema.sql         # Schema inicial
│   └── 00X_*.sql          # Migraciones
├── ejemplo-menu.md         # Ejemplo de formato de menú (markdown)
└── README.md
```

## 📦 Deployment

Ver [DEPLOYMENT.md](DEPLOYMENT.md) para instrucciones detalladas de deployment en Vercel.

**URL de producción:** https://go-feed-me.vercel.app/

## 🤖 MCP (Model Context Protocol)

La app expone un servidor MCP en `/mcp` compatible con clientes como Claude Desktop o VS Code Copilot.

JSON de configuración:

```json
{
  "mcpServers": {
    "GoFeedMe": {
      "type": "http",
      "url": "https://go-feed-me.vercel.app/mcp"
    }
  }
}
```

Tools disponibles: `get_menu`, `get_orders`, `get_orders_status`, `place_order`.

## 🛠️ Tecnologías

- **Frontend**: Next.js 16 con React 19
- **Styling**: Tailwind CSS 4
- **Database**: PostgreSQL (Vercel Postgres)
- **TypeScript**: Tipado completo
- **Deploy**: Vercel

## 📝 Formato del Menú

El parser acepta menús en formato markdown estándar. A continuación se detallan todos los elementos soportados:

### Elementos del formato

#### 1. Categorías
Usar `##` para definir categorías. Se pueden incluir emojis:
```markdown
## Ensaladas :green_salad:
## Platos Principales :stew:
```

#### 2. Notas de categoría
Usar blockquotes (`>`) para agregar notas informativas a la categoría:
```markdown
## Pasta :spaghetti:

> Todas las pastas son caseras
```

#### 3. Opciones de categoría
Usar blockquotes con listas para definir opciones que se aplican a múltiples platos:
```markdown
## Pasta :spaghetti:

> Salsas:
> - Filetto
> - Bechamel
> - Bolognesa
> - Pesto
```

#### 4. Platos simples
Usar `###` para definir platos:
```markdown
### POLLO GRILLADO
Pechuga a la parrilla con guarnición de ensalada mixta
```

#### 5. Platos con opciones propias
Agregar una lista inmediatamente después del nombre del plato:
```markdown
### MILANESA
- Ternera
- Pollo
- Berenjena

Con lechuga, tomate y mayonesa
```

#### 6. Platos que usan opciones de categoría
Agregar un asterisco (`*`) al final del nombre para que use las opciones definidas en la categoría:
```markdown
### RAVIOLES*
- De espinaca y ricota
- De jamón y queso
```

En este caso el usuario deberá elegir:
1. La variante del plato (De espinaca o De jamón)
2. La salsa de la categoría (Filetto, Bechamel, etc.)

### Ejemplo completo

```markdown
## Pasta :spaghetti:

> Salsas:
> - Filetto
> - Bechamel
> - Bolognesa

### RAVIOLES*
- De espinaca y ricota
- De jamón y queso

### ÑOQUIS*
- De papa
- De espinaca

### LASAGNA
Lasagna de carne con salsa bolognesa casera
```

**Resultado:**
- RAVIOLES y ÑOQUIS tendrán radio buttons para elegir variante + salsa
- LASAGNA solo mostrará la descripción (no usa salsas)

Ver [`ejemplo-menu.md`](ejemplo-menu.md) para un ejemplo completo y funcional.

## 🤝 Contribuir

Mejoras sugeridas:

- [ ] Autenticación de usuarios
- [ ] Historial de pedidos por usuario
- [ ] Estadísticas de platos más pedidos
- [ ] Notificaciones cuando se cierra el pedido
- [ ] Soporte para múltiples restaurantes
- [ ] Modo oscuro

## 📄 Licencia

MIT
