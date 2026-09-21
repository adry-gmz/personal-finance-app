-- ============================================================================
-- 004_debt_details_and_loans.sql
--
-- 1. Deudas: tipo, monto original, cuotas e interés desglosado.
-- 2. Por cobrar: dinero que el usuario prestó a otras personas.
--
-- Ejecutar DESPUÉS de 003_seed_data.sql.
-- ============================================================================


-- ============================================================================
-- 0. CERRAR LAS FUNCIONES INTERNAS DE 001
--
-- Las funciones de los triggers son SECURITY DEFINER y, como toda función
-- nueva, quedaron ejecutables por cualquiera y publicadas en /rest/v1/rpc/.
-- Se comprobó que una llamada anónima a refresh_debt_totals respondía 204.
--
-- El riesgo era bajo: solo recalculan el saldo a su valor correcto y no
-- devuelven datos. Pero se saltan RLS y nada fuera de un trigger debería
-- invocarlas, así que se cierran igual que seed_demo_data en 003.
-- ============================================================================

-- Solo las que reciben parámetros: las de tipo trigger (on_*_change,
-- handle_new_user) ya son imposibles de llamar fuera de un trigger.
-- Los triggers siguen funcionando porque invocan estas funciones desde otra
-- función SECURITY DEFINER, que corre como su dueño y conserva el permiso.
revoke all on function public.refresh_debt_totals(uuid)  from public, anon, authenticated;
revoke all on function public.refresh_fund_balance(uuid) from public, anon, authenticated;


-- ============================================================================
-- 1. DETALLE DE LAS DEUDAS
--
-- total_amount sigue siendo lo que se debe pagar en total (con interés), y
-- es contra lo que el trigger compara los pagos. Las columnas nuevas son
-- opcionales y sirven para mostrar de dónde sale ese total:
--
--   principal_amount   lo que se pidió prestado o costó la compra
--   installments       número de cuotas
--   installment_amount valor de cada cuota
--
-- El interés pagado se calcula: total_amount - principal_amount.
-- ============================================================================

create type public.debt_type as enum ('LOAN', 'CREDIT_CARD', 'OTHER');

alter table public.debts
  add column debt_type          public.debt_type not null default 'OTHER',
  add column principal_amount   numeric(14, 2) check (principal_amount > 0),
  add column installments       smallint check (installments between 1 and 600),
  add column installment_amount numeric(14, 2) check (installment_amount > 0),

  -- El interés no puede ser negativo: lo prestado nunca supera lo que se paga.
  add constraint debts_principal_not_above_total
    check (principal_amount is null or principal_amount <= total_amount);

-- 001 concedió UPDATE solo sobre columnas concretas de debts. Las columnas
-- nuevas no están incluidas y hay que concederlas explícitamente.
grant update (debt_type, principal_amount, installments, installment_amount)
  on public.debts to authenticated;


-- ============================================================================
-- 2. POR COBRAR
--
-- Es el reflejo de debts: allí el usuario debe, aquí le deben a él. Mismo
-- patrón: un historial de cobros y un saldo mantenido por trigger.
--
-- El interés lo define el usuario. interest_rate guarda el porcentaje tal
-- como lo acordó, y total_amount lo que espera recibir en total. La app
-- propone un total a partir del porcentaje, pero el usuario puede cambiarlo,
-- porque la forma de cobrar el interés varía de un acuerdo a otro.
-- ============================================================================

create type public.loan_status as enum ('ACTIVE', 'PAID', 'CANCELLED');

create table public.loans (
  id               uuid primary key default gen_random_uuid(),
  user_id          uuid not null references public.profiles (id) on delete cascade,
  borrower_name    text not null check (char_length(trim(borrower_name)) > 0),
  principal_amount numeric(14, 2) not null check (principal_amount > 0),
  interest_rate    numeric(6, 2) check (interest_rate >= 0),
  total_amount     numeric(14, 2) not null check (total_amount > 0),

  -- Derivado de loan_repayments. No se edita manualmente (ver permisos).
  received_amount  numeric(14, 2) not null default 0 check (received_amount >= 0),

  loan_date        date not null default current_date,
  due_date         date,
  status           public.loan_status not null default 'ACTIVE',
  notes            text not null default '',
  created_at       timestamptz not null default now(),

  constraint loans_total_not_below_principal check (total_amount >= principal_amount)
);

