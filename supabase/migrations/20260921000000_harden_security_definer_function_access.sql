-- Harden SECURITY DEFINER RPC exposure and pin trigger search_path.
REVOKE EXECUTE ON FUNCTION public.admin_update_user_display_name(uuid, text) FROM anon;
REVOKE EXECUTE ON FUNCTION public.is_current_user_admin() FROM anon;
REVOKE EXECUTE ON FUNCTION public.next_asset_code(text) FROM anon;

-- Trigger-only functions must not be exposed as RPC endpoints.
REVOKE EXECUTE ON FUNCTION public.guard_app_users_privilege_escalation() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.sync_user_name_to_asset_records() FROM PUBLIC;

-- The function performs its own admin check and app_users RLS protects the update.
ALTER FUNCTION public.admin_update_user_display_name(uuid, text) SECURITY INVOKER;

ALTER FUNCTION public.set_asset_people_updated_at() SET search_path = public, pg_temp;
