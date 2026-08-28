-- Canonical public content, admissions reference, contact intake and gallery image metadata.
alter table public.applications add column if not exists reference text;
update public.applications set reference = 'APP-' || upper(substr(replace(id::text,'-',''),1,10)) where reference is null;
alter table public.applications alter column reference set default ('APP-' || upper(substr(replace(gen_random_uuid()::text,'-',''),1,10)));
alter table public.applications alter column reference set not null;
create unique index if not exists applications_reference_unique on public.applications(reference);

create table if not exists public.content_pages (id uuid primary key default gen_random_uuid(), slug text not null unique, title text not null, headline text, body jsonb not null default '{}'::jsonb, status text not null default 'Draft' check (status in ('Draft','Published','Archived')), published_at timestamptz, created_by uuid references public.profiles(id), created_at timestamptz not null default now(), updated_at timestamptz not null default now());
create table if not exists public.news_articles (id uuid primary key default gen_random_uuid(), title text not null, slug text not null unique, excerpt text, body text not null, status text not null default 'Draft' check (status in ('Draft','Published','Archived')), published_at timestamptz, created_by uuid references public.profiles(id), created_at timestamptz not null default now(), updated_at timestamptz not null default now());
create table if not exists public.contact_submissions (id uuid primary key default gen_random_uuid(), name text not null, email text, phone text, subject text, message text not null, status text not null default 'New' check (status in ('New','Read','Archived')), read_at timestamptz, created_at timestamptz not null default now(), updated_at timestamptz not null default now());
create table if not exists public.gallery_images (id uuid primary key default gen_random_uuid(), album_id uuid not null references public.gallery_albums(id) on delete cascade, document_id uuid not null references public.documents(id) on delete restrict, caption text, sort_order integer not null default 0, created_at timestamptz not null default now(), unique(album_id, document_id));

create or replace function public.is_content_admin() returns boolean language sql stable security definer set search_path = public as $$ select exists (select 1 from public.profiles p where p.id = (select auth.uid()) and not p.is_disabled and p.role in ('admin','head_of_institution','deputy_hoi')); $$;
revoke all on function public.is_content_admin() from public, anon; grant execute on function public.is_content_admin() to authenticated;

alter table public.content_pages enable row level security; alter table public.news_articles enable row level security; alter table public.contact_submissions enable row level security; alter table public.gallery_images enable row level security;
create policy content_pages_public_published on public.content_pages for select using (status = 'Published' or public.is_content_admin());
create policy content_pages_admin_write on public.content_pages for all to authenticated using (public.is_content_admin()) with check (public.is_content_admin());
create policy news_public_published on public.news_articles for select using (status = 'Published' or public.is_content_admin());
create policy news_admin_write on public.news_articles for all to authenticated using (public.is_content_admin()) with check (public.is_content_admin());
create policy contacts_public_submit on public.contact_submissions for insert to anon, authenticated with check (true);
create policy contacts_admin_read on public.contact_submissions for select to authenticated using (public.is_content_admin());
create policy contacts_admin_update on public.contact_submissions for update to authenticated using (public.is_content_admin()) with check (public.is_content_admin());
create policy applications_public_submit on public.applications for insert to anon, authenticated with check (status = 'Submitted');
create policy applications_admin_read on public.applications for select to authenticated using (public.is_content_admin());
create policy applications_admin_update on public.applications for update to authenticated using (public.is_content_admin()) with check (public.is_content_admin());
create policy gallery_images_public_read on public.gallery_images for select using (exists (select 1 from public.gallery_albums a where a.id = album_id and a.status = 'Published') or public.is_content_admin());
create policy gallery_images_admin_write on public.gallery_images for all to authenticated using (public.is_content_admin()) with check (public.is_content_admin());
