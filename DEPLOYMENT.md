# Deployment en Vercel

## Variables de entorno necesarias

Para que la aplicación funcione en Vercel, necesitás configurar las siguientes variables de entorno en el dashboard de Vercel:

### Postgres (Vercel Postgres)
Si usás Vercel Postgres, se configuran automáticamente al vincular la base de datos:
- `POSTGRES_URL`
- `POSTGRES_URL_NON_POOLING`
- `POSTGRES_USER`
- `POSTGRES_HOST`
- `POSTGRES_PASSWORD`
- `POSTGRES_DATABASE`

### Otras bases de datos
Si usás otra base de datos PostgreSQL:
- `POSTGRES_URL` - La URL completa de conexión a tu base de datos

## Setup de la base de datos

1. Ejecutá el script de schema inicial:
   ```sql
   -- Ver archivo sql/schema.sql
   ```

2. Ejecutá las migraciones en orden:
   ```sql
   -- Ver archivos sql/001_*.sql, 002_*.sql, etc.
   ```

## Build Configuration

- **Framework Preset**: Next.js
- **Build Command**: `npm run build` (o `next build`)
- **Output Directory**: `.next`
- **Install Command**: `npm install`

## Troubleshooting

### Error: "relation does not exist"
Las tablas no están creadas. Ejecutá los scripts SQL en tu base de datos.

### Error: "value too long for type character varying"
Ejecutá la migración `001_increase_varchar_limits.sql`.

### Error de conexión a la base de datos
Verificá que las variables de entorno estén configuradas correctamente en Vercel.
