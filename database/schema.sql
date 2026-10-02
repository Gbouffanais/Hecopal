-- Bootstrap para un proyecto Supabase nuevo; no modifica tablas existentes.
begin;
create schema if not exists hecopal;
revoke all on schema hecopal from public, anon, authenticated;
create table if not exists hecopal.accounts (
 id uuid primary key references auth.users(id),
 name text not null,
 role text not null default 'user' check(role in ('user','employee','admin'))
);
create table if not exists hecopal.state (
 id integer primary key check(id=1),
 value jsonb not null
);
alter table hecopal.accounts enable row level security;
alter table hecopal.state enable row level security;
revoke all on all tables in schema hecopal from public, anon, authenticated;
insert into hecopal.state(id,value)
values(1,'{"products":[],"lots":[],"reservations":[],"invoices":[],"audit":[]}'::jsonb)
on conflict(id) do nothing;
commit;
-- El servidor usa la conexión PostgreSQL de confianza; no se expone este esquema a la Data API.
-- Después de que la persona inicie sesión una vez, asignar desde el editor SQL:
-- update hecopal.accounts set role='admin' where id='<UUID del administrador>';
-- update hecopal.accounts set role='employee' where id='<UUID del empleado>';

alter table hecopal.accounts add column if not exists email text not null default '', add column if not exists phone text not null default '', add column if not exists company text not null default '', add column if not exists preferred_grade text not null default '' check(preferred_grade in ('','Primera','Segunda','Tercera')), add column if not exists created_at timestamptz not null default now();

