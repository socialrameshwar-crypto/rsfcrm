
-- ============ ENUMS ============
DO $$ BEGIN
  CREATE TYPE public.app_role AS ENUM ('admin','sales');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.lead_stage AS ENUM ('New','Contacted','Quotation Sent','Negotiation','Won','Lost');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.order_status AS ENUM ('Pending','In Production','Quality Check','Dispatched','Delivered');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.quote_status AS ENUM ('Draft','Sent','Accepted','Rejected','Expired');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.product_status AS ENUM ('In Stock','Made to Order');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ============ USER ROLES ============
CREATE TABLE IF NOT EXISTS public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role);
$$;

CREATE OR REPLACE FUNCTION public.is_admin(_user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = 'admin');
$$;

DO $$ BEGIN
  CREATE POLICY "roles_self_read" ON public.user_roles FOR SELECT TO authenticated USING (user_id = auth.uid() OR public.is_admin(auth.uid()));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE POLICY "roles_admin_all" ON public.user_roles FOR ALL TO authenticated USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Auto-assign role on signup: first user becomes admin, rest sales
CREATE OR REPLACE FUNCTION public.handle_new_user_role()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE user_count int;
BEGIN
  SELECT COUNT(*) INTO user_count FROM public.user_roles;
  IF user_count = 0 THEN
    INSERT INTO public.user_roles(user_id, role) VALUES (NEW.id, 'admin');
  ELSE
    INSERT INTO public.user_roles(user_id, role) VALUES (NEW.id, 'sales');
  END IF;
  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS on_auth_user_created_role ON auth.users;
CREATE TRIGGER on_auth_user_created_role
  AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_user_role();

-- ============ SHARED ============
CREATE OR REPLACE FUNCTION public.tg_set_updated_at()
RETURNS trigger LANGUAGE plpgsql SET search_path=public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

-- ============ CRM COMPANIES ============
CREATE TABLE IF NOT EXISTS public.crm_companies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid(),
  company_name text NOT NULL,
  type text NOT NULL DEFAULT 'Domestic', -- Domestic | Export
  country text,
  state text,
  address text,
  gstin text,
  contacts jsonb NOT NULL DEFAULT '[]'::jsonb,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.crm_companies TO authenticated;
GRANT ALL ON public.crm_companies TO service_role;
ALTER TABLE public.crm_companies ENABLE ROW LEVEL SECURITY;
CREATE POLICY "companies_read" ON public.crm_companies FOR SELECT TO authenticated USING (public.is_admin(auth.uid()) OR user_id = auth.uid());
CREATE POLICY "companies_write_own" ON public.crm_companies FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "companies_update" ON public.crm_companies FOR UPDATE TO authenticated USING (public.is_admin(auth.uid()) OR user_id = auth.uid());
CREATE POLICY "companies_delete_admin" ON public.crm_companies FOR DELETE TO authenticated USING (public.is_admin(auth.uid()));
CREATE TRIGGER trg_companies_updated BEFORE UPDATE ON public.crm_companies FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

-- ============ CRM PRODUCTS ============
CREATE TABLE IF NOT EXISTS public.crm_products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid(),
  name text NOT NULL,
  category text NOT NULL DEFAULT 'Soap Making Machinery',
  description text,
  domestic_price_inr numeric(14,2) NOT NULL DEFAULT 0,
  gst_pct numeric(5,2) NOT NULL DEFAULT 18,
  export_price_usd numeric(14,2) NOT NULL DEFAULT 0,
  hsn_code text,
  production_status public.product_status NOT NULL DEFAULT 'Made to Order',
  image_url text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.crm_products TO authenticated;
GRANT ALL ON public.crm_products TO service_role;
ALTER TABLE public.crm_products ENABLE ROW LEVEL SECURITY;
CREATE POLICY "products_read_all_auth" ON public.crm_products FOR SELECT TO authenticated USING (true);
CREATE POLICY "products_write_admin" ON public.crm_products FOR INSERT TO authenticated WITH CHECK (public.is_admin(auth.uid()));
CREATE POLICY "products_update_admin" ON public.crm_products FOR UPDATE TO authenticated USING (public.is_admin(auth.uid()));
CREATE POLICY "products_delete_admin" ON public.crm_products FOR DELETE TO authenticated USING (public.is_admin(auth.uid()));
CREATE TRIGGER trg_products_updated BEFORE UPDATE ON public.crm_products FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

