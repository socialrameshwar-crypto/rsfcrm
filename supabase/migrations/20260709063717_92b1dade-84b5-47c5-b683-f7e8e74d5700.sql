-- Add PDF-overlay template mode
ALTER TABLE public.proposal_templates
  ADD COLUMN IF NOT EXISTS mode text NOT NULL DEFAULT 'blocks',
  ADD COLUMN IF NOT EXISTS source_pdf_url text,
  ADD COLUMN IF NOT EXISTS source_pdf_pages integer,
  ADD COLUMN IF NOT EXISTS overlays jsonb NOT NULL DEFAULT '[]'::jsonb;

ALTER TABLE public.proposal_templates
  DROP CONSTRAINT IF EXISTS proposal_templates_mode_chk;
ALTER TABLE public.proposal_templates
  ADD CONSTRAINT proposal_templates_mode_chk CHECK (mode IN ('blocks','pdf_overlay'));

-- Store per-proposal token values for pdf_overlay templates
ALTER TABLE public.proposals
  ADD COLUMN IF NOT EXISTS template_id uuid,
  ADD COLUMN IF NOT EXISTS overlay_values jsonb NOT NULL DEFAULT '{}'::jsonb;
