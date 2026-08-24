-- Fix duplicate foreign-key relationships on asset_assignments.asset_person_id.
-- PostgREST cannot infer which relationship to use when embedding asset_people
-- if both constraints exist, causing the By User assignment detail query to fail.

alter table public.asset_assignments
  drop constraint if exists asset_assignments_asset_person_fk;

-- Keep the canonical constraint created by the original asset-assignment schema:
-- asset_assignments_asset_person_id_fkey -> public.asset_people(id)
