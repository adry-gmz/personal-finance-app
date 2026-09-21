# Finanzas

Aplicación web de finanzas personales. Permite registrar ingresos y gastos,
consultar las finanzas mes a mes, administrar deudas, provisiones y ahorros,
y visualizar todo en un dashboard con gráficos.

>  Los datos de ejemplo son ficticios.

## Conceptos

La aplicación distingue explícitamente cuatro cosas que suelen confundirse:

| Concepto      | Significado                                            |
| ------------- | ------------------------------------------------------ |
| **Gasto**     | Dinero consumido.                                      |
| **Provisión** | Dinero apartado por si ocurre algo (emergencias).      |
| **Ahorro**    | Dinero apartado para conseguir una meta.               |
| **Deuda**     | Obligación pendiente; pagarla la reduce.               |

Un aporte a un ahorro **no** es un gasto, y el dashboard los muestra por separado.

## Stack

- **React 19 + Vite + TypeScript** — interfaz
- **Tailwind CSS v4** — estilos
- **Supabase** — PostgreSQL, autenticación y API
- **TanStack Query** — caché y estados de carga/error
- **React Router** — navegación
- **Recharts** — gráficos
- **Vercel** — despliegue

## Requisitos

- Node.js 20 o superior
- Una cuenta gratuita en [supabase.com](https://supabase.com)

## Instalación

```bash
npm install
cp .env.example .env   # en Windows: copy .env.example .env
```

Luego completa `.env` con las claves de tu proyecto Supabase y ejecuta:

```bash
npm run dev
```

La aplicación queda en http://localhost:5173

## Variables de entorno

| Variable                 | Descripción                                                       |
| ------------------------ | ----------------------------------------------------------------- |
| `VITE_SUPABASE_URL`      | URL del proyecto, tipo `https://xxxx.supabase.co`                 |
| `VITE_SUPABASE_ANON_KEY` | Clave pública `anon`. Es segura en el navegador: el acceso real lo controla RLS. |

La clave `service_role` **nunca** debe aparecer en el frontend ni en el repositorio.
El archivo `.env` está ignorado por Git.

## Configuración de Supabase

1. Crea un proyecto en [supabase.com](https://supabase.com) (plan gratuito).
2. Copia la URL y la `anon key` desde **Project Settings → API** a tu `.env`.
3. Abre **SQL Editor → New query** y ejecuta, en este orden:
   - `supabase/migrations/001_initial_schema.sql`
   - `supabase/migrations/002_rls_policies.sql`
   - `supabase/migrations/003_seed_data.sql`
4. Regístrate en la aplicación y luego carga los datos de prueba:
   ```sql
   select public.seed_demo_data('tu-correo@ejemplo.com');
   ```

`000_reset.sql` borra todo el esquema para reconstruirlo desde cero. Es
destructivo y solo debe usarse en desarrollo; no toca las cuentas de
`auth.users`.

## Base de datos

```
auth.users ──1:1── profiles
                      │
        ┌─────────────┼──────────────┬──────────────┐
        │             │              │              │
   categories ──1:N── transactions  debts         funds
                                     │              │
                               debt_payments  fund_movements
```

Puntos de diseño que vale la pena conocer antes de tocar el esquema:

- **El mes no es una tabla.** `transactions` guarda la fecha exacta en una
  columna `DATE`, y `year`/`month` son columnas `GENERATED ALWAYS` que
  PostgreSQL calcula desde ella. Al ser generadas no pueden desincronizarse.
- **El dinero es `NUMERIC(14,2)`**, nunca `FLOAT`. Los montos son siempre
  positivos; el signo lo determina `type`.
- **Una clave foránea compuesta** `(category_id, type) → categories (id, type)`
  impide registrar un gasto en una categoría de ingreso.
- **`debts.paid_amount` y `funds.current_amount` los mantienen triggers**
  a partir de `debt_payments` y `fund_movements`. Además, la base de datos
  revoca el permiso de escritura sobre esas columnas, así que no se pueden
  alterar desde la API sin registrar el movimiento correspondiente.
- **RLS filtra por `auth.uid()`** en las siete tablas. `debt_payments` y
  `fund_movements` no tienen `user_id`: heredan la pertenencia de su deuda o
  fondo mediante un `EXISTS`, para no duplicar el dato y arriesgar que se
  desincronice.
- **El rol `ADMIN` no da acceso a las finanzas de otros usuarios.** La
  privacidad tiene prioridad; el rol servirá para funciones administrativas.

## Scripts

| Comando           | Qué hace                              |
| ----------------- | ------------------------------------- |
| `npm run dev`     | Servidor de desarrollo                |
| `npm run build`   | Verifica tipos y compila a `dist/`    |
| `npm run preview` | Sirve localmente el build de producción |
| `npm run lint`    | Análisis estático con oxlint          |

## Estructura

```
src/
  components/   componentes reutilizables de interfaz
  pages/        una carpeta o archivo por ruta
  layouts/      estructuras compartidas (sidebar, navbar)
  services/     única capa que habla con Supabase
  hooks/        lógica de datos sobre los servicios
  lib/          cliente de Supabase, configuración
  types/        tipos del dominio y de la base de datos
  utils/        funciones puras (dinero, fechas)
supabase/
  migrations/   esquema SQL versionado
```

La regla es que solo `services/` conoce Supabase. Los componentes nunca
lanzan consultas directamente.

## Despliegue en Vercel

1. Sube el repositorio a GitHub.
2. En Vercel: **Add New → Project** e importa el repositorio.
   El framework (Vite) se detecta automáticamente.
3. En **Settings → Environment Variables** agrega `VITE_SUPABASE_URL` y
   `VITE_SUPABASE_ANON_KEY` con los mismos valores de tu `.env` local.
4. Despliega. Cada push a la rama principal genera un nuevo despliegue.

## Estado del desarrollo

- [x] **Fase 1** — Proyecto, Tailwind, Supabase, estructura
- [x] **Fase 2** — Esquema de base de datos, relaciones, RLS, migraciones
- [x] **Fase 3** — Autenticación y rutas protegidas
- [x] **Fase 4** — Dashboard con selector de mes y gráficos
- [x] **Fase 5** — Registro de ingresos y gastos (CRUD)
- [ ] **Fase 6** — Deudas y pagos
- [ ] **Fase 7** — Provisiones y ahorros
- [ ] **Fase 8** — Resumen anual

## Futuras mejoras

**Versión 2** — Login con Google (Supabase Auth OAuth), transacciones
recurrentes automáticas, filtros avanzados, exportar a CSV/Excel,
importar movimientos, categorías personalizadas.

**Versión 3** — Presupuestos mensuales, alertas, análisis y proyecciones,
comparación entre meses, modo oscuro, PWA.

**Futuro** — Módulo de inversiones.

### Agregar "Continuar con Google" más adelante

La arquitectura ya lo soporta y no requiere cambios en la base de datos,
porque `profiles` se crea automáticamente para cualquier usuario de
`auth.users`, sin importar cómo se autenticó. Los pasos serán:

1. En Google Cloud Console, crear credenciales OAuth 2.0 y registrar como
   URI de redirección la que indica Supabase.
2. En Supabase: **Authentication → Providers → Google**, activarlo y pegar
   el Client ID y el Client Secret.
3. En el frontend, agregar un botón que llame a
   `supabase.auth.signInWithOAuth({ provider: 'google' })`.

No hay que reconstruir nada: el resto de la aplicación solo depende de
`auth.uid()`, que funciona igual con cualquier proveedor.
