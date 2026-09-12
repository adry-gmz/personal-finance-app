-- ============================================================================
-- 000_reset.sql
--
-- ⚠️  DESTRUCTIVO: borra TODAS las tablas de la aplicación y sus datos.
--
-- No es parte del flujo normal. Úsalo solo en desarrollo, cuando quieras
-- reconstruir el esquema desde cero ejecutando de nuevo 001, 002 y 003.
--
-- NO toca auth.users: tu cuenta y tu contraseña sobreviven. Solo elimina
-- los datos financieros y el perfil.
-- ============================================================================

drop trigger if exists on_auth_user_created on auth.users;

drop table if exists public.fund_movements cascade;
drop table if exists public.funds          cascade;
drop table if exists public.debt_payments  cascade;
drop table if exists public.debts          cascade;
drop table if exists public.transactions   cascade;
drop table if exists public.categories     cascade;
drop table if exists public.profiles       cascade;

drop function if exists public.seed_demo_data(text, boolean);
drop function if exists public.handle_new_user();
drop function if exists public.on_fund_movement_change();
drop function if exists public.refresh_fund_balance(uuid);
drop function if exists public.on_debt_payment_change();
drop function if exists public.refresh_debt_totals(uuid);

drop type if exists public.fund_movement_type;
drop type if exists public.fund_type;
drop type if exists public.debt_status;
drop type if exists public.expense_type;
drop type if exists public.transaction_type;
drop type if exists public.user_role;
