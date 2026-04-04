import { useEffect } from "react";
import { Loader2, CheckCircle2, XCircle, AlertTriangle } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { useCommentThread } from "@/hooks/useCommentThread";
import { formatDistanceToNow } from "date-fns";

interface ScenarioCommentThreadProps {
  cycleId: string;
  scenarioId: string;
  onCommentCountChange?: (count: number) => void;
}

export function ScenarioCommentThread({ cycleId, scenarioId, onCommentCountChange }: ScenarioCommentThreadProps) {
  const { comments, loading, loadComments } = useCommentThread(cycleId, scenarioId, onCommentCountChange);

  useEffect(() => {
    loadComments();
  }, [loadComments]);

  const getInitials = (name: string) =>
    name.split(" ").map(w => w[0]).join("").toUpperCase().slice(0, 2);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-6">
        <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {comments.length === 0 ? (
        <p className="text-xs text-muted-foreground text-center py-4">
          No verdicts recorded yet. Submit a verdict to add comments.
        </p>
      ) : (
        <div className="space-y-3 max-h-[400px] overflow-y-auto pr-1">
          {comments.map((c) => (
            <div key={c.id} className="flex gap-2.5">
              <Avatar className="h-7 w-7 flex-shrink-0 mt-0.5">
                <AvatarFallback className="text-[10px] bg-primary/10 text-primary">
                  {getInitials(c.profile?.full_name || "?")}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs font-medium text-foreground">{c.profile?.full_name}</span>
                  {c.verdict_status === "pass" && (
                    <Badge className="bg-green-600 text-white text-[10px] px-1.5 py-0 h-4">
                      <CheckCircle2 className="h-3 w-3 mr-0.5" /> PASS
                    </Badge>
                  )}
                  {c.verdict_status === "fail" && (
                    <Badge className="bg-red-600 text-white text-[10px] px-1.5 py-0 h-4">
                      <XCircle className="h-3 w-3 mr-0.5" /> FAIL
                    </Badge>
                  )}
                  <span className="text-[10px] text-muted-foreground">
                    {formatDistanceToNow(new Date(c.created_at), { addSuffix: true })}
                  </span>
                </div>
                <p className="text-sm text-foreground/90 whitespace-pre-wrap mt-0.5">{c.comment}</p>

                {c.attachments.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-1.5">
                    {c.attachments.map((url, i) => (
                      <a key={i} href={url} target="_blank" rel="noopener noreferrer">
                        <img src={url} alt="" className="h-16 w-16 object-cover rounded border" />
                      </a>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
