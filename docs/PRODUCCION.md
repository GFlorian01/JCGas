# Entrega a producción

## Estado de este entregable

La aplicación compila en modo producción y tiene un endpoint de salud en `GET /api/health`. Incluye imagen Docker reproducible y CI para lint y compilación. No contiene autenticación, base de datos ni generación real de PDFs: es un prototipo visual y no debe manejar datos operativos todavía.

## Despliegue recomendado

Despliega como aplicación Node.js (Vercel, Cloud Run, Render, Railway o un host Docker). No se recomienda exportarla como sitio estático porque el endpoint de salud y las futuras funciones de negocio requieren un servidor.

Parte de `.env.example`; en producción configura:

```env
APP_ENV=production
APP_BASE_URL=https://app.tu-dominio.com
```

No subas archivos `.env` ni secretos al repositorio.

### Docker

```bash
docker build -t cotizaciones-app .
docker run --rm -p 3000:3000 -e APP_ENV=production cotizaciones-app
```

Verifica `http://localhost:3000/api/health`; debe responder `status: "ok"`.

## Lista de salida

1. Crear un repositorio privado y subir el código, incluidos `Dockerfile` y `.github/workflows/ci.yml`.
2. Configurar el proveedor para construir con `npm ci && npm run build` y ejecutar `node server.js` si usa la salida standalone.
3. Asignar el dominio y forzar HTTPS en el proveedor.
4. Configurar `APP_ENV` y `APP_BASE_URL` como variables de producción.
5. Esperar la ejecución satisfactoria de CI y probar `/` y `/api/health`.

## Bloqueadores antes de uso interno real

- Persistencia, autenticación y autorización por usuario/equipo.
- Validación en servidor y auditoría de cambios.
- Generación y almacenamiento privado de PDFs.
- Integración de clientes, ubicaciones y cotizaciones con una base de datos; las pantallas actuales usan datos fijos.
- Registro de errores, backups, monitoreo y política de retención.

Hasta resolverlos, limita el despliegue a una demo o UAT sin datos sensibles.
