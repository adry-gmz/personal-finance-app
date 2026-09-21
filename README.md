# Finanzas

Aplicación web de finanzas personales para registrar ingresos, gastos, deudas, provisiones y ahorros, organizados por mes.

## Funcionalidades

- Registro de ingresos y gastos, fijos o variables
- Dashboard mensual con gráficos
- Deudas con historial de pagos
- Provisiones y ahorros con metas
- Cada usuario ve solo sus datos (Row Level Security)

## Stack

React 19 · TypeScript · Vite · Tailwind CSS · Supabase (PostgreSQL + Auth) · TanStack Query · Recharts

## Instalación

```bash
npm install
cp .env.example .env
npm run dev
```

| Variable | Valor |
| --- | --- |
| `VITE_SUPABASE_URL` | URL del proyecto de Supabase |
| `VITE_SUPABASE_ANON_KEY` | Publishable key del proyecto |

## Base de datos

En el SQL Editor de Supabase, ejecuta en orden los archivos de `supabase/migrations/`:

1. `001_initial_schema.sql`
2. `002_rls_policies.sql`
3. `003_seed_data.sql`

Para cargar datos de prueba: `select public.seed_demo_data('tu@correo.com');`

## Estado

- [x] Autenticación y rutas protegidas
- [x] Dashboard con selector de mes y gráficos
- [x] Registro de ingresos y gastos
- [ ] Deudas
- [ ] Provisiones y ahorros
- [ ] Resumen anual

## Próximamente

Login con Google · Transacciones recurrentes automáticas · Exportar a CSV · Presupuestos · Modo oscuro
