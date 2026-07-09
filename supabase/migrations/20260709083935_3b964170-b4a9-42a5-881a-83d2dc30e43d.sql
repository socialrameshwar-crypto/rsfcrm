
ALTER TABLE public.proposal_templates
  ADD COLUMN IF NOT EXISTS analysis jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS field_overrides jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS version integer NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'draft';

-- status values: 'draft' | 'active' | 'archived'
UPDATE public.proposal_templates SET status = CASE WHEN archived THEN 'archived' ELSE 'active' END WHERE status = 'draft';

-- Track which template was used for a proposal + where the generated PDF lives
ALTER TABLE public.proposals
  ADD COLUMN IF NOT EXISTS template_id uuid REFERENCES public.proposal_templates(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS generated_pdf_path text;
