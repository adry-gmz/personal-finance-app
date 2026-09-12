-- ============================================================================
-- 002_rls_policies.sql
-- Row Level Security: cada usuario solo puede ver y modificar sus datos.
--
-- Ejecutar DESPUÉS de 001_initial_schema.sql.
--
-- Esta es la capa de seguridad real de la aplicación. No confiamos en que el
-- frontend filtre por user_id: aunque alguien llame a la API de Supabase
-- directamente con su token, PostgreSQL solo le devolverá sus propias filas.
--
-- auth.uid() es una función de Supabase que devuelve el id del usuario
-- autenticado que hace la petición, leído del JWT.
-- ============================================================================


-- ----------------------------------------------------------------------------
-- Activar RLS en todas las tablas.
--
-- Importante: con RLS activo y SIN políticas, la tabla queda completamente
-- bloqueada. El acceso es "denegado por defecto" y cada política abre un
-- permiso concreto.
-- ----------------------------------------------------------------------------

alter table public.profiles       enable row level security;
alter table public.categories     enable row level security;
alter table public.transactions   enable row level security;
alter table public.debts          enable row level security;
alter table public.debt_payments  enable row level security;
alter table public.funds          enable row level security;
alter table public.fund_movements enable row level security;


-- ----------------------------------------------------------------------------
-- PROFILES
--
-- Un usuario solo ve su propio perfil. No hay política de INSERT porque el
-- perfil lo crea el trigger handle_new_user (que es SECURITY DEFINER y por
-- eso no pasa por RLS), ni de DELETE porque el perfil se borra en cascada
-- cuando se elimina la cuenta en auth.users.
--
-- Nota sobre el rol ADMIN: no le damos acceso a los datos de otros usuarios.
-- La privacidad financiera tiene prioridad; el rol servirá más adelante para
-- funciones administrativas que no impliquen leer finanzas ajenas.
-- ----------------------------------------------------------------------------

create policy "Los usuarios ven su propio perfil"
  on public.profiles for select
  to authenticated
  using (id = (select auth.uid()));

create policy "Los usuarios actualizan su propio perfil"
  on public.profiles for update
  to authenticated
  using (id = (select auth.uid()))
  with check (id = (select auth.uid()));


-- ----------------------------------------------------------------------------
-- CATEGORIES
--
-- Patrón estándar para las tablas que tienen user_id directo:
--   · USING      -> qué filas existentes puede ver/modificar/borrar
--   · WITH CHECK -> qué filas puede crear o dejar tras un UPDATE
--
-- El WITH CHECK en el UPDATE es lo que impide reasignar una fila propia a
-- otro usuario cambiándole el user_id.
-- ----------------------------------------------------------------------------

create policy "Los usuarios ven sus categorías"
  on public.categories for select
  to authenticated
  using (user_id = (select auth.uid()));

create policy "Los usuarios crean sus categorías"
  on public.categories for insert
  to authenticated
  with check (user_id = (select auth.uid()));

create policy "Los usuarios actualizan sus categorías"
  on public.categories for update
  to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

create policy "Los usuarios eliminan sus categorías"
  on public.categories for delete
  to authenticated
  using (user_id = (select auth.uid()));


-- ----------------------------------------------------------------------------
-- TRANSACTIONS
-- ----------------------------------------------------------------------------

create policy "Los usuarios ven sus transacciones"
  on public.transactions for select
  to authenticated
  using (user_id = (select auth.uid()));

create policy "Los usuarios crean sus transacciones"
  on public.transactions for insert
  to authenticated
  with check (user_id = (select auth.uid()));

create policy "Los usuarios actualizan sus transacciones"
  on public.transactions for update
  to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

create policy "Los usuarios eliminan sus transacciones"
  on public.transactions for delete
  to authenticated
  using (user_id = (select auth.uid()));


-- ----------------------------------------------------------------------------
-- DEBTS
-- ----------------------------------------------------------------------------

create policy "Los usuarios ven sus deudas"
  on public.debts for select
  to authenticated
  using (user_id = (select auth.uid()));

