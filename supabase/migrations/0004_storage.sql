-- Dijla — image storage (task 1.4)
--
-- The build brief says "public read, authenticated write". Public read is right:
-- diners scan a QR with no account and must see the food photos.
--
-- "Authenticated write" as written is NOT right for a multi-tenant app. Every
-- restaurant owner in the system is authenticated, so a single blanket write
-- policy would let any restaurant overwrite or delete a competitor's menu
-- photos. Instead, every object lives under its own restaurant's id:
--
--     menu-images/<restaurant_id>/<file>.jpg
--
-- and writes are only allowed when that first path segment matches the caller's
-- own restaurant. Reads stay open to everyone.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'menu-images',
  'menu-images',
  true,
  5242880, -- 5 MB; the client downscales before upload, this is the backstop
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update
  set public             = excluded.public,
      file_size_limit    = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

-- Anyone, signed in or not, may read. Customer menu pages depend on this.
drop policy if exists menu_images_public_read on storage.objects;
create policy menu_images_public_read on storage.objects
  for select
  using (bucket_id = 'menu-images');

-- Writes are confined to the caller's own restaurant folder.
drop policy if exists menu_images_tenant_insert on storage.objects;
create policy menu_images_tenant_insert on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'menu-images'
    and (storage.foldername(name))[1] = current_restaurant_id()::text
  );

drop policy if exists menu_images_tenant_update on storage.objects;
create policy menu_images_tenant_update on storage.objects
  for update to authenticated
  using (
    bucket_id = 'menu-images'
    and (storage.foldername(name))[1] = current_restaurant_id()::text
  )
  with check (
    bucket_id = 'menu-images'
    and (storage.foldername(name))[1] = current_restaurant_id()::text
  );

drop policy if exists menu_images_tenant_delete on storage.objects;
create policy menu_images_tenant_delete on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'menu-images'
    and (storage.foldername(name))[1] = current_restaurant_id()::text
  );
