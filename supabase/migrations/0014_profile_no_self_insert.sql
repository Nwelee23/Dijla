-- Dijla — a user cannot conjure their own membership (critical)
--
-- own_profile (0002) was `for all`, which includes INSERT. 0012 guarded UPDATE
-- against self-escalation but left INSERT wide open, and the two combine into a
-- full tenant takeover:
--
--   A brand-new account — email OTP is enough — has no profile row yet. Nothing
--   stopped it from INSERTing one for itself with role 'owner' and
--   restaurant_id set to any victim. And the victim's id is not secret:
--   get_menu_by_slug hands it to anyone who opens the public menu link. So an
--   attacker signs up, reads a restaurant's id from its /r/<slug> page, inserts
--   { id: self, restaurant_id: victim, role: 'owner' }, and is_restaurant_staff()
--   then makes them staff of that restaurant — every order, every customer's
--   name, phone and pin.
--
--   Verified end to end before this fix: the insert succeeded and the attacker's
--   session immediately read the victim's live orders.
--
-- The fix is to stop a user session creating or destroying a profile at all.
-- Every legitimate write to profiles already comes from a path that bypasses
-- RLS: onboarding through create_restaurant_with_owner (SECURITY DEFINER, owned
-- by postgres), and driver registration through the service_role key. Neither
-- needs — nor ever used — the own_profile INSERT grant. A user session keeps
-- exactly what it should: read its own row, and update the parts of it that are
-- genuinely theirs (driver_status, name, phone), still fenced by the 0012 guard
-- against role, restaurant and active-state changes.
--
-- own_profile is therefore split from `for all` into read + update only. No
-- INSERT policy and no DELETE policy means a user session can do neither: a
-- command with no permissive policy is denied.

drop policy if exists own_profile on profiles;

create policy own_profile_read on profiles
  for select to authenticated
  using (id = auth.uid());

create policy own_profile_update on profiles
  for update to authenticated
  using (id = auth.uid())
  with check (id = auth.uid());