create policy "Los usuarios crean sus deudas"
  on public.debts for insert
  to authenticated
  with check (user_id = (select auth.uid()));

create policy "Los usuarios actualizan sus deudas"
  on public.debts for update
  to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

create policy "Los usuarios eliminan sus deudas"
  on public.debts for delete
  to authenticated
  using (user_id = (select auth.uid()));


-- ----------------------------------------------------------------------------
-- DEBT_PAYMENTS
--
-- Esta tabla no tiene user_id: un pago pertenece a quien sea dueño de la
-- deuda. En vez de duplicar el user_id (que podría quedar desincronizado con
-- el de la deuda), la política pregunta por el padre.
--
-- El índice de la clave primaria de debts hace que este EXISTS sea una
-- búsqueda directa, no un recorrido de tabla.
-- ----------------------------------------------------------------------------

create policy "Los usuarios ven los pagos de sus deudas"
  on public.debt_payments for select
  to authenticated
  using (
    exists (
      select 1 from public.debts d
      where d.id = debt_payments.debt_id
        and d.user_id = (select auth.uid())
    )
  );

create policy "Los usuarios registran pagos en sus deudas"
  on public.debt_payments for insert
  to authenticated
  with check (
    exists (
      select 1 from public.debts d
      where d.id = debt_payments.debt_id
        and d.user_id = (select auth.uid())
    )
  );

create policy "Los usuarios actualizan los pagos de sus deudas"
  on public.debt_payments for update
  to authenticated
  using (
    exists (
      select 1 from public.debts d
      where d.id = debt_payments.debt_id
        and d.user_id = (select auth.uid())
    )
  )
  with check (
    exists (
      select 1 from public.debts d
      where d.id = debt_payments.debt_id
        and d.user_id = (select auth.uid())
    )
  );

create policy "Los usuarios eliminan los pagos de sus deudas"
  on public.debt_payments for delete
  to authenticated
  using (
    exists (
      select 1 from public.debts d
      where d.id = debt_payments.debt_id
        and d.user_id = (select auth.uid())
    )
  );


-- ----------------------------------------------------------------------------
-- FUNDS
-- ----------------------------------------------------------------------------

create policy "Los usuarios ven sus fondos"
  on public.funds for select
  to authenticated
  using (user_id = (select auth.uid()));

create policy "Los usuarios crean sus fondos"
  on public.funds for insert
  to authenticated
  with check (user_id = (select auth.uid()));

create policy "Los usuarios actualizan sus fondos"
  on public.funds for update
  to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

create policy "Los usuarios eliminan sus fondos"
  on public.funds for delete
  to authenticated
  using (user_id = (select auth.uid()));


-- ----------------------------------------------------------------------------
-- FUND_MOVEMENTS
-- Mismo patrón que debt_payments: la pertenencia se hereda del fondo.
-- ----------------------------------------------------------------------------

create policy "Los usuarios ven los movimientos de sus fondos"
  on public.fund_movements for select
  to authenticated
  using (
    exists (
      select 1 from public.funds f
      where f.id = fund_movements.fund_id
        and f.user_id = (select auth.uid())
    )
  );

create policy "Los usuarios registran movimientos en sus fondos"
  on public.fund_movements for insert
  to authenticated
  with check (
    exists (
      select 1 from public.funds f
      where f.id = fund_movements.fund_id
        and f.user_id = (select auth.uid())
    )
  );

create policy "Los usuarios actualizan los movimientos de sus fondos"
  on public.fund_movements for update
  to authenticated
  using (
    exists (
      select 1 from public.funds f
      where f.id = fund_movements.fund_id
        and f.user_id = (select auth.uid())
    )
  )
  with check (
    exists (
      select 1 from public.funds f
      where f.id = fund_movements.fund_id
        and f.user_id = (select auth.uid())
    )
  );

create policy "Los usuarios eliminan los movimientos de sus fondos"
  on public.fund_movements for delete
  to authenticated
  using (
    exists (
      select 1 from public.funds f
      where f.id = fund_movements.fund_id
        and f.user_id = (select auth.uid())
    )
  );
