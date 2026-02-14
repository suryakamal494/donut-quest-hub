import { Link } from "react-router-dom";
import {
  AlertTriangle, Loader2, CheckCircle2, Clock, RefreshCw, Wrench,
  ExternalLink, FolderKanban, ChevronDown, ChevronUp, Trash2
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { FailureThread, AttachmentGallery, SLABadge } from "@/components/qa";
import { useFailures, type FilterTab } from "@/hooks/useFailures";
import { formatDistanceToNow, differenceInDays } from "date-fns";

export default function Failures() {
  const { toast: toastFn } = useToast();
  const {
    loading, projectLoading, currentProject, failures, activeTab, setActiveTab,
    expandedThreads, toggleThread, fixDialogOpen, setFixDialogOpen,
    selectedFailure, fixNote, setFixNote, submitting, role, user,
    getFilteredFailures, openMarkFixedDialog, handleMarkFixed, handleMarkVerified,
    loadFailures, unfixedCount, fixedCount, staleCount, overdueCount,
  } = useFailures();

  const canDeleteFailure = (failure: any) => role === "admin" || user?.id === failure.executed_by;

  const handleDeleteFailure = async (failureId: string) => {
    const { error } = await supabase.from("test_results").delete().eq("id", failureId);
    if (error) toastFn({ variant: "destructive", title: "Error", description: "Failed to delete" });
    else { toastFn({ title: "Failure deleted" }); loadFailures(); }
  };

  const getFixStatusBadge = (fixStatus: string | null) => {
    switch (fixStatus) {
      case "fixed":
        return <Badge className="bg-amber-100 text-amber-700 hover:bg-amber-100"><RefreshCw className="h-3 w-3 mr-1" />Re-test Required</Badge>;
      case "verified":
        return <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100"><CheckCircle2 className="h-3 w-3 mr-1" />Verified</Badge>;
      default:
        return <Badge className="bg-red-100 text-red-700 hover:bg-red-100"><AlertTriangle className="h-3 w-3 mr-1" />Unfixed</Badge>;
    }
  };

  const filteredFailures = getFilteredFailures();

  if (loading || projectLoading) {
    return <div className="flex items-center justify-center h-64"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  }

  if (!currentProject) {
    return (
      <Card className="glass">
        <CardContent className="flex flex-col items-center justify-center py-16">
          <FolderKanban className="h-12 w-12 text-muted-foreground/50 mb-4" />
          <h3 className="text-lg font-medium text-foreground mb-1">No Project Selected</h3>
          <p className="text-muted-foreground text-center max-w-sm">Please select a project from the header to view failures.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Failures</h1>
          <p className="text-muted-foreground">{failures.length} failed test{failures.length !== 1 ? "s" : ""} requiring attention</p>
        </div>
        <Button variant="outline" onClick={loadFailures}><RefreshCw className="h-4 w-4 mr-2" />Refresh</Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Card className="glass"><CardContent className="pt-4"><div className="text-2xl font-bold text-foreground">{failures.length}</div><p className="text-sm text-muted-foreground">Total Failures</p></CardContent></Card>
        <Card className="glass border-red-200"><CardContent className="pt-4"><div className="text-2xl font-bold text-red-600">{unfixedCount}</div><p className="text-sm text-muted-foreground">Unfixed</p></CardContent></Card>
        <Card className="glass border-amber-200"><CardContent className="pt-4"><div className="text-2xl font-bold text-amber-600">{fixedCount}</div><p className="text-sm text-muted-foreground">Awaiting Re-test</p></CardContent></Card>
        <Card className="glass border-orange-200"><CardContent className="pt-4"><div className="text-2xl font-bold text-orange-600">{staleCount}</div><p className="text-sm text-muted-foreground">Stale (&gt;7 days)</p></CardContent></Card>
      </div>

      {/* Filter Tabs */}
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as FilterTab)}>
        <TabsList className="grid w-full grid-cols-5 max-w-lg">
          <TabsTrigger value="all">All ({failures.length})</TabsTrigger>
          <TabsTrigger value="unfixed">Unfixed ({unfixedCount})</TabsTrigger>
          <TabsTrigger value="fixed">Fixed ({fixedCount})</TabsTrigger>
          <TabsTrigger value="overdue" className="text-destructive">Overdue ({overdueCount})</TabsTrigger>
          <TabsTrigger value="stale">Stale ({staleCount})</TabsTrigger>
        </TabsList>

        <TabsContent value={activeTab} className="mt-6">
          {filteredFailures.length === 0 ? (
            <Card className="glass">
              <CardContent className="flex flex-col items-center justify-center py-16">
                <CheckCircle2 className="h-12 w-12 text-emerald-500 mb-4" />
                <h3 className="text-lg font-medium text-foreground mb-1">
                  {activeTab === "all" ? "No failures!" : `No ${activeTab} failures`}
                </h3>
                <p className="text-muted-foreground text-center max-w-sm">
                  {activeTab === "all" ? "All tests are passing. Great job!" : `There are no failures in the "${activeTab}" category.`}
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {filteredFailures.map((failure) => {
                const testCase = failure.test_case;
                const scenario = testCase?.scenario;
                const daysSinceFailure = failure.executed_at ? differenceInDays(new Date(), new Date(failure.executed_at)) : 0;

                return (
                  <Card key={failure.id} className="glass">
                    <CardContent className="pt-4">
                      <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap mb-2">
                            <span className="text-sm font-mono text-muted-foreground">{testCase?.case_code}</span>
                            {getFixStatusBadge(failure.fix_status)}
                            {failure.due_date && failure.fix_status !== "verified" && (
                              <SLABadge dueDate={failure.due_date} slaStatus={failure.sla_status} fixStatus={failure.fix_status} />
                            )}
                            {daysSinceFailure > 7 && failure.fix_status !== "fixed" && failure.fix_status !== "verified" && (
                              <Badge variant="outline" className="text-orange-600 border-orange-300"><Clock className="h-3 w-3 mr-1" />{daysSinceFailure} days old</Badge>
                            )}
                          </div>
                          <h3 className="font-semibold text-foreground mb-1">{testCase?.title}</h3>
                          {scenario && (
                            <Link to={`/qa/scenarios/${scenario.id}`} className="text-sm text-muted-foreground hover:text-primary flex items-center gap-1">
                              <span>{scenario.scenario_code} - {scenario.name}</span><ExternalLink className="h-3 w-3" />
                            </Link>
                          )}
                          <p className="text-sm text-muted-foreground mt-2">
                            Failed on {failure.executed_at ? new Date(failure.executed_at).toLocaleDateString() : "N/A"}
                            {failure.tester_name && ` by ${failure.tester_name}`}
                          </p>
                          {(failure.actual_result || failure.notes) && (
                            <div className="mt-3 p-3 bg-destructive/10 border border-destructive/20 rounded-lg">
                              <p className="text-sm font-medium text-destructive mb-1">Issue:</p>
                              <p className="text-sm text-destructive/80">{failure.actual_result || failure.notes}</p>
                            </div>
                          )}
                          {failure.attachments && failure.attachments.length > 0 && (
                            <div className="mt-3"><AttachmentGallery attachments={failure.attachments} /></div>
                          )}
                          {failure.developer_response && (
                            <div className="mt-3 p-3 bg-emerald-50 border border-emerald-100 rounded-lg">
                              <p className="text-sm font-medium text-emerald-700 mb-1">
                                Fix by {failure.fixer_name || "Developer"}
                                {failure.fixed_at && ` (${formatDistanceToNow(new Date(failure.fixed_at), { addSuffix: true })})`}:
                              </p>
                              <p className="text-sm text-emerald-600">{failure.developer_response}</p>
                            </div>
                          )}
                          <Collapsible open={expandedThreads.has(failure.id)} onOpenChange={() => toggleThread(failure.id)} className="mt-3">
                            <CollapsibleTrigger asChild>
                              <Button variant="ghost" size="sm" className="w-full justify-between p-2 h-auto">
                                <span className="text-sm text-muted-foreground">View Thread</span>
                                {expandedThreads.has(failure.id) ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                              </Button>
                            </CollapsibleTrigger>
                            <CollapsibleContent>
                              <FailureThread failure={{ ...failure, tester_name: failure.tester_name, fixer_name: failure.fixer_name }} />
                            </CollapsibleContent>
                          </Collapsible>
                        </div>
                        <div className="flex flex-row md:flex-col gap-2 shrink-0">
                          {(!failure.fix_status || failure.fix_status === "unfixed") && (
                            <Button variant="outline" size="sm" onClick={() => openMarkFixedDialog(failure)} disabled={role !== "admin" && role !== "developer"}>
                              <Wrench className="h-4 w-4 mr-2" />Mark Fixed
                            </Button>
                          )}
                          {failure.fix_status === "fixed" && (
                            <Button variant="outline" size="sm" onClick={() => handleMarkVerified(failure)} className="text-emerald-600 border-emerald-300 hover:bg-emerald-50">
                              <CheckCircle2 className="h-4 w-4 mr-2" />Mark Verified
                            </Button>
                          )}
                          {scenario && (
                            <Button variant="ghost" size="sm" asChild><Link to={`/qa/scenarios/${scenario.id}`}>View Scenario</Link></Button>
                          )}
                          {canDeleteFailure(failure) && (
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive hover:bg-destructive/10">
                                  <Trash2 className="h-4 w-4 mr-2" />Delete
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Delete Failure?</AlertDialogTitle>
                                  <AlertDialogDescription>This will permanently remove this failure record. This cannot be undone.</AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                                  <AlertDialogAction className="bg-destructive text-destructive-foreground" onClick={() => handleDeleteFailure(failure.id)}>Delete</AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Mark Fixed Dialog */}
      <Dialog open={fixDialogOpen} onOpenChange={setFixDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Mark as Fixed</DialogTitle>
            <DialogDescription>Describe what was fixed so testers know what to verify.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {selectedFailure && (
              <div className="p-3 bg-muted rounded-lg">
                <p className="text-sm font-medium">{selectedFailure.test_case?.case_code}</p>
                <p className="text-sm text-muted-foreground">{selectedFailure.test_case?.title}</p>
              </div>
            )}
            <div>
              <label className="text-sm font-medium mb-2 block">What did you fix? *</label>
              <Textarea value={fixNote} onChange={(e) => setFixNote(e.target.value)} placeholder="Describe the fix so testers know what to verify..." className="min-h-[100px]" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setFixDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleMarkFixed} disabled={submitting || !fixNote.trim()}>
              {submitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <CheckCircle2 className="h-4 w-4 mr-2" />}
              Mark Fixed & Request Re-test
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