-- ============ CRM LEADS ============
CREATE TABLE IF NOT EXISTS public.crm_leads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid(),
  company_id uuid REFERENCES public.crm_companies(id) ON DELETE SET NULL,
  company_name text NOT NULL,
  contact_person text,
  phone text,
  email text,
  country text NOT NULL DEFAULT 'India',
  source text NOT NULL DEFAULT 'Website',
  product_id uuid REFERENCES public.crm_products(id) ON DELETE SET NULL,
  stage public.lead_stage NOT NULL DEFAULT 'New',
  assigned_to uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  notes text,
  last_followup_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.crm_leads TO authenticated;
GRANT ALL ON public.crm_leads TO service_role;
ALTER TABLE public.crm_leads ENABLE ROW LEVEL SECURITY;
CREATE POLICY "leads_read" ON public.crm_leads FOR SELECT TO authenticated USING (public.is_admin(auth.uid()) OR assigned_to = auth.uid() OR user_id = auth.uid());
CREATE POLICY "leads_insert" ON public.crm_leads FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "leads_update" ON public.crm_leads FOR UPDATE TO authenticated USING (public.is_admin(auth.uid()) OR assigned_to = auth.uid() OR user_id = auth.uid());
CREATE POLICY "leads_delete_admin" ON public.crm_leads FOR DELETE TO authenticated USING (public.is_admin(auth.uid()));
CREATE TRIGGER trg_leads_updated BEFORE UPDATE ON public.crm_leads FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

-- ============ QUOTATIONS ============
CREATE SEQUENCE IF NOT EXISTS public.crm_quote_seq START 1;

CREATE TABLE IF NOT EXISTS public.crm_quotations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid(),
  quote_no text UNIQUE,
  lead_id uuid REFERENCES public.crm_leads(id) ON DELETE SET NULL,
  company_id uuid REFERENCES public.crm_companies(id) ON DELETE SET NULL,
  quote_date date NOT NULL DEFAULT CURRENT_DATE,
  payment_terms text DEFAULT '50% advance, 50% before dispatch',
  validity_days int NOT NULL DEFAULT 30,
  currency text NOT NULL DEFAULT 'INR',
  subtotal numeric(14,2) NOT NULL DEFAULT 0,
  tax_mode text NOT NULL DEFAULT 'igst', -- cgst_sgst | igst | export
  cgst numeric(14,2) NOT NULL DEFAULT 0,
  sgst numeric(14,2) NOT NULL DEFAULT 0,
  igst numeric(14,2) NOT NULL DEFAULT 0,
  grand_total numeric(14,2) NOT NULL DEFAULT 0,
  status public.quote_status NOT NULL DEFAULT 'Draft',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.crm_quotations TO authenticated;
GRANT ALL ON public.crm_quotations TO service_role;
ALTER TABLE public.crm_quotations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "quotes_read" ON public.crm_quotations FOR SELECT TO authenticated USING (public.is_admin(auth.uid()) OR user_id = auth.uid());
CREATE POLICY "quotes_insert" ON public.crm_quotations FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "quotes_update" ON public.crm_quotations FOR UPDATE TO authenticated USING (public.is_admin(auth.uid()) OR user_id = auth.uid());
CREATE POLICY "quotes_delete_admin" ON public.crm_quotations FOR DELETE TO authenticated USING (public.is_admin(auth.uid()));
CREATE TRIGGER trg_quotes_updated BEFORE UPDATE ON public.crm_quotations FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

CREATE OR REPLACE FUNCTION public.assign_quote_no()
RETURNS trigger LANGUAGE plpgsql SET search_path=public AS $$
BEGIN
  IF NEW.quote_no IS NULL THEN
    NEW.quote_no := 'RSF-QT-' || LPAD(nextval('public.crm_quote_seq')::text, 4, '0');
  END IF;
  RETURN NEW;
