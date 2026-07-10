
-- 1) Recreate view without SECURITY DEFINER semantics (use security_invoker)
ALTER VIEW public.crm_product_stats SET (security_invoker = true);

-- 2) Lock down SECURITY DEFINER functions from anon/authenticated where direct calls aren't needed
REVOKE EXECUTE ON FUNCTION public.seed_rsf_demo_data(uuid) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.handle_new_user_role() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.is_admin(uuid) FROM PUBLIC, anon;
-- Keep has_role/is_admin executable by authenticated (used by RLS policies)

-- 3) crm_products: align to owner-or-admin ownership model
DROP POLICY IF EXISTS products_read_all_auth ON public.crm_products;
DROP POLICY IF EXISTS products_write_admin ON public.crm_products;
DROP POLICY IF EXISTS products_update_admin ON public.crm_products;
DROP POLICY IF EXISTS products_delete_admin ON public.crm_products;

CREATE POLICY products_select_owner_or_admin ON public.crm_products
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR public.is_admin(auth.uid()));

CREATE POLICY products_insert_owner ON public.crm_products
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY products_update_owner_or_admin ON public.crm_products
  FOR UPDATE TO authenticated
  USING (auth.uid() = user_id OR public.is_admin(auth.uid()))
  WITH CHECK (auth.uid() = user_id OR public.is_admin(auth.uid()));

CREATE POLICY products_delete_owner_or_admin ON public.crm_products
  FOR DELETE TO authenticated
  USING (auth.uid() = user_id OR public.is_admin(auth.uid()));
