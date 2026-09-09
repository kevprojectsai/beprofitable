# La Ganancia es Primero (beprofitable)

App de finanzas personales y de negocio basada en el método *Profit First*.
Reparte cada ingreso por porcentajes en cuentas separadas (ganancia, salario,
impuestos, operación…), por espacios independientes para cada negocio y para
lo personal. Incluye login por usuario, guardado en la nube y una guía de
consejos categorizada.

## Stack
- React + Vite
- Tailwind (CDN)
- Supabase (auth + base de datos por usuario, con Row Level Security)
- PWA (instalable, funciona offline con caché local)

## Desarrollo local
```bash
npm install
npm run dev
```

## Build de producción
```bash
npm run build   # genera /dist
```

## Despliegue (Netlify)
Este repo incluye `netlify.toml`. En Netlify:
1. Add new site → Import from GitHub → elige este repositorio.
2. Build command: `npm run build` — Publish directory: `dist` (se detectan solos).
3. Deploy. Cada push a `main` se publica automáticamente.

## Base de datos (Supabase)
La conexión (URL + anon key pública) está en `src/cloud.js`.
El esquema de la tabla y las políticas de seguridad están en
`docs/supabase-setup.sql` (ejecutar una vez en el SQL Editor de Supabase).

Para registro instantáneo: Supabase → Authentication → Email → apagar
"Confirm email".
