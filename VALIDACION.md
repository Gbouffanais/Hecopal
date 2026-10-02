# Verificación del boceto Hecopal

- Angular compiló correctamente con Angular 21.2.24 / Node 24.
- Seis pruebas de servidor aprobadas: permisos, precio fijado al reservar, salida/cancelación, conservación de facturas, aislamiento/concurrencia y kilos decimales.
- Interfaz: reserva de 2,5 kg de primera selección guardada por $8.750 y visible en inventario.
- Interfaz: empleado sin correcciones de lote ni historial administrativo; administrador con estas herramientas.
- El filtro por refrigerador y último ingreso se incorporaron a la compilación final.
- Sin proyecto Supabase visible en la conexión actual: esquema e integración preparados, no aplicados ni verificados contra una base real.
- GitHub: el repositorio Gbouffanais/Hecopal devuelve 404 en el conector; Git solicita autenticación. Subida pendiente.
- Excel histórico no importado; copias de seguridad pendientes de configurar y probar.
- La demostración guarda sólo datos de ejemplo localmente. No es un despliegue de producción.

## Compilación en este entorno de Windows

El compilador encontró un bloqueo al enumerar la carpeta padre del proyecto. Se verificó usando una ruta virtual temporal a la carpeta del propio proyecto:

```powershell
subst H: 'RUTA_ABSOLUTA_A_HECOPAL'
Set-Location H:\
npm.cmd run build
```

Sólo usar H: si no está ocupada. En un entorno habitual, ejecutar npm run build directamente. La asignación de este entorno fue temporal al proceso; no es necesaria para ejecutar la aplicación ya compilada.

