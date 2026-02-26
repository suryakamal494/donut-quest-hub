import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Loader2, ClipboardCheck, Mail, Lock, Copy, WifiOff, RefreshCw } from "lucide-react";
import { z } from "zod";
import {
  isNetworkError,
  retrySignIn,
  generateCorrelationId,
  buildDiagnosticPayload,
  formatDiagnosticText,
  logAuthFailure,
} from "@/lib/auth-resilience";

const loginSchema = z.object({
  email: z.string().trim().email("Please enter a valid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

const Login: React.FC = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({});
  const [networkDiag, setNetworkDiag] = useState<string | null>(null);
  const [diagCopied, setDiagCopied] = useState(false);

  const { signIn } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const copyDiagnostics = async () => {
    if (!networkDiag) return;
    try {
      await navigator.clipboard.writeText(networkDiag);
      setDiagCopied(true);
      setTimeout(() => setDiagCopied(false), 2000);
    } catch {
      // fallback: select text
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});
    setNetworkDiag(null);

    const result = loginSchema.safeParse({ email, password });
    if (!result.success) {
      const fieldErrors: { email?: string; password?: string } = {};
      result.error.errors.forEach((err) => {
        if (err.path[0] === "email") fieldErrors.email = err.message;
        if (err.path[0] === "password") fieldErrors.password = err.message;
      });
      setErrors(fieldErrors);
      return;
    }

    setIsLoading(true);
    const correlationId = generateCorrelationId();

    try {
      // Attempt login directly with network-only retry (no preflight)
      const { error } = await retrySignIn(
        () => signIn(email, password),
        { maxRetries: 2, baseDelayMs: 1000 }
      );

      if (error) {
        if (isNetworkError(error)) {
          const diag = buildDiagnosticPayload(error, correlationId);
          setNetworkDiag(formatDiagnosticText(diag));
          logAuthFailure(diag);
        } else {
          toast({
            variant: "destructive",
            title: "Login failed",
            description: error.message || "Invalid email or password",
          });
        }
        setIsLoading(false);
        return;
      }

      toast({
        title: "Welcome back!",
        description: "You have successfully logged in.",
      });
      navigate("/");
    } catch (err) {
      if (isNetworkError(err)) {
        const diag = buildDiagnosticPayload(err, correlationId);
        setNetworkDiag(formatDiagnosticText(diag));
        logAuthFailure(diag);
      } else {
        toast({
          variant: "destructive",
          title: "Login failed",
          description: err instanceof Error ? err.message : "An unexpected error occurred",
        });
      }
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-warm px-4 py-8">
      {/* Decorative elements */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-primary/10 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-primary/5 rounded-full blur-3xl" />
      </div>

      <div className="w-full max-w-md relative z-10">
        {/* Logo and Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center h-16 w-16 rounded-2xl bg-gradient-primary shadow-glow-primary mb-4">
            <ClipboardCheck className="h-8 w-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-foreground">QA Platform</h1>
          <p className="text-muted-foreground mt-2">Sign in to your account</p>
        </div>

        {/* Network Diagnostic Card */}
        {networkDiag && (
          <div className="mb-6 rounded-2xl border-2 border-destructive/30 bg-destructive/5 p-5 space-y-4">
            <div className="flex items-start gap-3">
              <WifiOff className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
              <div className="space-y-1">
                <p className="font-semibold text-destructive text-sm">
                  Unable to reach authentication server
                </p>
                <p className="text-xs text-muted-foreground">
                  This appears to be a network connectivity issue. Try the steps below:
                </p>
              </div>
            </div>

            {/* Fallback instructions */}
            <ul className="text-xs text-muted-foreground space-y-1.5 pl-8 list-disc">
              <li>Switch to a mobile hotspot or different Wi-Fi network</li>
              <li>Disable VPN or proxy temporarily</li>
              <li>Contact your IT team to allow outbound traffic to the auth service</li>
              <li>Try again in a few minutes</li>
            </ul>

            {/* Diagnostic details (copyable) */}
            <div className="bg-background/60 rounded-lg p-3 text-[11px] font-mono text-muted-foreground whitespace-pre-wrap break-all border border-border">
              {networkDiag}
            </div>

            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="text-xs"
                onClick={copyDiagnostics}
              >
                <Copy className="h-3 w-3 mr-1" />
                {diagCopied ? "Copied!" : "Copy diagnostics"}
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="text-xs"
                onClick={() => {
                  setNetworkDiag(null);
                  handleSubmit(new Event("submit") as unknown as React.FormEvent);
                }}
              >
                <RefreshCw className="h-3 w-3 mr-1" />
                Retry
              </Button>
            </div>
          </div>
        )}

        {/* Login Card */}
        <div className="glass-card rounded-3xl p-8 shadow-warm">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Email Field */}
            <div className="space-y-2">
              <Label htmlFor="email" className="text-sm font-medium text-foreground">
                Email Address
              </Label>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                <Input
                  id="email"
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={isLoading}
                  className={`pl-12 h-12 rounded-xl border-2 bg-white/50 focus:bg-white transition-smooth ${
                    errors.email ? "border-destructive" : "border-border focus:border-primary"
                  }`}
                />
              </div>
              {errors.email && (
                <p className="text-sm text-destructive flex items-center gap-1">
                  {errors.email}
                </p>
              )}
            </div>

            {/* Password Field */}
            <div className="space-y-2">
              <Label htmlFor="password" className="text-sm font-medium text-foreground">
                Password
              </Label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={isLoading}
                  className={`pl-12 h-12 rounded-xl border-2 bg-white/50 focus:bg-white transition-smooth ${
                    errors.password ? "border-destructive" : "border-border focus:border-primary"
                  }`}
                />
              </div>
              {errors.password && (
                <p className="text-sm text-destructive flex items-center gap-1">
                  {errors.password}
                </p>
              )}
            </div>

            {/* Forgot Password */}
            <div className="text-right">
              <Link
                to="/forgot-password"
                className="text-sm text-primary hover:text-primary/80 font-medium transition-smooth"
              >
                Forgot Password?
              </Link>
            </div>

            {/* Submit Button */}
            <Button
              type="submit"
              className="w-full h-12 rounded-xl bg-gradient-primary hover:opacity-90 text-white font-semibold shadow-warm transition-smooth"
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  Signing in...
                </>
              ) : (
                "Sign In"
              )}
            </Button>
          </form>

          {/* Register Link */}
          <div className="mt-6 text-center">
            <p className="text-muted-foreground">
              Don't have an account?{" "}
              <Link
                to="/register"
                className="text-primary hover:text-primary/80 font-semibold transition-smooth"
              >
                Create Account
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