create index loans_user_status_idx on public.loans (user_id, status);

create table public.loan_repayments (
  id          uuid primary key default gen_random_uuid(),
  loan_id     uuid not null references public.loans (id) on delete cascade,
  amount      numeric(14, 2) not null check (amount > 0),
  date        date not null default current_date,
  description text not null default '',
  created_at  timestamptz not null default now()
);

create index loan_repayments_loan_date_idx on public.loan_repayments (loan_id, date desc);


-- --- Trigger: saldo cobrado --------------------------------------------------

create or replace function public.refresh_loan_totals(p_loan_id uuid)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_received numeric(14, 2);
  v_total    numeric(14, 2);
begin
  select coalesce(sum(amount), 0) into v_received
  from public.loan_repayments
  where loan_id = p_loan_id;

  select total_amount into v_total
  from public.loans
  where id = p_loan_id;

  if v_total is null then
    return; -- el préstamo ya fue eliminado
  end if;

  update public.loans
  set received_amount = v_received,
      status = case
        when status = 'CANCELLED' then status
        when v_received >= v_total then 'PAID'::public.loan_status
        else 'ACTIVE'::public.loan_status
      end
  where id = p_loan_id;
end;
$$;

create or replace function public.on_loan_repayment_change()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if tg_op in ('UPDATE', 'DELETE') then
    perform public.refresh_loan_totals(old.loan_id);
  end if;

  if tg_op in ('INSERT', 'UPDATE') then
    perform public.refresh_loan_totals(new.loan_id);
  end if;

  return null;
end;
$$;

create trigger loan_repayments_refresh_totals
  after insert or update or delete on public.loan_repayments
  for each row execute function public.on_loan_repayment_change();

-- Estas funciones solo deben ejecutarse desde los triggers. Sin esto serían
-- invocables por la API como /rpc/refresh_loan_totals.
revoke all on function public.refresh_loan_totals(uuid) from public, anon, authenticated;


-- --- Permisos por columna ----------------------------------------------------

revoke update on public.loans from anon, authenticated;
grant  update (borrower_name, principal_amount, interest_rate, total_amount,
               loan_date, due_date, status, notes)
  on public.loans to authenticated;


-- --- RLS ---------------------------------------------------------------------

alter table public.loans           enable row level security;
alter table public.loan_repayments enable row level security;

create policy "Los usuarios ven sus préstamos"
  on public.loans for select to authenticated
  using (user_id = (select auth.uid()));

create policy "Los usuarios crean sus préstamos"
  on public.loans for insert to authenticated
  with check (user_id = (select auth.uid()));

create policy "Los usuarios actualizan sus préstamos"
  on public.loans for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

create policy "Los usuarios eliminan sus préstamos"
  on public.loans for delete to authenticated
  using (user_id = (select auth.uid()));

-- Los cobros heredan la pertenencia del préstamo, igual que debt_payments.
create policy "Los usuarios ven los cobros de sus préstamos"
  on public.loan_repayments for select to authenticated
  using (exists (
    select 1 from public.loans l
    where l.id = loan_repayments.loan_id and l.user_id = (select auth.uid())
  ));

create policy "Los usuarios registran cobros en sus préstamos"
  on public.loan_repayments for insert to authenticated
  with check (exists (
    select 1 from public.loans l
    where l.id = loan_repayments.loan_id and l.user_id = (select auth.uid())
  ));

create policy "Los usuarios actualizan los cobros de sus préstamos"
  on public.loan_repayments for update to authenticated
  using (exists (
    select 1 from public.loans l
    where l.id = loan_repayments.loan_id and l.user_id = (select auth.uid())
  ))
  with check (exists (
    select 1 from public.loans l
    where l.id = loan_repayments.loan_id and l.user_id = (select auth.uid())
  ));

create policy "Los usuarios eliminan los cobros de sus préstamos"
  on public.loan_repayments for delete to authenticated
  using (exists (
    select 1 from public.loans l
    where l.id = loan_repayments.loan_id and l.user_id = (select auth.uid())
  ));
