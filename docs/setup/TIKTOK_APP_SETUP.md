# Configuración TikTok for Business

## 1. Crear app

1. Ir a https://developers.tiktok.com/apps
2. Crear app → tipo **"Login Kit + Content Posting API"**.
3. Si vas a usar Spark Ads (boost), añadir también **"TikTok Marketing API"**.

## 2. Productos

- **Login Kit** → OAuth.
- **Content Posting API** → publicación de vídeos.
- **Display API** → métricas básicas.
- **Marketing API** → boost (Fase 10), requiere acceso separado.

## 3. Scopes

Solicitar en App Review:
- `user.info.basic`
- `video.upload`
- `video.publish`
- `video.list`
- Si boost: `ads:read`, `ads:manage` con acceso a Marketing API.

## 4. OAuth Redirect URI

```
http://localhost:3000/api/v1/oauth/tiktok/callback
```

## 5. Variables de entorno

```bash
TIKTOK_CLIENT_KEY=awxxxxxxxxxxxxxxx
TIKTOK_CLIENT_SECRET=secret...
TIKTOK_OAUTH_REDIRECT=http://localhost:3000/api/v1/oauth/tiktok/callback
```

## 6. Content Posting — flujo

1. Subir el vídeo a un CDN público (Cloudflare R2 con presigned URL en prod,
   localhost en dev).
2. POST `/v2/post/publish/video/init/` con `video_url` → recibes
   `publish_id` y `upload_url`.
3. Subir el vídeo (PUT con bytes) al `upload_url`.
4. POST `/v2/post/publish/status/fetch/` para confirmar.
5. Cuando `status=PUBLISH_COMPLETE`, guardar el `publish_id` como
   `platform_post_id` en la `PlatformVariant`.

## 7. Sandbox vs Production

En sandbox solo puedes publicar en cuentas añadidas como testers. Para producción
hay que pasar el App Review y demostrar caso de uso.

## 8. Spark Ads (boost)

Para promocionar una publicación orgánica como ad:
1. Crear `identity` en TikTok Ads vinculada a la cuenta.
2. Tras publicar el vídeo orgánico, generar un `tcm_id` (TikTok Content Management).
3. Crear `campaign` → `adgroup` (con budget total) → `ad` que referencia
   el `tcm_id`.
