# Contribuir a GoFeedMe

¡Gracias por tu interés en contribuir a GoFeedMe! 🎉

## 🚀 Cómo Contribuir

### 1. Fork y Clone

```bash
# Fork el repositorio en GitHub
# Luego clona tu fork
git clone https://github.com/TU_USUARIO/GoFeedMe.git
cd GoFeedMe
```

### 2. Setup Local

```bash
# Instalar dependencias
npm install

# Copiar variables de entorno
cp .env.example .env.local

# Configurar tu base de datos (ver README.md)
# Ejecutar migraciones SQL
```

### 3. Crear una Branch

```bash
git checkout -b feature/tu-nueva-feature
# o
git checkout -b fix/tu-bug-fix
```

### 4. Hacer Cambios

- Escribe código limpio y bien documentado
- Sigue las convenciones de código del proyecto
- Agrega comentarios donde sea necesario
- Actualiza la documentación si es necesario

### 5. Commit

```bash
git add .
git commit -m "feat: descripción de tu cambio"
```

**Formato de commits:**
- `feat:` Nueva funcionalidad
- `fix:` Corrección de bug
- `docs:` Cambios en documentación
- `style:` Cambios de formato (no afectan el código)
- `refactor:` Refactorización de código
- `test:` Agregar o modificar tests
- `chore:` Cambios en el build o herramientas

### 6. Push y Pull Request

```bash
git push origin feature/tu-nueva-feature
```

Luego crea un Pull Request en GitHub con:
- Descripción clara de los cambios
- Screenshots si aplica
- Referencia a issues relacionados

## 📝 Guidelines

### Código

- ✅ Usar TypeScript con tipos apropiados (no `any`)
- ✅ Seguir las convenciones de Next.js y React
- ✅ Mantener componentes pequeños y reutilizables
- ✅ Usar Tailwind CSS para estilos
- ✅ Validar inputs en API routes

### Commits

- Commits atómicos (un cambio lógico por commit)
- Mensajes descriptivos en español o inglés
- Evitar commits con archivos innecesarios

### Pull Requests

- Un PR por feature/fix
- Descripción clara de qué resuelve
- Probar localmente antes de enviar
- Asegurarse de que el build pase

## 🐛 Reportar Bugs

### Template de Issue

```markdown
**Descripción del bug**
Descripción clara y concisa del problema.

**Pasos para reproducir**
1. Ir a '...'
2. Hacer click en '....'
3. Ver error

**Comportamiento esperado**
Qué esperabas que sucediera.

**Screenshots**
Si aplica, agrega screenshots.

**Ambiente**
- OS: [e.g. macOS, Windows]
- Browser: [e.g. Chrome, Safari]
- Versión: [e.g. 22]
```

## 💡 Sugerir Features

¿Tienes una idea? Abre un issue con:

```markdown
**Descripción de la feature**
Descripción clara de la funcionalidad.

**Caso de uso**
¿Cómo mejoraría esto la aplicación?

**Alternativas consideradas**
Otras soluciones que pensaste.
```

## ✅ Checklist antes de enviar PR

- [ ] El código compila sin errores (`npm run build`)
- [ ] No hay errores de TypeScript
- [ ] Los estilos se ven bien en desktop y mobile
- [ ] Probaste la funcionalidad localmente
- [ ] Actualizaste la documentación si es necesario
- [ ] No hay secrets o credenciales en el código
- [ ] Los commits tienen mensajes descriptivos

## 🎯 Ideas de Contribución

### Features Fáciles
- [ ] Modo oscuro
- [ ] Mejoras de UI/UX
- [ ] Más emojis en el parser de menús
- [ ] Mejores mensajes de error

### Features Intermedias
- [ ] Sistema de autenticación
- [ ] Notificaciones por email
- [ ] Export de pedidos a CSV/PDF
- [ ] Filtros en el resumen

### Features Avanzadas
- [ ] Multi-tenant (múltiples empresas)
- [ ] Historial de pedidos por usuario
- [ ] Dashboard de estadísticas
- [ ] Integración con servicios de delivery

## 🤔 ¿Necesitas Ayuda?

- Abre un issue con la etiqueta `question`
- Revisa issues existentes con `good first issue`
- Lee la documentación en README.md y DEPLOYMENT.md

## 📜 Código de Conducta

- Ser respetuoso y constructivo
- Dar feedback útil en code reviews
- Ayudar a otros contributors
- Mantener discusiones profesionales

## 📄 Licencia

Al contribuir, aceptas que tus contribuciones se licencien bajo la misma licencia MIT del proyecto.

---

¡Gracias por hacer GoFeedMe mejor! 🍽️✨
