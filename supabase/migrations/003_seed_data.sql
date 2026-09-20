-- ============================================================================
-- 003_seed_data.sql
-- Datos de prueba para desarrollo.
--
-- Ejecutar DESPUÉS de 002_rls_policies.sql.
--
-- Este archivo NO inserta nada por sí solo: define una función que debes
-- llamar indicando el correo de un usuario ya registrado en la aplicación.
-- Es así porque las filas necesitan un user_id real de auth.users, y ese
-- usuario solo existe después de registrarse desde la app.
--
-- Uso, una vez creada tu cuenta:
--
--   select public.seed_demo_data('tu-correo@ejemplo.com');
--
-- Para reemplazar datos existentes (BORRA los del usuario indicado):
--
--   select public.seed_demo_data('tu-correo@ejemplo.com', true);
--
-- Todos los datos son ficticios. Las fechas se generan relativas al mes
-- actual, así que el dashboard siempre tiene algo que mostrar.
-- ============================================================================

create or replace function public.seed_demo_data(
  p_email text,
  p_reset boolean default false
)
returns text
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_user_id uuid;

  -- Primer día del mes actual y de los dos anteriores.
  v_m0 date := date_trunc('month', current_date)::date;
  v_m1 date := (date_trunc('month', current_date) - interval '1 month')::date;
  v_m2 date := (date_trunc('month', current_date) - interval '2 months')::date;

  -- Categorías de ingreso
  c_salario   uuid;
  c_extra     uuid;
  c_otros_in  uuid;

  -- Categorías de gasto
  c_comida    uuid;
  c_transpo   uuid;
  c_casa      uuid;
  c_educacion uuid;
  c_salud     uuid;
  c_entrete   uuid;
  c_compras   uuid;
  c_servicios uuid;
  c_otros_ex  uuid;

  -- Deudas y fondos
  d_lavadora  uuid;
  d_celular   uuid;
  f_casa      uuid;
  f_compu     uuid;
  f_laptop    uuid;
  f_emprende  uuid;
