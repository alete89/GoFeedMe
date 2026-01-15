# Checklist para deployment en Vercel

## ✅ Cosas que revisé y corregí:

1. **Tipos de TypeScript**
   - ✅ Eliminé todos los usos de `any`
   - ✅ Agregué interfaces apropiadas (Order, MenuJson)
   - ✅ Todas las páginas compilan sin errores de tipos

2. **Configuración de Next.js**
   - ✅ Agregué `export const dynamic = 'force-dynamic'` a todas las páginas client-side
   - ✅ Las rutas de API están correctamente configuradas como dinámicas
   - ✅ El build local funciona perfectamente

3. **Manejo de Links**
   - ✅ Reemplacé `<a>` con `<Link>` de Next.js donde corresponde

4. **Base de datos**
   - ✅ Tipos correctos en db.ts
   - ✅ Schema SQL actualizado y organizado en carpeta sql/
   - ✅ Migración 001 creada para aumentar límites de VARCHAR

## 🔍 Cosas que verificar en Vercel:

### 1. Variables de entorno
Ir a Project Settings > Environment Variables y verificar:
- [ ] `POSTGRES_URL` está configurada
- [ ] Otras variables de Postgres si usás Vercel Postgres

### 2. Base de datos
- [ ] Las tablas están creadas (ejecutar sql/schema.sql)
- [ ] La migración 001 fue ejecutada (ejecutar sql/001_increase_varchar_limits.sql)

### 3. Build logs
Si falla el build, verificar:
- [ ] Los logs de build en Vercel Dashboard
- [ ] Errores de TypeScript (deberían estar resueltos)
- [ ] Errores de conexión a base de datos

### 4. Runtime logs
Si el build pasa pero hay errores en runtime:
- [ ] Verificar logs de funciones en Vercel Dashboard
- [ ] Errores de "relation does not exist" = falta crear tablas
- [ ] Errores de "value too long" = falta ejecutar migración 001

## 🚀 Comandos útiles

### Probar el build localmente
```bash
npm run build
npm start
```

### Verificar tipos de TypeScript
```bash
npx tsc --noEmit
```

### Ver logs en producción
```bash
vercel logs
```

## 📝 Próximos pasos si sigue fallando

1. Revisar los logs específicos de error en Vercel
2. Verificar que las variables de entorno estén en todas las environments (Production, Preview, Development)
3. Asegurarse de que la base de datos esté accesible desde Vercel
