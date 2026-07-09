ALTER TABLE public.crm_quotations
  ADD COLUMN IF NOT EXISTS subject text,
  ADD COLUMN IF NOT EXISTS intro_note text,
  ADD COLUMN IF NOT EXISTS sales_engineer_name text,
  ADD COLUMN IF NOT EXISTS sales_engineer_phone text,
  ADD COLUMN IF NOT EXISTS sales_engineer_email text,
  ADD COLUMN IF NOT EXISTS terms_json jsonb;

ALTER TABLE public.crm_quotation_items
  ADD COLUMN IF NOT EXISTS capacity text,
  ADD COLUMN IF NOT EXISTS motor text,
  ADD COLUMN IF NOT EXISTS moc text;