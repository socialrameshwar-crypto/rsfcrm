
-- Product Categories
CREATE TABLE public.product_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  name text NOT NULL,
  slug text,
  sort_order integer NOT NULL DEFAULT 0,
  hidden boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.product_categories TO authenticated;
GRANT ALL ON public.product_categories TO service_role;

ALTER TABLE public.product_categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "own product_categories" ON public.product_categories
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TRIGGER product_categories_touch
  BEFORE UPDATE ON public.product_categories
  FOR EACH ROW EXECUTE FUNCTION public.tg_touch_updated_at();

-- Machines
CREATE TABLE public.machines (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  category_id uuid REFERENCES public.product_categories(id) ON DELETE SET NULL,
  name text NOT NULL,
  code text,
  image_url text,
  capacity text,
  material text,
  motor text,
  power_kw numeric,
  dimensions text,
  weight text,
  description text,
  features text[] NOT NULL DEFAULT '{}',
  applications text[] NOT NULL DEFAULT '{}',
  std_accessories text[] NOT NULL DEFAULT '{}',
  optional_accessories jsonb NOT NULL DEFAULT '[]'::jsonb,
  warranty text,
  -- Pricing
  base_price numeric NOT NULL DEFAULT 0,
  dealer_price numeric NOT NULL DEFAULT 0,
  customer_price numeric NOT NULL DEFAULT 0,
  export_price numeric NOT NULL DEFAULT 0,
  discount_pct numeric NOT NULL DEFAULT 0,
  currency text NOT NULL DEFAULT 'INR',
  tax_pct numeric NOT NULL DEFAULT 18,
  freight_pct numeric NOT NULL DEFAULT 3,
  packing_pct numeric NOT NULL DEFAULT 1.5,
  install_pct numeric NOT NULL DEFAULT 5,
  commissioning_pct numeric NOT NULL DEFAULT 3,
  archived boolean NOT NULL DEFAULT false,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.machines TO authenticated;
GRANT ALL ON public.machines TO service_role;

ALTER TABLE public.machines ENABLE ROW LEVEL SECURITY;

CREATE POLICY "own machines" ON public.machines
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TRIGGER machines_touch
  BEFORE UPDATE ON public.machines
  FOR EACH ROW EXECUTE FUNCTION public.tg_touch_updated_at();

CREATE INDEX machines_user_category_idx ON public.machines(user_id, category_id);
CREATE INDEX product_categories_user_idx ON public.product_categories(user_id);
