import { useState, useEffect, useCallback } from "react";
import { Loader2, ExternalLink, Clock, User, Bug } from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { supabase } from "@/integrations/supabase/client";
import { SeverityBadge, BugStatusBadge, BugTypeBadge, FixStatusBadge } from "@/components/bugs/BugBadges";
import { MarkdownRenderer } from "@/components/bugs/MarkdownRenderer";
import { AttachmentGallery } from "@/components/qa/AttachmentGallery";
import { LoginTypeBadge } from "@/components/qa/badges/LoginTypeBadge";
import { Link } from "react-router-dom";
import { formatDistanceToNow, format } from "date-fns";
import type { Bug as BugType } from "@/types/bugs";
import type { LoginType } from "@/types/qa";

interface BugDetailSheetProps {
  bugId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function BugDetailSheet({ bugId, open, onOpenChange }: BugDetailSheetProps) {
  const [bug, setBug] = useState<BugType | null>(null);
  const [loading, setLoading] = useState(false);
  const [reporterName, setReporterName] = useState<string | null>(null);
  const [assigneeName, setAssigneeName] = useState<string | null>(null);
  const [featureName, setFeatureName] = useState<string | null>(null);

  const loadBug = useCallback(async () => {
    if (!bugId) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("bugs")
        .select("*")
        .eq("id", bugId)
        .maybeSingle();
      if (error) throw error;
      const b = data as BugType;
      setBug(b);

      // Parallel lookups
      const userIds = [b?.reported_by, b?.assigned_to].filter(Boolean) as string[];
      const [profilesRes, featureRes] = await Promise.all([
        userIds.length > 0
          ? supabase.from("profiles").select("user_id, full_name").in("user_id", userIds)
          : Promise.resolve({ data: [] }),
        b?.feature_id
          ? supabase.from("features").select("name").eq("id", b.feature_id).maybeSingle()
          : Promise.resolve({ data: null }),
      ]);

      const pMap: Record<string, string> = {};
      (profilesRes.data || []).forEach((p: any) => { pMap[p.user_id] = p.full_name; });
      setReporterName(b?.reported_by ? pMap[b.reported_by] || null : null);
      setAssigneeName(b?.assigned_to ? pMap[b.assigned_to] || null : null);
      setFeatureName(featureRes.data?.name || null);
    } catch {
      setBug(null);
    } finally {
      setLoading(false);
    }
  }, [bugId]);

  useEffect(() => {
    if (open && bugId) loadBug();
    if (!open) { setBug(null); setReporterName(null); setAssigneeName(null); setFeatureName(null); }
  }, [open, bugId, loadBug]);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-lg p-0">
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        ) : !bug ? (
          <div className="flex items-center justify-center h-full">
            <p className="text-muted-foreground text-sm">Bug not found</p>
          </div>
        ) : (
          <>
            <SheetHeader className="px-4 pt-4 pb-3 border-b space-y-1.5">
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="text-xs font-mono text-muted-foreground">{bug.bug_code}</span>
                <SeverityBadge severity={bug.severity} size="sm" />
                <BugStatusBadge status={bug.status} size="sm" />
                {bug.bug_type && <BugTypeBadge bugType={bug.bug_type} size="sm" />}
                <FixStatusBadge fixStatus={(bug.fix_status || "unfixed") as any} size="sm" />
              </div>
              <SheetTitle className="text-base leading-tight">{bug.title}</SheetTitle>
            </SheetHeader>

            <ScrollArea className="h-[calc(100vh-140px)]">
              <div className="p-4 space-y-4">
                {/* Description */}
                {bug.description && (
                  <div>
                    <h4 className="text-xs font-medium text-muted-foreground mb-1">Description</h4>
                    <MarkdownRenderer content={bug.description} className="text-foreground text-sm" />
                  </div>
                )}

                {/* Steps */}
                {bug.steps_to_reproduce && bug.steps_to_reproduce.length > 0 && (
                  <div>
                    <h4 className="text-xs font-medium text-muted-foreground mb-1.5">Steps to Reproduce</h4>
                    <ol className="list-decimal list-inside space-y-1 text-sm">
                      {bug.steps_to_reproduce.map((step, i) => (
                        <li key={i}>{step}</li>
                      ))}
                    </ol>
                  </div>
                )}

                {/* Expected vs Actual */}
                {(bug.expected_behavior || bug.actual_behavior) && (
                  <div className="grid grid-cols-1 gap-2">
                    {bug.expected_behavior && (
                      <div className="p-2.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/30">
                        <h4 className="text-[10px] font-medium text-emerald-700 dark:text-emerald-400 mb-0.5">Expected</h4>
                        <p className="text-sm text-foreground">{bug.expected_behavior}</p>
                      </div>
                    )}
                    {bug.actual_behavior && (
                      <div className="p-2.5 rounded-lg bg-red-50 dark:bg-red-950/30">
                        <h4 className="text-[10px] font-medium text-red-700 dark:text-red-400 mb-0.5">Actual</h4>
                        <p className="text-sm text-foreground">{bug.actual_behavior}</p>
                      </div>
                    )}
                  </div>
                )}

                {/* Developer response */}
                {bug.developer_response && (
                  <div className="p-2.5 rounded-lg bg-blue-50 dark:bg-blue-950/30">
                    <h4 className="text-[10px] font-medium text-blue-700 dark:text-blue-400 mb-0.5">Developer Notes</h4>
                    <MarkdownRenderer content={bug.developer_response} className="text-sm" />
                  </div>
                )}

                {/* Attachments */}
                {bug.attachments && bug.attachments.length > 0 && (
                  <AttachmentGallery attachments={bug.attachments} />
                )}

                <Separator />

                {/* Meta */}
                <div className="space-y-2 text-xs text-muted-foreground">
                  {bug.login_type && (
                    <div className="flex items-center gap-2">
                      <span>Login:</span>
                      <LoginTypeBadge type={bug.login_type as LoginType} size="sm" />
                    </div>
                  )}
                  {featureName && (
                    <div><span>Feature:</span> <span className="text-foreground font-medium">{featureName}</span></div>
                  )}
                  {reporterName && (
                    <div className="flex items-center gap-1"><User className="h-3 w-3" /> Reported by {reporterName}</div>
                  )}
                  {assigneeName && (
                    <div className="flex items-center gap-1"><User className="h-3 w-3" /> Assigned to {assigneeName}</div>
                  )}
                  <div className="flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    Created {format(new Date(bug.created_at), "dd MMM yyyy, h:mm a")}
                    {" "}({formatDistanceToNow(new Date(bug.created_at), { addSuffix: true })})
                  </div>
                  {bug.resolved_at && (
                    <div className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      Resolved {format(new Date(bug.resolved_at), "dd MMM yyyy, h:mm a")}
                    </div>
                  )}
                </div>

                {/* Full page link */}
                <div className="pt-2">
                  <Button variant="outline" size="sm" className="w-full text-xs" asChild>
                    <Link to={`/bugs/${bug.id}`}>
                      <ExternalLink className="h-3.5 w-3.5 mr-1.5" /> Open Full Bug Page
                    </Link>
                  </Button>
                </div>
              </div>
            </ScrollArea>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}
