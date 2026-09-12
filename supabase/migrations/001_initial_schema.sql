-- ============================================================================
-- 001_initial_schema.sql
-- Esquema inicial de la aplicación de finanzas personales.
--
-- Ejecutar UNA sola vez en: Supabase -> SQL Editor -> New query.
-- Si necesitas volver a empezar desde cero, ejecuta antes 000_reset.sql.
--
-- Decisiones de diseño:
--   · Todo el dinero es NUMERIC(14,2). Nunca FLOAT: 0.1 + 0.2 no es 0.3.
--   · Las fechas son DATE (sin hora ni zona horaria), para que un movimiento
--     no cambie de mes al convertirse a UTC.
--   · Los saldos derivados (paid_amount, current_amount) los mantienen
--     triggers a partir del historial. El usuario no puede editarlos a mano.
-- ============================================================================


-- ----------------------------------------------------------------------------
-- TIPOS ENUMERADOS
-- Usamos enums en vez de texto libre para que PostgreSQL rechace valores
-- inválidos. Agregar un valor después es simple: ALTER TYPE ... ADD VALUE.
-- ----------------------------------------------------------------------------

create type public.user_role as enum ('ADMIN', 'USER');

-- Un movimiento entra o sale. Aplica tanto a categorías como a transacciones.
create type public.transaction_type as enum ('INCOME', 'EXPENSE');

-- Un gasto fijo se repite cada mes (internet, alquiler).
-- Un gasto variable depende del consumo (almuerzo, compra ocasional).
create type public.expense_type as enum ('FIXED', 'VARIABLE');

create type public.debt_status as enum ('ACTIVE', 'PAID', 'CANCELLED');

-- PROVISION: dinero apartado por si ocurre algo (emergencias).
-- SAVING:    dinero apartado para conseguir una meta (laptop, viaje).
-- En el futuro podría agregarse INVERSION sin cambiar la estructura.
create type public.fund_type as enum ('PROVISION', 'SAVING');

create type public.fund_movement_type as enum ('CONTRIBUTION', 'WITHDRAWAL');


-- ----------------------------------------------------------------------------
-- PROFILES
-- Supabase Auth guarda las credenciales en auth.users, que no podemos
-- modificar. profiles es nuestra extensión pública de ese usuario.
-- La relación es 1:1 y comparte el mismo id.
-- ----------------------------------------------------------------------------

create table public.profiles (
  id         uuid primary key references auth.users (id) on delete cascade,
  username   text not null unique
             check (char_length(username) between 2 and 32),
  full_name  text not null default '',
  role       public.user_role not null default 'USER',
  created_at timestamptz not null default now()
);

comment on table public.profiles is
  'Perfil público de cada usuario. Se crea automáticamente al registrarse.';


-- ----------------------------------------------------------------------------
-- CATEGORIES
-- Cada usuario tiene sus propias categorías. Dos usuarios pueden llamar
-- "Comida" a categorías distintas sin chocar, de ahí el unique compuesto.
-- ----------------------------------------------------------------------------

create table public.categories (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references public.profiles (id) on delete cascade,
  name       text not null check (char_length(trim(name)) > 0),
  type       public.transaction_type not null,
  color      text not null default '#64748b'
             check (color ~ '^#[0-9a-fA-F]{6}$'),
  created_at timestamptz not null default now(),

  -- El mismo usuario no puede repetir el nombre dentro del mismo tipo.
  constraint categories_unique_name_per_user unique (user_id, type, name),

  -- Necesario para la clave foránea compuesta desde transactions: permite
  -- exigir que el tipo de la transacción coincida con el de su categoría.
  constraint categories_id_type_unique unique (id, type)
);

create index categories_user_type_idx on public.categories (user_id, type);


-- ----------------------------------------------------------------------------
-- TRANSACTIONS
-- Una sola tabla para ingresos y gastos, de todos los meses.
-- El mes NO es una tabla: se deriva de la fecha.
-- ----------------------------------------------------------------------------

create table public.transactions (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references public.profiles (id) on delete cascade,
  category_id  uuid not null,
  type         public.transaction_type not null,

  -- Solo tiene sentido en gastos. Ver constraint más abajo.
  expense_type public.expense_type,

  description  text not null default '',
  amount       numeric(14, 2) not null check (amount > 0),
  date         date not null,

  -- En el MVP solo marcamos si se repite. La generación automática de
  -- movimientos recurrentes queda para una versión posterior.
  is_recurring boolean not null default false,
  created_at   timestamptz not null default now(),

  -- Columnas derivadas de la fecha, calculadas y almacenadas por PostgreSQL.
  -- Al ser GENERATED ALWAYS es imposible que se desincronicen de `date`.
  -- Sirven para agrupar por mes y para el resumen anual.
  year  smallint generated always as (extract(year  from "date")::smallint) stored,
  month smallint generated always as (extract(month from "date")::smallint) stored,

  -- Un gasto siempre es fijo o variable; un ingreso nunca lo es.
  constraint transactions_expense_type_matches_type check (
    (type = 'EXPENSE' and expense_type is not null) or
    (type = 'INCOME'  and expense_type is null)
  ),

  -- Clave foránea compuesta: garantiza que una transacción de tipo EXPENSE
  -- solo pueda usar una categoría de tipo EXPENSE. Sin esto sería posible
  -- registrar un gasto en la categoría "Salario".
  constraint transactions_category_fk
    foreign key (category_id, type)
    references public.categories (id, type)
    on delete restrict
);