END; $$;
DROP TRIGGER IF EXISTS trg_quote_no ON public.crm_quotations;
CREATE TRIGGER trg_quote_no BEFORE INSERT ON public.crm_quotations FOR EACH ROW EXECUTE FUNCTION public.assign_quote_no();

CREATE TABLE IF NOT EXISTS public.crm_quotation_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  quotation_id uuid NOT NULL REFERENCES public.crm_quotations(id) ON DELETE CASCADE,
  product_id uuid REFERENCES public.crm_products(id) ON DELETE SET NULL,
  product_name text NOT NULL,
  qty numeric(12,2) NOT NULL DEFAULT 1,
  unit_price numeric(14,2) NOT NULL DEFAULT 0,
  line_total numeric(14,2) NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.crm_quotation_items TO authenticated;
GRANT ALL ON public.crm_quotation_items TO service_role;
ALTER TABLE public.crm_quotation_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "qitems_all" ON public.crm_quotation_items FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.crm_quotations q WHERE q.id = quotation_id AND (public.is_admin(auth.uid()) OR q.user_id = auth.uid())))
  WITH CHECK (EXISTS (SELECT 1 FROM public.crm_quotations q WHERE q.id = quotation_id AND (public.is_admin(auth.uid()) OR q.user_id = auth.uid())));

CREATE OR REPLACE VIEW public.crm_product_stats AS
  SELECT p.id AS product_id, COUNT(qi.id)::int AS quotation_count
  FROM public.crm_products p
  LEFT JOIN public.crm_quotation_items qi ON qi.product_id = p.id
  GROUP BY p.id;
GRANT SELECT ON public.crm_product_stats TO authenticated;

-- ============ ORDERS ============
CREATE TABLE IF NOT EXISTS public.crm_orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid(),
  order_no text,
  quotation_id uuid REFERENCES public.crm_quotations(id) ON DELETE SET NULL,
  order_date date NOT NULL DEFAULT CURRENT_DATE,
  production_status public.order_status NOT NULL DEFAULT 'Pending',
  expected_dispatch date,
  actual_dispatch date,
  transport_details text,
  order_value numeric(14,2) NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.crm_orders TO authenticated;
GRANT ALL ON public.crm_orders TO service_role;
ALTER TABLE public.crm_orders ENABLE ROW LEVEL SECURITY;
CREATE POLICY "orders_read" ON public.crm_orders FOR SELECT TO authenticated USING (public.is_admin(auth.uid()) OR user_id = auth.uid());
CREATE POLICY "orders_insert" ON public.crm_orders FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "orders_update" ON public.crm_orders FOR UPDATE TO authenticated USING (public.is_admin(auth.uid()) OR user_id = auth.uid());
CREATE POLICY "orders_delete_admin" ON public.crm_orders FOR DELETE TO authenticated USING (public.is_admin(auth.uid()));
CREATE TRIGGER trg_orders_updated BEFORE UPDATE ON public.crm_orders FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

CREATE SEQUENCE IF NOT EXISTS public.crm_order_seq START 1;
CREATE OR REPLACE FUNCTION public.assign_order_no()
RETURNS trigger LANGUAGE plpgsql SET search_path=public AS $$
BEGIN
  IF NEW.order_no IS NULL THEN
    NEW.order_no := 'RSF-ORD-' || LPAD(nextval('public.crm_order_seq')::text, 4, '0');
  END IF;
  RETURN NEW;
END; $$;
DROP TRIGGER IF EXISTS trg_order_no ON public.crm_orders;
CREATE TRIGGER trg_order_no BEFORE INSERT ON public.crm_orders FOR EACH ROW EXECUTE FUNCTION public.assign_order_no();

