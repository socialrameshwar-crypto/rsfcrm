
-- Phase 2: Auto-Select Engine + Editable Utility Formulas

CREATE TABLE public.machine_selection_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  name text NOT NULL,
  product_slug text NOT NULL,
  capacity text,
  automation text,
  material text,
  priority int NOT NULL DEFAULT 0,
  items jsonb NOT NULL DEFAULT '[]'::jsonb,
  notes text,
  archived boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.machine_selection_rules TO authenticated;
GRANT ALL ON public.machine_selection_rules TO service_role;
ALTER TABLE public.machine_selection_rules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "own rules" ON public.machine_selection_rules
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TRIGGER trg_rules_updated
  BEFORE UPDATE ON public.machine_selection_rules
  FOR EACH ROW EXECUTE FUNCTION public.tg_touch_updated_at();

CREATE INDEX idx_rules_user_product ON public.machine_selection_rules(user_id, product_slug);


CREATE TABLE public.utility_formulas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  product_slug text,
  key text NOT NULL,
  label text NOT NULL,
  unit text,
  expression text NOT NULL,
  sort_order int NOT NULL DEFAULT 0,
  archived boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.utility_formulas TO authenticated;
GRANT ALL ON public.utility_formulas TO service_role;
ALTER TABLE public.utility_formulas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "own formulas" ON public.utility_formulas
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TRIGGER trg_formulas_updated
  BEFORE UPDATE ON public.utility_formulas
  FOR EACH ROW EXECUTE FUNCTION public.tg_touch_updated_at();

CREATE INDEX idx_formulas_user_product ON public.utility_formulas(user_id, product_slug);
