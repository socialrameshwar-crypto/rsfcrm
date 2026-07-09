import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Building2, Phone, Mail } from "lucide-react";
import { fmtMoney, whatsappLink, stageColor } from "@/lib/crm";

export const Route = createFileRoute("/_authenticated/crm/companies/$id")({
  component: CompanyDetail,
});

function CompanyDetail() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const company = useQuery({
    queryKey: ["crm_company", id],
    queryFn: async () => (await (supabase as any).from("crm_companies").select("*").eq("id", id).single()).data,
  });
  const leads = useQuery({
    queryKey: ["crm_company_leads", id],
    queryFn: async () => (await (supabase as any).from("crm_leads").select("*").eq("company_id", id)).data ?? [],
  });
  const quotes = useQuery({
    queryKey: ["crm_company_quotes", id],
    queryFn: async () => (await (supabase as any).from("crm_quotations").select("*").eq("company_id", id)).data ?? [],
  });

  const c = company.data;
  if (company.isLoading) return <div>Loading…</div>;
  if (!c) return <div>Not found</div>;

  return (
    <div className="space-y-4">
      <Button variant="ghost" size="sm" onClick={() => navigate({ to: "/crm/companies" })}><ArrowLeft className="h-4 w-4 mr-1" />Back</Button>
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div className="flex items-start gap-3">
          <div className="h-14 w-14 rounded-lg bg-primary/10 grid place-items-center"><Building2 className="h-7 w-7 text-primary" /></div>
          <div>
            <h1 className="text-2xl md:text-3xl font-bold">{c.company_name}</h1>
            <div className="text-sm text-muted-foreground">{c.address}</div>
            <div className="text-xs text-muted-foreground">{c.country}{c.state ? `, ${c.state}` : ""}{c.gstin ? ` · GSTIN ${c.gstin}` : ""}</div>
            <Badge variant="secondary" className="mt-2">{c.type}</Badge>
          </div>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-1">
          <CardHeader><CardTitle className="text-base">Contacts</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {(c.contacts || []).map((ct: any, i: number) => (
              <div key={i} className="border rounded-md p-2">
                <div className="font-semibold text-sm">{ct.name}</div>
                <div className="text-xs text-muted-foreground">{ct.designation}</div>
                {ct.phone && <div className="text-xs flex items-center gap-1 mt-1"><Phone className="h-3 w-3" />
                  <a href={whatsappLink(ct.phone)} target="_blank" rel="noreferrer" className="text-primary">{ct.phone}</a>
                </div>}
                {ct.email && <div className="text-xs flex items-center gap-1"><Mail className="h-3 w-3" />{ct.email}</div>}
              </div>
            ))}
            {(!c.contacts || c.contacts.length === 0) && <div className="text-xs text-muted-foreground">No contacts</div>}
          </CardContent>
        </Card>

        <div className="lg:col-span-2 space-y-4">
          <Card>
            <CardHeader><CardTitle className="text-base">Leads ({(leads.data ?? []).length})</CardTitle></CardHeader>
            <CardContent className="space-y-2">
              {(leads.data ?? []).map((l: any) => (
                <Link key={l.id} to="/crm/leads/$id" params={{ id: l.id }} className="flex items-center justify-between border rounded p-2 hover:border-primary">
                  <div className="text-sm">{l.contact_person || l.company_name} <span className="text-xs text-muted-foreground">· {l.source}</span></div>
                  <Badge className={stageColor[l.stage]} variant="secondary">{l.stage}</Badge>
                </Link>
              ))}
              {(leads.data ?? []).length === 0 && <div className="text-xs text-muted-foreground text-center py-2">No leads</div>}
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-base">Quotations ({(quotes.data ?? []).length})</CardTitle></CardHeader>
            <CardContent className="space-y-2">
              {(quotes.data ?? []).map((q: any) => (
                <Link key={q.id} to="/crm/quotations/$id" params={{ id: q.id }} className="flex items-center justify-between border rounded p-2 hover:border-primary text-sm">
                  <span className="font-mono">{q.quote_no}</span>
                  <span>{fmtMoney(q.grand_total, q.currency)}</span>
                  <Badge variant="secondary">{q.status}</Badge>
                </Link>
              ))}
              {(quotes.data ?? []).length === 0 && <div className="text-xs text-muted-foreground text-center py-2">No quotations</div>}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
