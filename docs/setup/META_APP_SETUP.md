# Configuración Meta App (Instagram + Facebook)

Para conectar cuentas de Instagram Business y Facebook Pages necesitas una app
de Meta for Developers con los permisos correctos.

## 1. Crear la app

1. Ir a https://developers.facebook.com/apps
2. Crear app → tipo **"Negocios"**.
3. Asignarle un nombre (ej: "Pulse Local") y email de contacto.
4. Anotar el **App ID** y el **App Secret** (Settings → Basic).

## 2. Productos a añadir

En el dashboard de la app, añadir:
- **Facebook Login for Business** → para el flujo OAuth.
- **Instagram Graph API** → para publicar en IG Business.
- **Marketing API** → solo si vas a usar boost (Fase 10).
- **Webhooks** → para recibir notificaciones de publicaciones.

## 3. Permisos / scopes

En **App Review → Permissions and Features**, solicitar:
- `instagram_basic`
- `instagram_content_publish`
- `instagram_manage_insights`
- `pages_show_list`
- `pages_read_engagement`
- `pages_manage_posts`
- `business_management`
- `ads_management` (solo si boost)

⚠️ El App Review tarda 1-4 semanas. Mientras tanto, puedes operar añadiendo
cuentas de prueba en **App Roles → Roles → Testers** y usando el modo manual
avanzado de Pulse para pegar los tokens directamente.

## 4. OAuth Redirect URIs

En **Facebook Login → Settings → Valid OAuth Redirect URIs**:
```
http://localhost:3000/api/v1/oauth/meta/callback
https://api.pulse.tudominio.com/api/v1/oauth/meta/callback
```

## 5. Variables de entorno

```bash
META_APP_ID=12345678901234567
META_APP_SECRET=abc123def456ghi789...
META_OAUTH_REDIRECT=http://localhost:3000/api/v1/oauth/meta/callback
```

## 6. Long-lived tokens

Por defecto los tokens de Facebook duran 1-2h. Tras el OAuth, Pulse intercambia
el short-lived por un **long-lived (60d)** vía `/oauth/access_token` y
programa un job de refresh para 6h antes de la expiración.

## 7. Webhooks de Instagram

Configurar en **Instagram Graph API → Webhooks**:
- Callback URL: `https://api.pulse.tudominio.com/api/v1/webhooks/meta`
- Verify token: el valor de `META_WEBHOOK_VERIFY_TOKEN` en tu `.env.local`.
- Suscribir a: `comments`, `mentions`, `messages` (opcional).

## 8. Limitaciones conocidas

- IG Personal accounts no permiten publicación vía API. Solo Business/Creator.
- Reels: requiere `media_type=REELS`, `video_url` accesible públicamente.
- Stories: requiere `media_type=STORIES`, expira en 24h.
- Carrusel: max 10 children, todos publicados en una sola llamada (`media_type=CAROUSEL`).
