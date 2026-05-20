# Configuración Google OAuth (YouTube)

## 1. Crear proyecto en Google Cloud

1. Ir a https://console.cloud.google.com/
2. Crear nuevo proyecto: "Pulse Local".
3. Activar **YouTube Data API v3** en APIs & Services → Library.

## 2. OAuth consent screen

1. APIs & Services → OAuth consent screen.
2. Tipo: **External** (para producción) o **Internal** (si Google Workspace).
3. Rellenar nombre, soporte, dominio.
4. Scopes a añadir:
   - `https://www.googleapis.com/auth/youtube.upload`
   - `https://www.googleapis.com/auth/youtube`
   - `https://www.googleapis.com/auth/youtube.readonly`
5. Añadir tu email como **test user** mientras la app está en "Testing".

## 3. Crear credenciales OAuth 2.0

1. APIs & Services → Credentials → Create credentials → OAuth client ID.
2. Tipo: **Web application**.
3. Authorized redirect URIs:
   ```
   http://localhost:3000/api/v1/oauth/google/callback
   ```
4. Guardar **Client ID** y **Client Secret**.

## 4. Variables de entorno

```bash
GOOGLE_CLIENT_ID=12345-abc.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=GOCSPX-...
GOOGLE_OAUTH_REDIRECT=http://localhost:3000/api/v1/oauth/google/callback
```

## 5. Cuotas

YouTube Data API tiene cuotas estrictas (default: 10.000 units/day por proyecto).
- Subir un vídeo cuesta ~1.600 units → ~6 uploads/día.
- Si necesitas más, solicitar aumento en Console → IAM & Admin → Quotas.

Pulse trackea esto en `ApiRateLimit.quotaUnitsUsed/quotaUnitsLimit` por cuenta.

## 6. YouTube Shorts

Para que un vídeo se reconozca como Short:
- Duración ≤ 60s.
- Vertical (9:16).
- Hashtag `#Shorts` en title o description.
- Pulse añade automáticamente `#Shorts` si `format=short`.

## 7. Renovación de tokens

Google da `refresh_token` solo la primera vez (con `prompt=consent`).
Pulse lo guarda cifrado y lo usa para renovar el access_token cada hora.
