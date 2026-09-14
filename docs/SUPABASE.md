# Configuración de Supabase

## 1. Crear el proyecto

1. Crea un proyecto de Supabase en la región más cercana al equipo.
2. En **SQL Editor**, ejecuta la migración `supabase/migrations/202609140001_initial_schema.sql`.
3. En **Authentication > Providers**, habilita **Google**. Configura el Client ID y Client Secret de Google OAuth y agrega estas URL de redirección:
   - `http://localhost:3000/auth/callback`
   - `https://TU-PROYECTO.vercel.app/auth/callback`
   - el dominio final, cuando exista: `https://app.tu-dominio.com/auth/callback`
4. En **Authentication > URL Configuration**, define la URL del sitio de producción y añade las mismas URL permitidas.
5. En **Project Settings > API**, copia únicamente la URL del proyecto y la Publishable key a Vercel como `NEXT_PUBLIC_SUPABASE_URL` y `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`.

La clave `service_role` no se necesita en este primer flujo y no debe publicarse ni guardarse en Vercel.

## 2. Primer equipo

El primer usuario que entre con una cuenta `@gmail.com` queda registrado automáticamente. Desde la aplicación se invoca `create_team(nombre)` para crear el primer equipo; su creador será administrador. Los administradores generan enlaces de invitación de siete días mediante `create_team_invitation` y pueden expulsar integrantes con `remove_team_member`.

Las invitaciones son de acceso, no de correo: por ahora el administrador comparte el enlace seguro por el canal que prefiera. Para envío automático hay que conectar un SMTP o servicio transaccional antes de usarlo con personas externas.

## 3. Conservación de datos

No existe una garantía honesta de “nunca” perder información con solo un servicio gratuito. En Supabase Free no hay backups descargables gestionados y un proyecto con poca actividad puede pausarse. Mantén copias externas periódicas de base de datos y de archivos antes de usar datos reales. Supabase recomienda exportar periódicamente los proyectos Free con CLI y guardar el resultado fuera de Supabase.

Antes del uso operativo, define una cuenta de respaldo externa y automatiza una exportación al menos diaria. Si el dato es crítico, migra a Supabase Pro para backups diarios, sin pausa por inactividad y una retención definida.
