-- Dijla — restaurant verification + signup fields (AUTH_UI_SPEC §4, §6).
--
-- The 3-step signup collects more than the old onboarding: a restaurant type, a
-- district and landmark for the informal-address problem, identity + licence
-- documents, and a verification state a new restaurant sits in until an admin
-- approves it. This migration adds those columns and a PRIVATE bucket for the
-- documents. No new function — the wizard reuses create_restaurant_with_owner
-- (0003) for the atomic restaurant+owner create, then fills these in.
--
-- Idempotent: every statement guards itself so the file re-runs cleanly.

-- ---------------------------------------------------------------------------
-- restaurants: verification state + the extra profile/location fields
-- ---------------------------------------------------------------------------
alter table restaurants
  add column if not exists verification_status text not null default 'pending'
    check (verification_status in ('pending', 'verified', 'rejected')),
  add column if not exists verification_note text,
  add column if not exists verified_at timestamptz,
  add column if not exists restaurant_type text,
  add column if not exists district text,          -- المنطقة (free-text neighbourhood)
  add column if not exists landmark text,           -- أقرب نقطة دالّة
  add column if not exists license_document_url text;

comment on column restaurants.verification_status is
  'pending -> verified | rejected (AUTH_UI_SPEC §6). A pending restaurant can
   build its menu but cannot accept live orders until an admin verifies it.';
comment on column restaurants.district is
  'Neighbourhood/region free text (المنطقة); the governorate is `area`.';

-- ---------------------------------------------------------------------------
-- profiles: phone-verified flag + identity document
-- ---------------------------------------------------------------------------
-- phone_verified stays false for now — there is no SMS provider, so email is the
-- verified anchor. The column exists so the phone-OTP path can flip it later.
alter table profiles
  add column if not exists phone_verified boolean not null default false,
  add column if not exists id_document_url text;

-- ---------------------------------------------------------------------------
-- private bucket for identity/licence documents
-- ---------------------------------------------------------------------------
-- NOT public: identity documents must never be world-readable. Objects live
-- under the owning restaurant's id — verification-docs/<restaurant_id>/<file> —
-- and are reachable only by that restaurant's own members or a platform admin,
-- via short-lived signed URLs.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'verification-docs',
  'verification-docs',
  false,
  5242880, -- 5 MB; the client compresses first, this is the backstop
  array['image/jpeg', 'image/png', 'image/webp', 'application/pdf']
)
on conflict (id) do update
  set public             = excluded.public,
      file_size_limit    = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

-- Writes confined to the caller's own restaurant folder (same shape as 0004).
drop policy if exists verification_docs_tenant_insert on storage.objects;
create policy verification_docs_tenant_insert on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'verification-docs'
    and (storage.foldername(name))[1] = current_restaurant_id()::text
  );

drop policy if exists verification_docs_tenant_update on storage.objects;
create policy verification_docs_tenant_update on storage.objects
  for update to authenticated
  using (
    bucket_id = 'verification-docs'
    and (storage.foldername(name))[1] = current_restaurant_id()::text
  )
  with check (
    bucket_id = 'verification-docs'
    and (storage.foldername(name))[1] = current_restaurant_id()::text
  );

-- Reads: the restaurant's own members, or a platform admin reviewing documents.
-- No public read policy exists for this bucket, so nobody else can read it.
drop policy if exists verification_docs_read on storage.objects;
create policy verification_docs_read on storage.objects
  for select to authenticated
  using (
    bucket_id = 'verification-docs'
    and (
      (storage.foldername(name))[1] = current_restaurant_id()::text
      or is_platform_admin()
    )
  );
