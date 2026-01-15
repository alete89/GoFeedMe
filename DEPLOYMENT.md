# 🚀 Deployment en Vercel

Esta guía te ayuda a deployar GoFeedMe en Vercel con Vercel Postgres.

## ✅ Pre-requisitos

- Cuenta en [Vercel](https://vercel.com)
- Repositorio en GitHub/GitLab/Bitbucket
- Node.js 18+ instalado localmente

## 📦 Deployment Paso a Paso

### 1. Preparar el repositorio

Asegúrate de que estos archivos estén en tu repo:

```bash
✅ vercel.json
✅ package.json
✅ next.config.ts
✅ sql/schema.sql
✅ sql/001_increase_varchar_limits.sql
✅ sql/002_add_menu_name.sql
✅ sql/003_remove_date_unique.sql
```

### 2. Crear proyecto en Vercel

#### Opción A: Desde el Dashboard

1. Ve a [vercel.com/new](https://vercel.com/new)
2. Importa tu repositorio
3. Configura el proyecto:
   - **Framework Preset**: Next.js (auto-detectado)
   - **Root Directory**: `./`
   - **Build Command**: `npm run build`
   - **Output Directory**: `.next`

#### Opción B: Desde CLI

```bash
# Instalar Vercel CLI
npm i -g vercel

# Login
vercel login

# Deploy
vercel
```

### 3. Agregar Vercel Postgres

1. En tu proyecto de Vercel, ve a **Storage**
2. Click en **Create Database**
3. Selecciona **Postgres**
4. Elige una región (preferentemente cerca de tus usuarios)
5. Click **Create**

Vercel automáticamente agregará estas variables de entorno:
- `POSTGRES_URL`
- `POSTGRES_URL_NON_POOLING`
- `POSTGRES_PRISMA_URL`
- `POSTGRES_URL_NO_SSL`
- `POSTGRES_USER`
- `POSTGRES_HOST`
- `POSTGRES_PASSWORD`
- `POSTGRES_DATABASE`

### 4. Ejecutar Scripts SQL

#### Opción A: Desde Vercel Dashboard

1. Ve a **Storage** > Tu database > **Data** > **Query**
2. Ejecuta los scripts en este orden:

```sql
-- 1. Schema inicial
-- Copia y pega el contenido de sql/schema.sql

-- 2. Migración 001
-- Copia y pega el contenido de sql/001_increase_varchar_limits.sql

-- 3. Migración 002
-- Copia y pega el contenido de sql/002_add_menu_name.sql

-- 4. Migración 003
-- Copia y pega el contenido de sql/003_remove_date_unique.sql
```

#### Opción B: Desde CLI con psql

```bash
# Obtener la connection string desde Vercel
# Dashboard > Storage > tu database > .env.local

# Ejecutar scripts
psql "postgres://..." -f sql/schema.sql
psql "postgres://..." -f sql/001_increase_varchar_limits.sql
psql "postgres://..." -f sql/002_add_menu_name.sql
psql "postgres://..." -f sql/003_remove_date_unique.sql
```

### 5. Re-deploy

Después de configurar la base de datos:

```bash
# Desde CLI
vercel --prod

# O desde Dashboard
# Deployments > ... > Redeploy
```

## ✅ Verificar el Deployment

1. **Página principal**: `https://tu-app.vercel.app`
   - Deberías ver "No hay menú cargado todavía"

2. **Cargar menú**: `https://tu-app.vercel.app/admin/menu`
   - Carga un menú de prueba
   - Verifica que se guarde correctamente

3. **Hacer pedido**: Vuelve a la página principal
   - Deberías ver el menú cargado
   - Haz un pedido de prueba

4. **Ver resumen**: `https://tu-app.vercel.app/admin/resumen`
   - Verifica que aparezca tu pedido

## 🔧 Configuración Avanzada

### Variables de Entorno Adicionales

Si necesitas configuraciones especiales:

```bash
# Desde CLI
vercel env add NOMBRE_VARIABLE

# O desde Dashboard
Settings > Environment Variables
```

### Configurar Dominios Personalizados

1. Ve a **Settings** > **Domains**
2. Agrega tu dominio
3. Sigue las instrucciones de DNS

### Preview Deployments

Cada push a una rama que no sea `main` crea un preview deployment automático con su propia URL.

## 🐛 Troubleshooting

### Error: "No Output Directory named 'dist' found"

✅ **Solución**: El archivo `vercel.json` debería tener:

```json
{
  "framework": "nextjs",
  "outputDirectory": ".next"
}
```

### Error: "relation 'menus' does not exist"

❌ **Causa**: No se ejecutaron los scripts SQL

✅ **Solución**: Ejecuta `sql/schema.sql` en tu base de datos (ver paso 4)

### Error: "value too long for type character varying(10)"

❌ **Causa**: No se ejecutó la migración 001

✅ **Solución**: Ejecuta `sql/001_increase_varchar_limits.sql`

### Error: "Failed to connect to database"

❌ **Causa**: Variables de entorno no configuradas

✅ **Solución**: 
1. Verifica que la base de datos esté vinculada al proyecto
2. Las variables deben estar en **Production** environment
3. Re-deploy después de agregar variables

### Build funciona local pero falla en Vercel

1. Verifica que todas las dependencias estén en `package.json`
2. Revisa los logs de build en Vercel
3. Asegúrate de que `next.config.ts` sea válido
4. Verifica que no haya errores de TypeScript

```bash
# Probar build localmente
npm run build
```

### La app se ve en blanco

1. Abre la consola del navegador (F12)
2. Revisa errores de JavaScript
3. Verifica que las rutas de API funcionen:
   - `https://tu-app.vercel.app/api/menu`
   - `https://tu-app.vercel.app/api/status`

## 📊 Monitoreo

### Ver Logs

```bash
# Desde CLI
vercel logs

# O desde Dashboard
Project > Logs
```

### Analytics

Vercel incluye analytics básicos gratis:
- **Project** > **Analytics**
- Ve pageviews, requests, y errores

### Function Logs

Para ver logs de las API routes:
- **Project** > **Functions**
- Click en una función para ver sus logs

## 🔄 Actualizar la App

### Deploy Cambios

```bash
# Commitear cambios
git add .
git commit -m "Descripción de cambios"
git push origin main

# Vercel auto-deploya desde main
```

### Nuevas Migraciones SQL

Cuando agregues una nueva migración:

1. Crea el archivo `sql/00X_nombre_migracion.sql`
2. Ejecuta el script en producción (paso 4)
3. Commitea el archivo al repo
4. Deploy normalmente

## 🔐 Seguridad

### Mejores Prácticas

- ✅ Las rutas `/admin/*` deberían tener autenticación (próxima versión)
- ✅ Usa HTTPS (Vercel lo provee automáticamente)
- ✅ No commitees `.env` o `.env.local` al repo
- ✅ Limita quién puede acceder a la base de datos en Vercel

### Rate Limiting

Considera agregar rate limiting si la app es pública. Vercel Pro incluye protección DDoS.

## 💰 Costos

### Plan Hobby (Gratis)
- ✅ Hosting ilimitado
- ✅ 100 GB bandwidth
- ✅ Serverless Functions
- ✅ 60 GB-hours de Postgres Compute
- ✅ 256 MB de Postgres Storage

### Plan Pro ($20/mes)
- Todo lo del Hobby
- Sin límites de bandwidth
- Más compute time
- Analytics avanzados

Para un equipo pequeño (~50 usuarios), el plan gratis debería ser suficiente.

## 📞 Soporte

### Recursos

- [Documentación de Vercel](https://vercel.com/docs)
- [Next.js Docs](https://nextjs.org/docs)
- [Vercel Postgres Docs](https://vercel.com/docs/storage/vercel-postgres)

### Problemas Comunes

Ver [BUILD_CHECKLIST.md](BUILD_CHECKLIST.md) para un checklist completo de troubleshooting.
