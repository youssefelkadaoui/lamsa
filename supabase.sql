-- شغّلي هذا الملف مرة واحدة في Supabase SQL Editor
create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  category text not null,
  price numeric(10, 2),
  original_price numeric(10, 2) not null default 0 check (original_price >= 0),
  new_price numeric(10, 2) not null default 0 check (new_price >= 0),
  image text,
  images text default '[]',
  description text,
  stock_status text not null default 'in_stock' check (stock_status in ('in_stock', 'low_stock')),
  is_offer boolean not null default false,
  offer_discount text,
  offer_expires_at timestamptz,
  created_at timestamptz not null default now()
);

alter table public.products add column if not exists images text default '[]';
alter table public.products add column if not exists original_price numeric(10, 2);
alter table public.products add column if not exists new_price numeric(10, 2);
alter table public.products add column if not exists stock_status text;
alter table public.products add column if not exists is_offer boolean;
alter table public.products add column if not exists offer_discount text;
alter table public.products add column if not exists offer_expires_at timestamptz;
update public.products set new_price = coalesce(new_price, price, 0), original_price = coalesce(original_price, price, new_price, 0);
update public.products set stock_status = 'in_stock' where stock_status is null;
update public.products set is_offer = false where is_offer is null;
alter table public.products alter column price drop not null;
alter table public.products alter column original_price set default 0;
alter table public.products alter column new_price set default 0;
alter table public.products alter column original_price set not null;
alter table public.products alter column new_price set not null;
alter table public.products alter column stock_status set default 'in_stock';
alter table public.products alter column stock_status set not null;
alter table public.products alter column is_offer set default false;
alter table public.products alter column is_offer set not null;
alter table public.products drop constraint if exists products_price_check;
alter table public.products drop constraint if exists products_original_price_check;
alter table public.products drop constraint if exists products_new_price_check;
alter table public.products drop constraint if exists products_stock_status_check;
alter table public.products add constraint products_original_price_check check (original_price >= 0);
alter table public.products add constraint products_new_price_check check (new_price >= 0);
alter table public.products add constraint products_stock_status_check check (stock_status in ('in_stock', 'low_stock'));

create table if not exists public.offers (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  discount text,
  starts_at timestamptz not null default now(),
  expires_at timestamptz not null,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

alter table public.offers add column if not exists discount text;
alter table public.offers add column if not exists starts_at timestamptz;
update public.offers set starts_at = coalesce(starts_at, created_at, now()) where starts_at is null;
alter table public.offers alter column starts_at set default now();
alter table public.offers alter column starts_at set not null;

alter table public.offers enable row level security;

drop policy if exists "الزوار يقرأون العروض" on public.offers;
create policy "الزوار يقرأون العروض"
  on public.offers for select
  using (active = true and starts_at <= now() and expires_at > now());

drop policy if exists "الأدمن يدير العروض" on public.offers;
create policy "الأدمن يدير العروض"
  on public.offers for all
  to authenticated
  using ((auth.jwt() -> 'user_metadata' ->> 'is_admin') = 'true')
  with check ((auth.jwt() -> 'user_metadata' ->> 'is_admin') = 'true');

alter table public.products enable row level security;

drop policy if exists "الزوار يقرأون المنتجات" on public.products;
create policy "الزوار يقرأون المنتجات"
  on public.products for select
  using (true);

drop policy if exists "الأدمن يضيف المنتجات" on public.products;
create policy "الأدمن يضيف المنتجات"
  on public.products for insert
  to authenticated
  with check ((auth.jwt() -> 'user_metadata' ->> 'is_admin') = 'true');

drop policy if exists "الأدمن يحذف المنتجات" on public.products;
create policy "الأدمن يحذف المنتجات"
  on public.products for delete
  to authenticated
  using ((auth.jwt() -> 'user_metadata' ->> 'is_admin') = 'true');