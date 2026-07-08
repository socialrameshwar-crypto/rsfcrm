
CREATE TABLE public.customers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  customer_name TEXT NOT NULL,
  company_name TEXT,
  contact_person TEXT,
  email TEXT,
  mobile TEXT,
  country TEXT,
  city TEXT,
  industry TEXT,
  website TEXT,
  gst_vat TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.customers TO authenticated;
GRANT ALL ON public.customers TO service_role;
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own customers" ON public.customers FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TABLE public.proposals (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  customer_id UUID REFERENCES public.customers(id) ON DELETE SET NULL,
  proposal_number TEXT NOT NULL,
  title TEXT NOT NULL,
  product_type TEXT NOT NULL,
  capacity TEXT NOT NULL,
  automation TEXT NOT NULL,
  material TEXT NOT NULL,
  currency TEXT NOT NULL DEFAULT 'INR',
  status TEXT NOT NULL DEFAULT 'draft',
  sales_engineer TEXT,
  follow_up_date DATE,
  total_value NUMERIC(14,2) NOT NULL DEFAULT 0,
  machines JSONB NOT NULL DEFAULT '[]'::jsonb,
  utilities JSONB NOT NULL DEFAULT '{}'::jsonb,
  commercials JSONB NOT NULL DEFAULT '{}'::jsonb,
  ai_content JSONB NOT NULL DEFAULT '{}'::jsonb,
  template TEXT NOT NULL DEFAULT 'corporate-blue',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.proposals TO authenticated;
GRANT ALL ON public.proposals TO service_role;
ALTER TABLE public.proposals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own proposals" ON public.proposals FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.tg_touch_updated_at() RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER customers_touch BEFORE UPDATE ON public.customers FOR EACH ROW EXECUTE FUNCTION public.tg_touch_updated_at();
CREATE TRIGGER proposals_touch BEFORE UPDATE ON public.proposals FOR EACH ROW EXECUTE FUNCTION public.tg_touch_updated_at();

CREATE INDEX idx_customers_user ON public.customers(user_id);
CREATE INDEX idx_proposals_user ON public.proposals(user_id);
CREATE INDEX idx_proposals_customer ON public.proposals(customer_id);
CREATE INDEX idx_proposals_status ON public.proposals(status);
