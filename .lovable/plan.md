## RSF CRM — Full Build Plan

Extend the current app with a complete CRM. Existing `customers` and `proposals` (Quotations) tables stay; we add Leads, Products (CRM), Orders, Follow-ups, Tours, User Roles, and Dashboard. New routes live under `/crm/*` with a dedicated sidebar; existing proposals editor remains reachable.

### Brand
- Primary red `#C0272D`, charcoal `#1E1E1E`, bg `#F5F5F5`. Update `src/styles.css` tokens (light theme only for CRM shell). Inter font (already loaded). Sidebar layout with lucide icons. Card + recharts dashboards. Placeholder "RSF" logo tile top-left.

### Database (single migration)
New tables in `public`, all with `user_id`, `created_at`, `updated_at`, RLS + GRANTs:

- `app_role` enum: `admin`, `sales`. `user_roles(user_id, role)` + `has_role()` security-definer fn. First signup auto-promoted to admin via trigger; subsequent users default to `sales`.
- `crm_companies` — company_name, type (domestic/export), country, address, gstin, notes. Multiple contacts stored as JSONB array `contacts: [{name,designation,phone,email}]`.
- `crm_products` — name, category (soap/detergent/fabrication), description, domestic_price_inr, gst_pct, export_price_usd, hsn_code, production_status, image_url. `quotation_count` computed via view.
- `crm_leads` — company_name, contact_person, phone, email, country, source, product_id, stage, assigned_to (uuid), notes, last_followup_at. FK to products & user_roles.
- `crm_quotations` — quote_no (auto `RSF-QT-####`), lead_id, company_id, quote_date, payment_terms, validity_days, subtotal, tax_mode (cgst_sgst/igst/export), cgst, sgst, igst, grand_total, status, currency.
- `crm_quotation_items` — quotation_id, product_id, qty, unit_price, line_total.
- `crm_orders` — quotation_id, order_date, production_status, expected_dispatch, actual_dispatch, transport_details, order_value.
- `crm_followups` — lead_id, description, due_date, assigned_to, status (pending/completed; overdue derived).
- `crm_tours` — sales_user_id, start_date, end_date, cities, company_ids (uuid[]), notes, expense.

RLS: admin sees all; sales sees only rows where `assigned_to = auth.uid()` (or `user_id = auth.uid()` for own-created). Uses `has_role(auth.uid(),'admin')` OR ownership check.

Seed data (4 rows per module) inserted in the migration for the admin user via a bootstrap function that runs on first admin login — Indian companies (Godrej Consumer, Nirma, Wipro Consumer, Hindustan Unilever), export leads from Nigeria/Kenya/Egypt/Vietnam, sample products (Soap Stamping Machine SM-200, Detergent Mixer DM-500, LABSA Sulphonation Plant, SS Storage Tank 5KL).

### Routes (new)
```
src/routes/_authenticated/crm/
  route.tsx              # CRM sidebar shell
  index.tsx              # Dashboard
  leads.index.tsx        # Table + Kanban toggle
  leads.$id.tsx          # Lead detail + followups
  leads.new.tsx
  products.index.tsx     # Grid with search/filter
  products.$id.tsx       # Detail + edit
  quotations.index.tsx   # List
  quotations.$id.tsx     # View + PDF
  quotations.new.tsx     # Builder with line items
  orders.index.tsx       # Stepper cards
  orders.$id.tsx
  followups.index.tsx    # Calendar + list
  companies.index.tsx    # Master list
  companies.$id.tsx      # 360° history
  tours.index.tsx        # Timeline + form
  admin.users.tsx        # Admin only — role management
```

Root `/` → landing already exists; add "Open CRM" CTA. Header keeps existing proposals nav; sidebar inside `/crm/*` gives module nav.

### Key UI pieces
- **Sidebar** (`components/crm/CrmSidebar.tsx`): Dashboard, Leads, Products, Quotations, Orders, Follow-ups, Companies, Tours, Users(admin). Collapsible on mobile via existing sidebar primitives.
- **Leads Kanban**: @dnd-kit already installed. 6 columns = stages; drag updates `stage`.
- **Quotation PDF**: jspdf + autotable, brand header (RSF red bar, company address, GST, bank placeholder), items table, totals, terms. Downloads as `RSF-QT-####.pdf`.
- **Dashboard charts** (recharts): pie (region split), bar (top 5 products), line (monthly revenue), stat cards (leads MoM %, conversion %, overdue count), executive table.
- **Money format**: `formatMoney(amount, 'INR'|'USD')` extended for `$` prefix.
- **WhatsApp link**, **Excel export**, **Gmail send** — scaffolded as follow-up items (not built now unless trivial). WhatsApp button IS trivial → include on lead detail.

### Technical details
- All list/detail pages use `useQuery` with supabase client (RLS enforces role scoping — no server fns needed for reads except PDF generation stays client-side with jspdf).
- Auto quote number: DB sequence + trigger formatting `RSF-QT-` + LPAD(nextval,4,'0').
- GST auto-select: if country != India → export/no-GST; else if state matches user's state → CGST+SGST else IGST. Company address parsed for state (simple dropdown of Indian states in company form).
- Auto-overdue for followups: computed client-side (`due_date < today && status='pending'`).
- Product `quotation_count`: SQL view `crm_product_stats` selecting count from `crm_quotation_items` grouped by product.

### Out of scope (follow-up prompts as user listed)
Gmail send, SMS reminders, Excel export button, real logo — deferred to next turns.

### Build order (one turn)
1. Migration (tables, enum, roles, seed function, view, sequence, RLS, GRANTs).
2. Update styles.css tokens.
3. CRM sidebar shell + route.
4. Modules in parallel writes: dashboard, leads (table+kanban+new+detail), products, quotations (list+new+detail+PDF), orders, followups, companies, tours, admin users.
5. Landing "Open CRM" link.
6. Verify build.

This is large — expect ~25 new files. After migration approves, code lands in one big batch.