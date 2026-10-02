# Hecopal — boceto funcional

Angular 21, Node.js 24 y Express. Preparado para Supabase Auth y PostgreSQL.
Imágenes comerciales, ubicación exacta, horarios y contenido institucional pendientes.

## Ejecutar la demostración local

1. Instalar Node.js 24.13 o superior.
2. Ejecutar `npm ci`, `npm run build`, `npm start`.
3. Abrir http://localhost:3000.
4. Usar los botones Cliente, Empleado o Administrador del banner.

Los precios y lotes de la demostración son ficticios. La demo escucha sólo en 127.0.0.1 y persiste en data/demo.json, ignorado por Git. No usar para datos reales ni desplegar públicamente. Sin variables externas la demo inicia automáticamente; NODE_ENV=production la rechaza.

Para desarrollo: mantener `npm start` en una terminal y `npm run dev` en otra. Angular usa el proxy hacia Node.

## Funciones

- Catálogo por tipo y selección primera, segunda o tercera.
- Reservas con fecha de retiro, kilos y precio conservado al reservar. Pago al retirar.
- Inventario por lote y refrigerador, estado de maduración y fecha estimada.
- El stock disponible cuenta sólo lotes marcados como listos. Las reservas asignan los lotes más antiguos primero.
- Empleado: registrar lotes, cambiar precios, registrar facturas y procesar retiros/cancelaciones.
- Administrador: además crear/retirar productos, corregir lotes con motivo y anular facturas con motivo.
- Facturas PDF/JPG/PNG: originales hasta 5 MB, prevención de duplicados por proveedor/número.
- Auditoría asociada a cada responsable; no hay rutas para eliminar historial ni originales.

## Conectar Supabase

1. Elegir un proyecto nuevo o destinado a Hecopal. Ejecutar database/schema.sql en su editor SQL.
2. Activar acceso por correo/contraseña y configurar URL de aplicación y confirmación de correo en Supabase Auth.
3. Copiar .env.example a .env. Completar SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY y DATABASE_URL (conexión PostgreSQL del pooler de Supabase).
4. Configurar DATABASE_SSL_CA=database/supabase-ca.crt para verificar SSL con el certificado público de Supabase. DATABASE_URL es un secreto del servidor. No publicarlo en Angular, GitHub, capturas o mensajes.
5. Iniciar servidor, crear una cuenta e ingresar una vez para que se cree su perfil.
6. Asignar rol admin o employee con las instrucciones SQL al final de database/schema.sql. Las cuentas nuevas siempre son user.
7. El administrador crea productos e ingresa lotes: el proyecto real comienza vacío, sin datos ficticios.

Node valida cada token con Supabase Auth. Los roles se consultan en PostgreSQL, sin confiar en datos editables por el usuario. Las tablas se encuentran en un esquema privado, con RLS activado y acceso revocado para anon/authenticated. Sólo el servidor con conexión PostgreSQL de confianza opera en este esquema; no exponerlo a la Data API.

## Arquitectura y límites del boceto

Para permitir una primera revisión, el estado de negocio se almacena en un documento JSONB privado y cada escritura bloquea su fila dentro de una transacción. Esto impide reservas simultáneas que excedan el stock. Los perfiles se almacenan por separado. Las lecturas no exponen facturas ni inventario a clientes.

Antes de operar con alto volumen: migrar lotes, facturas, reservas y auditoría a tablas independientes; mover originales a un bucket privado; paginar; añadir rate limiting y controles de sesión; realizar pruebas contra Supabase real. El almacenamiento en JSONB serializa todas las escrituras y carga todos los originales en memoria en cada operación. Es deliberadamente una base de prototipo.

Las copias de seguridad y su restauración deben configurarse y verificarse según el plan de Supabase, incluyendo los originales. Este boceto no configura backups por sí mismo. El Excel histórico aún no está importado: falta examinar sus columnas, revisar duplicados y conciliar totales.

## Verificación

`npm test` comprueba permisos, conservación del precio reservado, stock, concurrencia, aislamiento del cliente y conservación de facturas.
`npm run build` compila Angular.

La conexión PostgreSQL real fue verificada el 2 de octubre de 2026, usando SSL con comprobación de certificado y hostname. El servidor local opera en modo Supabase. Falta registrar las cuentas de las personas y cargar el catálogo real; no hay un despliegue web público.



## Acceso con Google
El flujo OAuth con PKCE está implementado. Configuración: [GOOGLE_LOGIN.md](GOOGLE_LOGIN.md). El botón se habilita cuando el proveedor Google está activo en Supabase. Las cuentas nuevas tienen rol cliente.


Perfil del cliente: nombre, correo vinculado al acceso, teléfono y empresa opcionales, selección preferida y resumen de reservas propias. Ejecutar database/profile.sql para actualizar instalaciones anteriores. Sólo el servidor actualiza el perfil autenticado; rol y correo no son editables por el formulario.


