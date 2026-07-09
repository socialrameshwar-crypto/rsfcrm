ALTER TABLE public.proposals
  ADD COLUMN IF NOT EXISTS sales_engineer_phone text,
  ADD COLUMN IF NOT EXISTS sales_engineer_email text;