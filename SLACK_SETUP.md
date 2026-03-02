# 🤖 Integración con Slack — GoFeedMe Bot

Esta guía explica cómo conectar GoFeedMe con Slack para que los usuarios puedan consultar el menú y hacer pedidos directamente desde el chat.

## ✅ Qué puede hacer el bot

| Comando | Qué hace |
|---------|----------|
| `menú` | Muestra el menú del día |
| `pedidos` | Lista los pedidos realizados hoy |
| `estado` | Informa si los pedidos están abiertos o cerrados |
| `pedir <plato>` | Registra un pedido |
| `pedir <plato> \| <opción>` | Pedido con variante (ej: Ternera, Pollo) |
| `pedir <plato> \| <opción> \| <guarnición>` | Pedido con opción + guarnición |
| `pedir <plato> \| <opción> \| <guarnición> \| <observaciones>` | Pedido completo |
| `ayuda` | Muestra los comandos disponibles |

El bot funciona tanto en **canales** (mencionándolo con `@GoFeedMe`) como por **mensaje directo**.

---

## 🛠️ Configuración paso a paso

### 1. Crear la Slack App

1. Andá a [api.slack.com/apps](https://api.slack.com/apps)
2. Click en **"Create New App"** → **"From scratch"**
3. Nombre: `GoFeedMe` (o el que prefieras)
4. Seleccioná tu workspace

### 2. Configurar permisos (OAuth & Permissions)

En el menú lateral, andá a **OAuth & Permissions** y agregá estos **Bot Token Scopes**:

| Scope | Para qué |
|-------|----------|
| `chat:write` | Enviar mensajes de respuesta |
| `app_mentions:read` | Detectar cuando mencionan al bot |
| `im:history` | Leer mensajes directos |
| `users:read` | Obtener el nombre real del usuario para los pedidos |

### 3. Habilitar Event Subscriptions

1. En el menú lateral, andá a **Event Subscriptions**
2. Activá **Enable Events**
3. En **Request URL** poné:
   ```
   https://tu-dominio.vercel.app/api/slack/events
   ```
   > Slack va a enviar un challenge de verificación. Si tu app está deployadada, debería responder automáticamente con ✔️.

4. En **Subscribe to bot events**, agregá:
   - `app_mention` — cuando alguien dice `@GoFeedMe`
   - `message.im` — mensajes directos al bot

5. Guardá los cambios.

### 4. Instalar la app en tu workspace

1. Andá a **Install App** en el menú lateral
2. Click en **"Install to Workspace"**
3. Autorizá los permisos
4. Copiá el **Bot User OAuth Token** (empieza con `xoxb-`)

### 5. Configurar variables de entorno

Agregá estas variables en tu proyecto (`.env.local` para desarrollo, o en Vercel Dashboard para producción):

```bash
SLACK_BOT_TOKEN=xoxb-tu-token-aqui
SLACK_SIGNING_SECRET=tu-signing-secret-aqui
```

El **Signing Secret** lo encontrás en **Basic Information** → **App Credentials** → **Signing Secret**.

### 6. Deploy

Si usás Vercel, simplemente hacé push. El endpoint `/api/slack/events` se crea automáticamente como parte de la app Next.js.

Si usás otro proveedor, asegurate de que el endpoint esté accesible públicamente en HTTPS.

---

## 💬 Ejemplos de uso en Slack

### Ver el menú
```
@GoFeedMe menú
```
> 🍽️ **Menú del día (2026-03-01)**
>
> **── Plato Principal ──**
>   • **MILANESA** _(Ternera / Pollo / Berenjena)_
>   • **RAVIOLES**
> ...

### Hacer un pedido simple
```
@GoFeedMe pedir ravioles
```
> ✅ **¡Pedido registrado!**
> 👤 Juan Pérez
> 🍽️ RAVIOLES
> 📂 Pasta

### Pedido con opción
```
@GoFeedMe pedir milanesa | pollo
```

### Pedido con opción + guarnición + observación
```
@GoFeedMe pedir milanesa | pollo | ensalada mixta | sin sal
```

### Consultar pedidos
```
@GoFeedMe pedidos
```

### Ver si se puede pedir
```
@GoFeedMe estado
```

---

## 🔒 Seguridad

- Todas las requests de Slack se verifican con **HMAC SHA-256** usando el Signing Secret.
- Las requests con más de 5 minutos se rechazan (protección contra replay attacks).
- Si `SLACK_SIGNING_SECRET` no está configurado, la verificación se omite (solo para desarrollo).

---

## 🧪 Testing local

Para probar localmente necesitás exponer tu servidor con un tunnel:

```bash
# Opción 1: ngrok
ngrok http 3000

# Opción 2: Cloudflare Tunnel
cloudflared tunnel --url http://localhost:3000
```

Luego usá la URL del tunnel como Request URL en Slack Event Subscriptions:
```
https://xxxx.ngrok.io/api/slack/events
```

---

## 🏗️ Arquitectura

```
Slack → POST /api/slack/events → detectIntent() → handler → Slack API reply
                                                      ↓
                                              lib/db.ts (getMenu, getOrders, ...)
                                              lib/orderService.ts (placeOrder)
```

El bot reutiliza la **misma lógica de negocio** que la web y el MCP server, garantizando validaciones consistentes (menú activo, pedidos abiertos, opciones requeridas, duplicados, etc.).
