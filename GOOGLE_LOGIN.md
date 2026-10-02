# Inicio de sesión con Google — Hecopal

El botón y el flujo OAuth con PKCE están implementados. Cada cuenta nueva recibe el rol cliente en el servidor.
No hay permisos administrativos derivados del perfil o correo de Google.

## 1. Crear el cliente OAuth en Google

En https://console.cloud.google.com/ elegir o crear el proyecto Hecopal y abrir Google Auth Platform.
Completar la configuración inicial de la aplicación y su pantalla de consentimiento.
Si la aplicación permanece en pruebas, añadir las cuentas que probarán el inicio de sesión a los usuarios de prueba.

Crear un cliente OAuth de tipo **Web application**:

- Authorized JavaScript origins: `http://localhost:3000`
- Authorized redirect URIs: `https://gogxcqqpwtikgjbvhbri.supabase.co/auth/v1/callback`

Guardar el Client ID y Client Secret. El Client Secret se introduce sólo en Supabase, no en el código, el navegador de Hecopal ni GitHub.

## 2. Habilitar Google en Supabase

Abrir Authentication > Sign In / Providers > Google.
Habilitar Google y completar Client ID y Client Secret. Guardar.

En Authentication > URL Configuration:

- Para esta instalación local, Site URL: `http://localhost:3000/`
- Redirect URLs: `http://localhost:3000/`
- Si se usa Angular directamente en desarrollo, añadir `http://localhost:4200/`.

Al publicar el sitio, añadir su URL HTTPS exacta y actualizar Site URL. No usar comodines amplios en producción.

## 3. Probar

Recargar Hecopal, entrar en Mi cuenta y pulsar Continuar con Google.
Elegir una cuenta, aprobar el consentimiento y comprobar el retorno a Hecopal.
El servidor valida el token con Supabase Auth y crea su perfil de cliente.
Las reservas se vinculan al ID de Supabase, no a un correo enviado por el navegador.

## Estado

El código está preparado y el botón se habilita automáticamente si Supabase informa que Google está activo.
Mientras el proveedor esté desactivado, el botón permanece inactivo con un aviso de disponibilidad.
La prueba completa con una cuenta de Google requiere configurar las credenciales del proveedor.

## Referencias

- https://supabase.com/docs/guides/auth/social-login/auth-google
- https://supabase.com/docs/guides/auth/redirect-urls


