
-- Add fields to proposals
ALTER TABLE public.proposals
  ADD COLUMN IF NOT EXISTS quotation_type text NOT NULL DEFAULT 'domestic',
  ADD COLUMN IF NOT EXISTS terms_template_id uuid;

-- terms_templates
CREATE TABLE public.terms_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  scope text NOT NULL DEFAULT 'domestic',
  is_default boolean NOT NULL DEFAULT false,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.terms_templates TO authenticated;
GRANT ALL ON public.terms_templates TO service_role;
ALTER TABLE public.terms_templates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own terms_templates" ON public.terms_templates
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER trg_terms_templates_touch
  BEFORE UPDATE ON public.terms_templates
  FOR EACH ROW EXECUTE FUNCTION public.tg_touch_updated_at();

-- terms_clauses
CREATE TABLE public.terms_clauses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id uuid NOT NULL REFERENCES public.terms_templates(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title text NOT NULL,
  body text NOT NULL DEFAULT '',
  position integer NOT NULL DEFAULT 0,
  enabled boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.terms_clauses TO authenticated;
GRANT ALL ON public.terms_clauses TO service_role;
ALTER TABLE public.terms_clauses ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own terms_clauses" ON public.terms_clauses
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE INDEX idx_terms_clauses_template ON public.terms_clauses(template_id, position);
CREATE TRIGGER trg_terms_clauses_touch
  BEFORE UPDATE ON public.terms_clauses
  FOR EACH ROW EXECUTE FUNCTION public.tg_touch_updated_at();

-- Auto-seed default templates for a new user (called from client on demand too)
CREATE OR REPLACE FUNCTION public.seed_default_terms_templates(_user uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  dom_id uuid;
  exp_id uuid;
BEGIN
  IF EXISTS (SELECT 1 FROM public.terms_templates WHERE user_id = _user) THEN
    RETURN;
  END IF;

  INSERT INTO public.terms_templates (user_id, name, scope, is_default, sort_order)
  VALUES (_user, 'India Domestic (Standard)', 'domestic', true, 0)
  RETURNING id INTO dom_id;

  INSERT INTO public.terms_clauses (template_id, user_id, title, body, position, enabled) VALUES
    (dom_id, _user, 'Freight', 'Extra at actuals — to buyer''s account.', 0, true),
    (dom_id, _user, 'GST / HSN', 'GST @ 18% extra as applicable. HSN Code: 84798910.', 1, true),
    (dom_id, _user, 'Payment', '50% advance with commercial order; 50% against Proforma Invoice before dispatch, after FAT.', 2, true),
    (dom_id, _user, 'Delivery', '14 working days from receipt of advance with commercial order.', 3, true),
    (dom_id, _user, 'Warranty', '24 months from date of Invoice against manufacturing defects.', 4, true),
    (dom_id, _user, 'Installation', 'Erection & commissioning supervision by our engineers; boarding, lodging and to-and-fro travel in buyer''s scope.', 5, true),
    (dom_id, _user, 'Validity', 'Offer valid for 30 days from the date of quotation.', 6, true),
    (dom_id, _user, 'Jurisdiction', 'All disputes subject to Ahmedabad jurisdiction only.', 7, true);

  INSERT INTO public.terms_templates (user_id, name, scope, is_default, sort_order)
  VALUES (_user, 'Export (UAE / GCC)', 'export', true, 1)
  RETURNING id INTO exp_id;

  INSERT INTO public.terms_clauses (template_id, user_id, title, body, position, enabled) VALUES
    (exp_id, _user, 'Incoterms', 'FOB Mundra Port, India (Incoterms 2020). CIF / CFR available on request.', 0, true),
    (exp_id, _user, 'Export Packing', 'Sea-worthy export packing in wooden crates with fumigation certificate (ISPM-15).', 1, true),
    (exp_id, _user, 'Payment', '30% advance with order; 70% against copy of shipping documents via bank / TT.', 2, true),
    (exp_id, _user, 'Delivery', '6-8 weeks from receipt of advance and technical clearance.', 3, true),
    (exp_id, _user, 'Shipping Documents', 'Commercial Invoice, Packing List, Bill of Lading, Certificate of Origin (Chamber of Commerce), Fumigation Certificate.', 4, true),
    (exp_id, _user, 'Warranty', '18 months from date of Bill of Lading against manufacturing defects.', 5, true),
    (exp_id, _user, 'Installation', 'Buyer to arrange VISA, boarding/lodging and to-and-fro travel of RSF supervision engineer(s). Man-day rates on request.', 6, true),
    (exp_id, _user, 'Taxes & Duties', 'All import duties, VAT and local taxes in destination country to buyer''s account.', 7, true),
    (exp_id, _user, 'Validity', 'Offer valid for 30 days from the date of quotation.', 8, true);
END;
$$;

GRANT EXECUTE ON FUNCTION public.seed_default_terms_templates(uuid) TO authenticated;