begin
  ---------------------------------------------------------------------------
  -- 1. Localizar al usuario
  ---------------------------------------------------------------------------
  select id into v_user_id
  from auth.users
  where lower(email) = lower(trim(p_email));

  if v_user_id is null then
    raise exception
      'No existe un usuario con el correo "%". Regístrate primero en la aplicación y vuelve a ejecutar esta función.',
      p_email;
  end if;

  ---------------------------------------------------------------------------
  -- 2. Limpiar datos previos (solo si se pidió explícitamente)
  ---------------------------------------------------------------------------
  if p_reset then
    -- El orden importa: transactions referencia categories, y los pagos y
    -- movimientos se borran en cascada con su deuda o fondo.
    delete from public.transactions where user_id = v_user_id;
    delete from public.debts         where user_id = v_user_id;
    delete from public.funds         where user_id = v_user_id;
    delete from public.categories    where user_id = v_user_id;
  elsif exists (select 1 from public.categories where user_id = v_user_id) then
    raise exception
      'El usuario "%" ya tiene datos. Para reemplazarlos ejecuta la función de nuevo con el segundo parámetro en true.',
      p_email;
  end if;

  ---------------------------------------------------------------------------
  -- 3. Categorías
  ---------------------------------------------------------------------------
  insert into public.categories (user_id, name, type, color) values
    (v_user_id, 'Salario',        'INCOME', '#16a34a') returning id into c_salario;
  insert into public.categories (user_id, name, type, color) values
    (v_user_id, 'Trabajo extra',  'INCOME', '#0d9488') returning id into c_extra;
  insert into public.categories (user_id, name, type, color) values
    (v_user_id, 'Otros ingresos', 'INCOME', '#0891b2') returning id into c_otros_in;

  insert into public.categories (user_id, name, type, color) values
    (v_user_id, 'Alimentación',   'EXPENSE', '#ef4444') returning id into c_comida;
  insert into public.categories (user_id, name, type, color) values
    (v_user_id, 'Transporte',     'EXPENSE', '#f97316') returning id into c_transpo;
  insert into public.categories (user_id, name, type, color) values
    (v_user_id, 'Casa',           'EXPENSE', '#8b5cf6') returning id into c_casa;
  insert into public.categories (user_id, name, type, color) values
    (v_user_id, 'Educación',      'EXPENSE', '#3b82f6') returning id into c_educacion;
  insert into public.categories (user_id, name, type, color) values
    (v_user_id, 'Salud',          'EXPENSE', '#ec4899') returning id into c_salud;
  insert into public.categories (user_id, name, type, color) values
    (v_user_id, 'Entretenimiento','EXPENSE', '#a855f7') returning id into c_entrete;
  insert into public.categories (user_id, name, type, color) values
    (v_user_id, 'Compras',        'EXPENSE', '#eab308') returning id into c_compras;
  insert into public.categories (user_id, name, type, color) values
    (v_user_id, 'Servicios',      'EXPENSE', '#06b6d4') returning id into c_servicios;
  insert into public.categories (user_id, name, type, color) values
    (v_user_id, 'Otros',          'EXPENSE', '#64748b') returning id into c_otros_ex;

  ---------------------------------------------------------------------------
  -- 4. Transacciones de los últimos tres meses
  --    Nota: expense_type es obligatorio en gastos y debe ser NULL en ingresos.
  ---------------------------------------------------------------------------

  -- ---- Mes actual ----
  insert into public.transactions
    (user_id, category_id, type, expense_type, description, amount, date, is_recurring)
  values
    (v_user_id, c_salario,   'INCOME',  null,      'Salario mensual',        300.00, v_m0,      true),
    (v_user_id, c_extra,     'INCOME',  null,      'Proyecto freelance',      50.00, v_m0 + 13, false),

    (v_user_id, c_servicios, 'EXPENSE', 'FIXED',    'Internet',               25.00, v_m0 + 2,  true),
    (v_user_id, c_servicios, 'EXPENSE', 'FIXED',    'Electricidad',           18.00, v_m0 + 4,  true),
    (v_user_id, c_servicios, 'EXPENSE', 'FIXED',    'Agua',                   12.00, v_m0 + 4,  true),
    (v_user_id, c_entrete,   'EXPENSE', 'FIXED',    'Suscripción de música',   9.99, v_m0 + 7,  true),
    (v_user_id, c_comida,    'EXPENSE', 'VARIABLE', 'Compra de supermercado', 45.00, v_m0 + 1,  false),
    (v_user_id, c_comida,    'EXPENSE', 'VARIABLE', 'Almuerzo',                6.50, v_m0 + 9,  false),
    (v_user_id, c_comida,    'EXPENSE', 'VARIABLE', 'Almuerzo',                8.25, v_m0 + 16, false),
    (v_user_id, c_transpo,   'EXPENSE', 'VARIABLE', 'Bus',                     1.50, v_m0 + 6,  false),
    (v_user_id, c_transpo,   'EXPENSE', 'VARIABLE', 'Combustible',            20.00, v_m0 + 11, false),
    (v_user_id, c_salud,     'EXPENSE', 'VARIABLE', 'Medicamentos',           15.00, v_m0 + 18, false),
    (v_user_id, c_compras,   'EXPENSE', 'VARIABLE', 'Ropa',                   22.00, v_m0 + 19, false);

  -- ---- Mes anterior ----
  insert into public.transactions
    (user_id, category_id, type, expense_type, description, amount, date, is_recurring)
  values
    (v_user_id, c_salario,   'INCOME',  null,      'Salario mensual',        300.00, v_m1,      true),
    (v_user_id, c_otros_in,  'INCOME',  null,      'Venta de artículo usado', 35.00, v_m1 + 20, false),

    (v_user_id, c_servicios, 'EXPENSE', 'FIXED',    'Internet',               25.00, v_m1 + 2,  true),
    (v_user_id, c_servicios, 'EXPENSE', 'FIXED',    'Electricidad',           21.50, v_m1 + 4,  true),
    (v_user_id, c_servicios, 'EXPENSE', 'FIXED',    'Agua',                   12.00, v_m1 + 4,  true),
    (v_user_id, c_entrete,   'EXPENSE', 'FIXED',    'Suscripción de música',   9.99, v_m1 + 7,  true),
    (v_user_id, c_comida,    'EXPENSE', 'VARIABLE', 'Compra de supermercado', 52.30, v_m1 + 1,  false),
    (v_user_id, c_comida,    'EXPENSE', 'VARIABLE', 'Almuerzos de la semana', 27.00, v_m1 + 12, false),
    (v_user_id, c_transpo,   'EXPENSE', 'VARIABLE', 'Bus',                    12.00, v_m1 + 8,  false),
    (v_user_id, c_casa,      'EXPENSE', 'VARIABLE', 'Artículos de limpieza',  18.75, v_m1 + 15, false),
    (v_user_id, c_educacion, 'EXPENSE', 'VARIABLE', 'Curso en línea',         30.00, v_m1 + 21, false);

  -- ---- Hace dos meses ----
  insert into public.transactions
    (user_id, category_id, type, expense_type, description, amount, date, is_recurring)
  values
    (v_user_id, c_salario,   'INCOME',  null,      'Salario mensual',        300.00, v_m2,      true),

    (v_user_id, c_servicios, 'EXPENSE', 'FIXED',    'Internet',               25.00, v_m2 + 2,  true),
    (v_user_id, c_servicios, 'EXPENSE', 'FIXED',    'Electricidad',           19.80, v_m2 + 4,  true),
    (v_user_id, c_servicios, 'EXPENSE', 'FIXED',    'Agua',                   12.00, v_m2 + 4,  true),
    (v_user_id, c_entrete,   'EXPENSE', 'FIXED',    'Suscripción de música',   9.99, v_m2 + 7,  true),
    (v_user_id, c_comida,    'EXPENSE', 'VARIABLE', 'Compra de supermercado', 48.60, v_m2 + 1,  false),
    (v_user_id, c_transpo,   'EXPENSE', 'VARIABLE', 'Bus',                    10.50, v_m2 + 9,  false),
    (v_user_id, c_otros_ex,  'EXPENSE', 'VARIABLE', 'Regalo de cumpleaños',   25.00, v_m2 + 14, false);

  ---------------------------------------------------------------------------
  -- 5. Deudas y sus pagos
  --    No escribimos paid_amount: lo calcula el trigger desde los pagos.
  ---------------------------------------------------------------------------
  insert into public.debts (user_id, name, total_amount, due_date, status)
  values (v_user_id, 'Lavadora', 120.00, v_m0 + 25, 'ACTIVE')
  returning id into d_lavadora;

  insert into public.debt_payments (debt_id, amount, date, description) values
    (d_lavadora, 40.00, v_m2 + 5, 'Primera cuota'),
    (d_lavadora, 40.00, v_m1 + 5, 'Segunda cuota');

  insert into public.debts (user_id, name, total_amount, interest_rate, due_date, status)
  values (v_user_id, 'Celular', 300.00, 5.00, v_m0 + 20, 'ACTIVE')
  returning id into d_celular;

  insert into public.debt_payments (debt_id, amount, date, description) values
    (d_celular, 50.00, v_m2 + 10, 'Cuota mensual'),
    (d_celular, 50.00, v_m1 + 10, 'Cuota mensual'),
    (d_celular, 50.00, v_m0 + 10, 'Cuota mensual');

  ---------------------------------------------------------------------------
  -- 6. Fondos y sus movimientos
  --    Tampoco escribimos current_amount: lo calcula el trigger.
  ---------------------------------------------------------------------------

  -- Provisiones: dinero por si ocurre algo
  insert into public.funds (user_id, name, type, target_amount)
  values (v_user_id, 'Emergencia de casa', 'PROVISION', 500.00)
  returning id into f_casa;

  insert into public.fund_movements (fund_id, type, amount, date, description) values
    (f_casa, 'CONTRIBUTION', 60.00, v_m2 + 2,  'Aporte mensual'),
    (f_casa, 'CONTRIBUTION', 60.00, v_m1 + 2,  'Aporte mensual'),
    (f_casa, 'CONTRIBUTION', 60.00, v_m0 + 2,  'Aporte mensual');

  insert into public.funds (user_id, name, type, target_amount)
  values (v_user_id, 'Reparación de computadora', 'PROVISION', 300.00)
  returning id into f_compu;

  insert into public.fund_movements (fund_id, type, amount, date, description) values
    (f_compu, 'CONTRIBUTION', 40.00, v_m1 + 3, 'Aporte mensual'),
    (f_compu, 'CONTRIBUTION', 40.00, v_m0 + 3, 'Aporte mensual'),
    (f_compu, 'WITHDRAWAL',   20.00, v_m0 + 15, 'Cambio de teclado');

  -- Ahorros: dinero para conseguir algo
  insert into public.funds (user_id, name, type, target_amount, target_date)
  values (v_user_id, 'Laptop', 'SAVING', 800.00, (v_m0 + interval '8 months')::date)
  returning id into f_laptop;

  insert into public.fund_movements (fund_id, type, amount, date, description) values
    (f_laptop, 'CONTRIBUTION', 100.00, v_m2 + 6, 'Aporte mensual'),
    (f_laptop, 'CONTRIBUTION',  75.00, v_m1 + 6, 'Aporte mensual'),
    (f_laptop, 'CONTRIBUTION',  75.00, v_m0 + 6, 'Aporte mensual');

  insert into public.funds (user_id, name, type, target_amount, target_date)
  values (v_user_id, 'Emprendimiento', 'SAVING', 1000.00, (v_m0 + interval '14 months')::date)
  returning id into f_emprende;

  insert into public.fund_movements (fund_id, type, amount, date, description) values
    (f_emprende, 'CONTRIBUTION', 60.00, v_m1 + 18, 'Aporte'),
    (f_emprende, 'CONTRIBUTION', 60.00, v_m0 + 18, 'Aporte');

  ---------------------------------------------------------------------------
  -- 7. Resumen
  ---------------------------------------------------------------------------
  return format(
    'Datos de prueba creados para %s: %s categorías, %s transacciones, %s deudas, %s fondos.',
    p_email,
    (select count(*) from public.categories    where user_id = v_user_id),
    (select count(*) from public.transactions  where user_id = v_user_id),
    (select count(*) from public.debts         where user_id = v_user_id),
    (select count(*) from public.funds         where user_id = v_user_id)
  );
end;
$$;

comment on function public.seed_demo_data(text, boolean) is
  'Crea datos ficticios de desarrollo para el usuario con el correo indicado.';


-- ============================================================================
-- PERMISOS DE LA FUNCIÓN
--
-- Imprescindible. PostgreSQL concede EXECUTE a todo el mundo sobre cada
-- función nueva, y Supabase las publica automáticamente como endpoints REST
-- en /rest/v1/rpc/. Sin este revoke, cualquiera con la Publishable key
-- (es decir, cualquiera que abra la aplicación) podría llamar:
--
--     seed_demo_data('correo-de-otro@ejemplo.com', true)
--
-- y borrar todos los datos financieros de ese usuario, porque la función es
-- SECURITY DEFINER y por tanto se salta las políticas RLS.
--
-- Al revocarlo, solo queda accesible desde el SQL Editor, que es su único
-- uso legítimo: sembrar datos de desarrollo.
-- ============================================================================

revoke all on function public.seed_demo_data(text, boolean)
  from public, anon, authenticated;