-- ============ FOLLOWUPS ============
CREATE TABLE IF NOT EXISTS public.crm_followups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid(),
  lead_id uuid REFERENCES public.crm_leads(id) ON DELETE CASCADE,
  description text NOT NULL,
  due_date date NOT NULL,
  assigned_to uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  status text NOT NULL DEFAULT 'Pending', -- Pending | Completed
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.crm_followups TO authenticated;
GRANT ALL ON public.crm_followups TO service_role;
ALTER TABLE public.crm_followups ENABLE ROW LEVEL SECURITY;
CREATE POLICY "fu_read" ON public.crm_followups FOR SELECT TO authenticated USING (public.is_admin(auth.uid()) OR assigned_to = auth.uid() OR user_id = auth.uid());
CREATE POLICY "fu_insert" ON public.crm_followups FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "fu_update" ON public.crm_followups FOR UPDATE TO authenticated USING (public.is_admin(auth.uid()) OR assigned_to = auth.uid() OR user_id = auth.uid());
CREATE POLICY "fu_delete_admin" ON public.crm_followups FOR DELETE TO authenticated USING (public.is_admin(auth.uid()));
CREATE TRIGGER trg_fu_updated BEFORE UPDATE ON public.crm_followups FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

-- ============ TOURS ============
CREATE TABLE IF NOT EXISTS public.crm_tours (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid(),
  sales_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  sales_user_name text,
  start_date date NOT NULL,
  end_date date NOT NULL,
  cities text,
  company_ids uuid[] NOT NULL DEFAULT '{}',
  notes text,
  expense numeric(14,2) DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.crm_tours TO authenticated;
GRANT ALL ON public.crm_tours TO service_role;
ALTER TABLE public.crm_tours ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tours_read" ON public.crm_tours FOR SELECT TO authenticated USING (public.is_admin(auth.uid()) OR sales_user_id = auth.uid() OR user_id = auth.uid());
CREATE POLICY "tours_insert" ON public.crm_tours FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "tours_update" ON public.crm_tours FOR UPDATE TO authenticated USING (public.is_admin(auth.uid()) OR sales_user_id = auth.uid() OR user_id = auth.uid());
CREATE POLICY "tours_delete_admin" ON public.crm_tours FOR DELETE TO authenticated USING (public.is_admin(auth.uid()));
CREATE TRIGGER trg_tours_updated BEFORE UPDATE ON public.crm_tours FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

-- ============ SEED FUNCTION (per admin) ============
CREATE OR REPLACE FUNCTION public.seed_rsf_demo_data(_uid uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE
  p1 uuid; p2 uuid; p3 uuid; p4 uuid;
  c1 uuid; c2 uuid; c3 uuid; c4 uuid;
  l1 uuid; l2 uuid; l3 uuid; l4 uuid;
BEGIN
  IF EXISTS (SELECT 1 FROM public.crm_products WHERE user_id = _uid) THEN RETURN; END IF;

  INSERT INTO public.crm_products(user_id,name,category,description,domestic_price_inr,gst_pct,export_price_usd,hsn_code,production_status)
  VALUES
    (_uid,'Soap Stamping Machine SM-200','Soap Making Machinery','Pneumatic soap stamping, 200 pcs/min, SS304 dies', 450000,18,6200,'8479','Made to Order') RETURNING id INTO p1;
  INSERT INTO public.crm_products(user_id,name,category,description,domestic_price_inr,gst_pct,export_price_usd,hsn_code,production_status)
  VALUES (_uid,'Detergent Mixer DM-500','Detergent Plant Machinery','Ribbon blender 500 kg batch, SS304',780000,18,10500,'8479','In Stock') RETURNING id INTO p2;
  INSERT INTO public.crm_products(user_id,name,category,description,domestic_price_inr,gst_pct,export_price_usd,hsn_code,production_status)
  VALUES (_uid,'LABSA Sulphonation Plant 1TPD','Detergent Plant Machinery','Falling film reactor, complete plant',3200000,18,42000,'8419','Made to Order') RETURNING id INTO p3;
  INSERT INTO public.crm_products(user_id,name,category,description,domestic_price_inr,gst_pct,export_price_usd,hsn_code,production_status)
  VALUES (_uid,'SS Storage Tank 5KL','Steel Fabrication','Vertical SS304 storage tank, 5000L',180000,18,2600,'7309','In Stock') RETURNING id INTO p4;

  INSERT INTO public.crm_companies(user_id,company_name,type,country,state,address,gstin,contacts) VALUES
    (_uid,'Godrej Consumer Products','Domestic','India','Maharashtra','Pirojshanagar, Mumbai','27AAACG1234A1Z5','[{"name":"Rajesh Kumar","designation":"Procurement Head","phone":"+919876543210","email":"rajesh@godrej.com"}]'::jsonb) RETURNING id INTO c1;
  INSERT INTO public.crm_companies(user_id,company_name,type,country,state,address,contacts) VALUES
    (_uid,'Dangote Industries','Export','Nigeria',NULL,'Lagos, Nigeria','[{"name":"Emeka Okafor","designation":"Plant Manager","phone":"+2348012345678","email":"emeka@dangote.ng"}]'::jsonb) RETURNING id INTO c2;
  INSERT INTO public.crm_companies(user_id,company_name,type,country,state,address,gstin,contacts) VALUES
    (_uid,'Nirma Limited','Domestic','India','Gujarat','Ahmedabad, Gujarat','24AAACN5678B1Z9','[{"name":"Suresh Patel","designation":"Purchase Officer","phone":"+919812345678","email":"suresh@nirma.com"}]'::jsonb) RETURNING id INTO c3;
  INSERT INTO public.crm_companies(user_id,company_name,type,country,address,contacts) VALUES
    (_uid,'Bidco Africa','Export','Kenya','Thika, Kenya','[{"name":"John Mwangi","designation":"Operations Director","phone":"+254712345678","email":"john@bidco.co.ke"}]'::jsonb) RETURNING id INTO c4;

  INSERT INTO public.crm_leads(user_id,company_id,company_name,contact_person,phone,email,country,source,product_id,stage,assigned_to,notes) VALUES
    (_uid,c1,'Godrej Consumer Products','Rajesh Kumar','+919876543210','rajesh@godrej.com','India','IndiaMart',p1,'Negotiation',_uid,'Needs 4 stamping lines for Malanpur plant') RETURNING id INTO l1;
  INSERT INTO public.crm_leads(user_id,company_id,company_name,contact_person,phone,email,country,source,product_id,stage,assigned_to,notes) VALUES
    (_uid,c2,'Dangote Industries','Emeka Okafor','+2348012345678','emeka@dangote.ng','Nigeria','Website',p3,'Quotation Sent',_uid,'LABSA 1TPD for Lagos refinery expansion') RETURNING id INTO l2;
  INSERT INTO public.crm_leads(user_id,company_id,company_name,contact_person,phone,email,country,source,product_id,stage,assigned_to,notes) VALUES
    (_uid,c3,'Nirma Limited','Suresh Patel','+919812345678','suresh@nirma.com','India','Referral',p2,'Contacted',_uid,'Detergent mixer for Baroda unit') RETURNING id INTO l3;
  INSERT INTO public.crm_leads(user_id,company_id,company_name,contact_person,phone,email,country,source,product_id,stage,assigned_to,notes) VALUES
    (_uid,c4,'Bidco Africa','John Mwangi','+254712345678','john@bidco.co.ke','Kenya','TradeIndia',p4,'New',_uid,'Storage tanks for palm oil plant') RETURNING id INTO l4;

  -- Followups
  INSERT INTO public.crm_followups(user_id,lead_id,description,due_date,assigned_to) VALUES
    (_uid,l1,'Send revised commercial after negotiation call',CURRENT_DATE,_uid),
    (_uid,l2,'Follow-up on LABSA quotation',CURRENT_DATE + 2,_uid),
    (_uid,l3,'Share technical brochure and video',CURRENT_DATE - 1,_uid),
    (_uid,l4,'Introductory call with John Mwangi',CURRENT_DATE + 5,_uid);

  -- Tours
  INSERT INTO public.crm_tours(user_id,sales_user_id,sales_user_name,start_date,end_date,cities,company_ids,notes,expense) VALUES
    (_uid,_uid,'Admin',CURRENT_DATE + 7, CURRENT_DATE + 10,'Mumbai, Pune',ARRAY[c1]::uuid[],'Site visit for Godrej order finalization',25000),
    (_uid,_uid,'Admin',CURRENT_DATE + 20, CURRENT_DATE + 25,'Ahmedabad, Vadodara',ARRAY[c3]::uuid[],'Nirma factory walkthrough',18000);
END; $$;
