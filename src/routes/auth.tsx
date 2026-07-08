import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { toast } from "sonner";
import { Factory, ShieldCheck, Sparkles } from "lucide-react";

export const Route = createFileRoute("/auth")({
  ssr: false,
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) navigate({ to: "/dashboard" });
    });
  }, [navigate]);

  const signIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) return toast.error(error.message);
    toast.success("Welcome back");
    navigate({ to: "/dashboard" });
  };

  const signUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.signUp({
      email, password,
      options: {
        data: { full_name: name },
        emailRedirectTo: `${window.location.origin}/dashboard`,
      },
    });
    setLoading(false);
    if (error) return toast.error(error.message);
    toast.success("Account created — check your email if confirmation is required");
    navigate({ to: "/dashboard" });
  };

  const google = async () => {
    setLoading(true);
    const result = await lovable.auth.signInWithOAuth("google", {
      redirect_uri: window.location.origin,
    });
    if (result.error) {
      setLoading(false);
      toast.error(result.error.message || "Google sign-in failed");
      return;
    }
    if (result.redirected) return;
    navigate({ to: "/dashboard" });
  };

  return (
    <div className="min-h-screen grid lg:grid-cols-2">
      <div className="hidden lg:flex flex-col justify-between p-12 gradient-primary text-primary-foreground">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-lg bg-white/15 grid place-items-center">
            <Factory className="h-5 w-5" />
          </div>
          <div>
            <div className="text-lg font-bold tracking-tight">Rameshwar Steel Fab</div>
            <div className="text-xs opacity-80">AI Proposal Suite</div>
          </div>
        </div>
        <div className="space-y-6 max-w-md">
          <h1 className="text-4xl font-bold leading-tight">Ship proposals in minutes, not days.</h1>
          <p className="opacity-90">
            Enterprise-grade proposal generation for Soap, Detergent, LABSA and
            Industrial Process Plants — with AI-written technical content,
            utility calculations and export-ready PDFs.
          </p>
          <div className="grid gap-3 text-sm">
            <div className="flex items-center gap-3"><Sparkles className="h-4 w-4" /> AI machine configurator & writing engine</div>
            <div className="flex items-center gap-3"><ShieldCheck className="h-4 w-4" /> Role-based access & secure storage</div>
            <div className="flex items-center gap-3"><Factory className="h-4 w-4" /> Multi-currency, multi-template PDFs</div>
          </div>
        </div>
        <div className="text-xs opacity-70">© {new Date().getFullYear()} Rameshwar Steel Fab</div>
      </div>

      <div className="flex items-center justify-center p-6 sm:p-12 bg-background">
        <Card className="w-full max-w-md p-8 shadow-elegant">
          <div className="mb-6 lg:hidden flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg gradient-primary grid place-items-center text-primary-foreground">
              <Factory className="h-5 w-5" />
            </div>
            <div className="font-bold">Rameshwar Steel Fab</div>
          </div>
          <h2 className="text-2xl font-bold">Sign in to your workspace</h2>
          <p className="text-sm text-muted-foreground mt-1">Access your CRM, quotations and proposals.</p>

          <Button variant="outline" className="w-full mt-6" onClick={google} disabled={loading}>
            <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.99.66-2.26 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.1A6.98 6.98 0 0 1 5.47 12c0-.73.13-1.44.36-2.1V7.06H2.18A11 11 0 0 0 1 12c0 1.77.42 3.44 1.18 4.94l3.66-2.84z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84C6.71 7.31 9.14 5.38 12 5.38z"/></svg>
            Continue with Google
          </Button>

          <div className="my-6 flex items-center gap-3 text-xs text-muted-foreground">
            <div className="h-px bg-border flex-1" /> OR <div className="h-px bg-border flex-1" />
          </div>

          <Tabs defaultValue="signin">
            <TabsList className="grid grid-cols-2 w-full">
              <TabsTrigger value="signin">Sign in</TabsTrigger>
              <TabsTrigger value="signup">Sign up</TabsTrigger>
            </TabsList>
            <TabsContent value="signin">
              <form onSubmit={signIn} className="space-y-4 mt-4">
                <div><Label>Email</Label><Input type="email" required value={email} onChange={e => setEmail(e.target.value)} /></div>
                <div><Label>Password</Label><Input type="password" required value={password} onChange={e => setPassword(e.target.value)} /></div>
                <Button className="w-full" disabled={loading}>Sign in</Button>
              </form>
            </TabsContent>
            <TabsContent value="signup">
              <form onSubmit={signUp} className="space-y-4 mt-4">
                <div><Label>Full name</Label><Input required value={name} onChange={e => setName(e.target.value)} /></div>
                <div><Label>Email</Label><Input type="email" required value={email} onChange={e => setEmail(e.target.value)} /></div>
                <div><Label>Password</Label><Input type="password" required minLength={6} value={password} onChange={e => setPassword(e.target.value)} /></div>
                <Button className="w-full" disabled={loading}>Create account</Button>
              </form>
            </TabsContent>
          </Tabs>
        </Card>
      </div>
    </div>
  );
}
