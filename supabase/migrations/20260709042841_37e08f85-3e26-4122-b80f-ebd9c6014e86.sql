
ALTER TABLE public.proposals
  ADD COLUMN IF NOT EXISTS blocks jsonb;
