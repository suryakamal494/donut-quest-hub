import { AlertTriangle, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Link } from "react-router-dom";
import type { Database } from "@/integrations/supabase/types";

type BugSeverity = Database["public"]["Enums"]["bug_severity"];
type BugType = Database["public"]["Enums"]["bug_type"];
type LoginType = Database["public"]["Enums"]["login_type"];

interface Feature {
  id: string;
  name: string;
  login_type: LoginType;
}

interface ExistingBug {
  id: string;
  bug_code: string;
  title: string;
  status: string;
  severity: string;
}

interface BugReportFormProps {
  title: string;
  setTitle: (v: string) => void;
  description: string;
  setDescription: (v: string) => void;
  actualBehavior: string;
  setActualBehavior: (v: string) => void;
  severity: BugSeverity;
  setSeverity: (v: BugSeverity) => void;
  bugType: BugType;
  setBugType: (v: BugType) => void;
  featureId: string;
  setFeatureId: (v: string) => void;
  loginType: LoginType;
  setLoginType: (v: LoginType) => void;
  features: Feature[];
  existingBugs: ExistingBug[];
}

export function BugReportForm({
  title, setTitle,
  description, setDescription,
  actualBehavior, setActualBehavior,
  severity, setSeverity,
  bugType, setBugType,
  featureId, setFeatureId,
  loginType, setLoginType,
  features,
  existingBugs,
}: BugReportFormProps) {
  return (
    <div className="space-y-3 pt-1">
      {/* Existing bugs warning */}
      {existingBugs.length > 0 && (
        <div className="rounded-lg border border-yellow-500/30 bg-yellow-500/5 p-3 space-y-2">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-yellow-600" />
            <span className="text-xs font-medium text-yellow-700 dark:text-yellow-400">
              {existingBugs.length} existing bug{existingBugs.length !== 1 ? "s" : ""} for this scenario
            </span>
          </div>
          <div className="space-y-1.5">
            {existingBugs.map((b) => (
              <div key={b.id} className="flex items-center gap-2 text-xs">
                <span className="font-mono text-muted-foreground">{b.bug_code}</span>
                <Badge variant="outline" className="text-[10px]">{b.status.replace("_", " ")}</Badge>
                <span className="truncate flex-1">{b.title}</span>
                <Button variant="ghost" size="icon" className="h-5 w-5" asChild>
                  <Link to={`/bugs/${b.id}`}><ExternalLink className="h-3 w-3" /></Link>
                </Button>
              </div>
            ))}
          </div>
          <p className="text-[10px] text-muted-foreground">
            Check if your issue is already reported. You can reopen existing bugs from the Bugs tab.
          </p>
        </div>
      )}

      <div>
        <Label className="text-xs">Title *</Label>
        <Input value={title} onChange={(e) => setTitle(e.target.value)} className="text-sm mt-1" placeholder="Bug title" />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label className="text-xs">Severity</Label>
          <Select value={severity} onValueChange={(v) => setSeverity(v as BugSeverity)}>
            <SelectTrigger className="text-sm mt-1"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="critical">Critical</SelectItem>
              <SelectItem value="major">Major</SelectItem>
              <SelectItem value="minor">Minor</SelectItem>
              <SelectItem value="trivial">Trivial</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label className="text-xs">Type</Label>
          <Select value={bugType} onValueChange={(v) => setBugType(v as BugType)}>
            <SelectTrigger className="text-sm mt-1"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="ui">UI</SelectItem>
              <SelectItem value="functional">Functional</SelectItem>
              <SelectItem value="performance">Performance</SelectItem>
              <SelectItem value="data">Data</SelectItem>
              <SelectItem value="security">Security</SelectItem>
              <SelectItem value="other">Other</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label className="text-xs">Login Type *</Label>
          <Select value={loginType} onValueChange={(v) => setLoginType(v as LoginType)}>
            <SelectTrigger className="text-sm mt-1"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="super_admin">Super Admin</SelectItem>
              <SelectItem value="institute">Institute</SelectItem>
              <SelectItem value="teacher">Teacher</SelectItem>
              <SelectItem value="student">Student</SelectItem>
              <SelectItem value="general">General</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label className="text-xs">Feature</Label>
          <Select value={featureId} onValueChange={setFeatureId}>
            <SelectTrigger className="text-sm mt-1"><SelectValue placeholder="Select..." /></SelectTrigger>
            <SelectContent>
              {features.map((f) => (
                <SelectItem key={f.id} value={f.id}>{f.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div>
        <Label className="text-xs">Description</Label>
        <Textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} className="text-xs mt-1" />
      </div>

      <div>
        <Label className="text-xs">Actual Behavior</Label>
        <Textarea value={actualBehavior} onChange={(e) => setActualBehavior(e.target.value)} rows={2} className="text-xs mt-1" placeholder="What happened?" />
      </div>
    </div>
  );
}