-- Consulta principal de la app: los movimientos de un usuario en un mes.
create index transactions_user_date_idx  on public.transactions (user_id, date desc);
create index transactions_user_month_idx on public.transactions (user_id, year, month);
create index transactions_category_idx   on public.transactions (category_id);

comment on column public.transactions.amount is
  'Siempre positivo. El signo lo determina la columna type (INCOME / EXPENSE).';


-- ----------------------------------------------------------------------------
-- DEBTS
-- paid_amount es la suma de debt_payments, mantenida por trigger.
-- El saldo pendiente se calcula: total_amount - paid_amount.
-- ----------------------------------------------------------------------------

create table public.debts (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references public.profiles (id) on delete cascade,
  name          text not null check (char_length(trim(name)) > 0),
  total_amount  numeric(14, 2) not null check (total_amount > 0),

  -- Derivado de debt_payments. No se edita manualmente (ver REVOKE al final).
  paid_amount   numeric(14, 2) not null default 0 check (paid_amount >= 0),

  interest_rate numeric(5, 2) check (interest_rate >= 0),
  due_date      date,
  status        public.debt_status not null default 'ACTIVE',
  created_at    timestamptz not null default now()
);

create index debts_user_status_idx on public.debts (user_id, status);


-- ----------------------------------------------------------------------------
-- DEBT_PAYMENTS
-- Historial de pagos. Es la fuente de verdad de debts.paid_amount.
-- No lleva user_id: su dueño es el dueño de la deuda (ver RLS en 002).
-- ----------------------------------------------------------------------------

create table public.debt_payments (
  id          uuid primary key default gen_random_uuid(),
  debt_id     uuid not null references public.debts (id) on delete cascade,
  amount      numeric(14, 2) not null check (amount > 0),
  date        date not null default current_date,
  description text not null default '',
  created_at  timestamptz not null default now()
);

create index debt_payments_debt_date_idx on public.debt_payments (debt_id, date desc);


-- ----------------------------------------------------------------------------
-- FUNDS
-- Una sola tabla para provisiones y ahorros: misma estructura, distinta
-- intención. La diferencia la marca la columna type.
-- ----------------------------------------------------------------------------

create table public.funds (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid not null references public.profiles (id) on delete cascade,
  name           text not null check (char_length(trim(name)) > 0),
  type           public.fund_type not null,
  target_amount  numeric(14, 2) not null check (target_amount > 0),

  -- Derivado de fund_movements. No se edita manualmente (ver REVOKE al final).
  current_amount numeric(14, 2) not null default 0 check (current_amount >= 0),

  target_date    date,
  created_at     timestamptz not null default now(),

  constraint funds_unique_name_per_user unique (user_id, type, name)
);

create index funds_user_type_idx on public.funds (user_id, type);


-- ----------------------------------------------------------------------------
-- FUND_MOVEMENTS
-- Aportes y retiros. Es la fuente de verdad de funds.current_amount.
-- ----------------------------------------------------------------------------

create table public.fund_movements (
  id          uuid primary key default gen_random_uuid(),
  fund_id     uuid not null references public.funds (id) on delete cascade,
  type        public.fund_movement_type not null,
  amount      numeric(14, 2) not null check (amount > 0),
  date        date not null default current_date,
  description text not null default '',
  created_at  timestamptz not null default now()
);

create index fund_movements_fund_date_idx on public.fund_movements (fund_id, date desc);


-- ============================================================================
-- TRIGGERS DE CONSISTENCIA
--
-- Guardamos paid_amount y current_amount en vez de calcularlos en cada
-- consulta, porque el dashboard los lee constantemente. Para que eso no
-- provoque datos inconsistentes, se recalculan automáticamente desde el
-- historial en cada INSERT, UPDATE o DELETE.
-- ============================================================================

-- --- Deudas -----------------------------------------------------------------

create or replace function public.refresh_debt_totals(p_debt_id uuid)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_paid  numeric(14, 2);
  v_total numeric(14, 2);
begin
  select coalesce(sum(amount), 0) into v_paid
  from public.debt_payments
  where debt_id = p_debt_id;

  select total_amount into v_total
  from public.debts
  where id = p_debt_id;

  if v_total is null then
    return; -- la deuda ya fue eliminada
  end if;

  update public.debts
  set paid_amount = v_paid,
      -- La deuda se marca pagada (o se reabre) sola.
      -- Una deuda CANCELLED nunca cambia de estado automáticamente.
      status = case
        when status = 'CANCELLED' then status
        when v_paid >= v_total    then 'PAID'::public.debt_status
        else 'ACTIVE'::public.debt_status
      end
  where id = p_debt_id;
end;
$$;

create or replace function public.on_debt_payment_change()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  -- En un UPDATE el pago pudo moverse de una deuda a otra: refrescamos ambas.
  if tg_op in ('UPDATE', 'DELETE') then
    perform public.refresh_debt_totals(old.debt_id);
  end if;

  if tg_op in ('INSERT', 'UPDATE') then
    perform public.refresh_debt_totals(new.debt_id);
  end if;

  return null; -- trigger AFTER: el valor de retorno se ignora
end;
$$;

create trigger debt_payments_refresh_totals
  after insert or update or delete on public.debt_payments
  for each row execute function public.on_debt_payment_change();


-- --- Fondos -----------------------------------------------------------------

create or replace function public.refresh_fund_balance(p_fund_id uuid)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_balance numeric(14, 2);
begin
  -- Saldo = aportes - retiros
  select coalesce(sum(
    case when type = 'CONTRIBUTION' then amount else -amount end
  ), 0)
  into v_balance
  from public.fund_movements
  where fund_id = p_fund_id;

  if not exists (select 1 from public.funds where id = p_fund_id) then
    return; -- el fondo ya fue eliminado
  end if;

  -- No se puede retirar más de lo que hay. La restricción vive aquí,
  -- no solo en el formulario.
  if v_balance < 0 then
    raise exception
      'El retiro deja el fondo en saldo negativo. No se puede retirar más de lo aportado.'
      using errcode = 'check_violation';
  end if;

  update public.funds
  set current_amount = v_balance
  where id = p_fund_id;
end;
$$;

create or replace function public.on_fund_movement_change()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if tg_op in ('UPDATE', 'DELETE') then
    perform public.refresh_fund_balance(old.fund_id);
  end if;

  if tg_op in ('INSERT', 'UPDATE') then
    perform public.refresh_fund_balance(new.fund_id);
  end if;

  return null;
end;
$$;

create trigger fund_movements_refresh_balance
  after insert or update or delete on public.fund_movements
  for each row execute function public.on_fund_movement_change();


-- ============================================================================
-- CREACIÓN AUTOMÁTICA DEL PERFIL
--
-- Cuando Supabase Auth registra un usuario en auth.users, este trigger crea
-- su fila en profiles. Funciona igual con email/contraseña o con Google OAuth
-- en el futuro: por eso agregar Google después no requerirá tocar la BD.
-- ============================================================================

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_username text;
begin
  -- El username puede venir del formulario de registro; si no, lo derivamos
  -- de la parte local del correo.
  -- El último valor es una red de seguridad: si un proveedor no entregara
  -- correo (posible con OAuth), el registro no debe fallar por eso.
  v_username := coalesce(
    nullif(trim(new.raw_user_meta_data ->> 'username'), ''),
    nullif(split_part(coalesce(new.email, ''), '@', 1), ''),
    'user_' || substr(new.id::text, 1, 8)
  );

  -- El username es único: si ya existe, le agregamos un sufijo del id para
  -- que el registro nunca falle por una colisión de nombres.
  if exists (select 1 from public.profiles where username = v_username) then
    v_username := v_username || '_' || substr(new.id::text, 1, 4);
  end if;

  insert into public.profiles (id, username, full_name)
  values (
    new.id,
    v_username,
    coalesce(nullif(trim(new.raw_user_meta_data ->> 'full_name'), ''), '')
  )
  on conflict (id) do nothing;

  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();


-- ============================================================================
-- PERMISOS A NIVEL DE COLUMNA
--
-- RLS decide QUÉ FILAS puede tocar cada usuario. Esto decide QUÉ COLUMNAS.
--
-- Sin esto, un usuario podría llamar a la API y escribir directamente
-- paid_amount = 999 sin registrar ningún pago, o ascenderse a ADMIN.
-- Los triggers no se ven afectados porque son SECURITY DEFINER.
--
-- Importante: hay que revocar el UPDATE de la tabla completa y después
-- conceder solo las columnas permitidas. Un permiso a nivel de tabla NO se
-- ve afectado por un revoke a nivel de columna, así que revocar únicamente
-- la columna no tendría ningún efecto.
-- ============================================================================

-- profiles: el usuario edita su nombre, nunca su rol.
revoke update on public.profiles from anon, authenticated;
grant  update (username, full_name)
  on public.profiles to authenticated;

-- debts: paid_amount solo lo escribe el trigger desde debt_payments.
-- user_id tampoco es editable, así que una deuda no puede cambiar de dueño.
revoke update on public.debts from anon, authenticated;
grant  update (name, total_amount, interest_rate, due_date, status)
  on public.debts to authenticated;

-- funds: current_amount solo lo escribe el trigger desde fund_movements.
revoke update on public.funds from anon, authenticated;
grant  update (name, type, target_amount, target_date)
  on public.funds to authenticated;
