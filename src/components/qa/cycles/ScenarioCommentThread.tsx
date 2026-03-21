import { useState, useEffect, useCallback } from "react";
import { MessageSquare, Send, Loader2, Trash2, Paperclip, X, Pencil, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { formatDistanceToNow } from "date-fns";
import { useToast } from "@/hooks/use-toast";

interface Comment {
  id: string;
  user_id: string;
  comment: string;
  attachments: string[];
  created_at: string;
  profile?: { full_name: string; email: string };
}

interface ScenarioCommentThreadProps {
  cycleId: string;
  scenarioId: string;
  onCommentCountChange?: (count: number) => void;
}

export function ScenarioCommentThread({ cycleId, scenarioId, onCommentCountChange }: ScenarioCommentThreadProps) {
  const { user, role } = useAuth();
  const { toast } = useToast();
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);
  const [newComment, setNewComment] = useState("");
  const [posting, setPosting] = useState(false);
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState("");
  const [saving, setSaving] = useState(false);

  const canEditComment = (c: Comment) =>
    user?.id === c.user_id || role === "admin";

  const startEdit = (c: Comment) => {
    setEditingId(c.id);
    setEditText(c.comment);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditText("");
  };

  const saveEdit = async () => {
    if (!editingId || !editText.trim()) return;
    setSaving(true);
    try {
      const { error } = await supabase
        .from("cycle_scenario_comments")
        .update({ comment: editText.trim() })
        .eq("id", editingId);
      if (error) throw error;
      toast({ title: "Comment updated" });
      setEditingId(null);
      setEditText("");
      await loadComments();
    } catch (err: any) {
      toast({ title: "Error updating comment", description: err.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const loadComments = useCallback(async () => {
    const { data, error } = await supabase
      .from("cycle_scenario_comments")
      .select("*")
      .eq("cycle_id", cycleId)
      .eq("scenario_id", scenarioId)
      .order("created_at", { ascending: true });

    if (error) {
      console.error("Error loading comments:", error);
      return;
    }

    // Enrich with profiles
    const userIds = [...new Set((data || []).map((c: any) => c.user_id))];
    let profileMap: Record<string, { full_name: string; email: string }> = {};
    if (userIds.length > 0) {
      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, full_name, email")
        .in("user_id", userIds);
      (profiles || []).forEach((p: any) => {
        profileMap[p.user_id] = { full_name: p.full_name, email: p.email };
      });
    }

    const enriched = (data || []).map((c: any) => ({
      ...c,
      attachments: c.attachments || [],
      profile: profileMap[c.user_id] || { full_name: "Unknown", email: "" },
    }));

    setComments(enriched);
    onCommentCountChange?.(enriched.length);
    setLoading(false);
  }, [cycleId, scenarioId, onCommentCountChange]);

  useEffect(() => {
    loadComments();
  }, [loadComments]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const valid = files.filter(f => f.size <= 5 * 1024 * 1024 && f.type.startsWith("image/"));
    if (valid.length < files.length) {
      toast({ title: "Some files skipped", description: "Max 5MB, images only", variant: "destructive" });
    }
    setPendingFiles(prev => [...prev, ...valid].slice(0, 5));
    e.target.value = "";
  };

  const uploadFiles = async (): Promise<string[]> => {
    if (pendingFiles.length === 0) return [];
    setUploading(true);
    const urls: string[] = [];
    for (const file of pendingFiles) {
      const path = `cycle-comments/${cycleId}/${scenarioId}/${Date.now()}-${file.name}`;
      const { error } = await supabase.storage.from("bug-attachments").upload(path, file, { cacheControl: "3600" });
      if (!error) {
        const { data: urlData } = supabase.storage.from("bug-attachments").getPublicUrl(path);
        urls.push(urlData.publicUrl);
      }
    }
    setUploading(false);
    return urls;
  };

  const handlePost = async () => {
    if (!user) {
      toast({ title: "Please log in to comment", variant: "destructive" });
      return;
    }
    if (!newComment.trim() && pendingFiles.length === 0) return;
    try {
      setPosting(true);
      const attachmentUrls = await uploadFiles();
      const commentText = newComment.trim() || "(attachment)";

      const { error } = await supabase.from("cycle_scenario_comments").insert({
        cycle_id: cycleId,
        scenario_id: scenarioId,
        user_id: user.id,
        comment: commentText,
        attachments: attachmentUrls,
      });
      if (error) {
        console.error("Comment insert error:", error);
        throw error;
      }
      setNewComment("");
      setPendingFiles([]);
      await loadComments();
      toast({ title: "Comment added" });
    } catch (err: any) {
      toast({ title: "Error posting comment", description: err.message, variant: "destructive" });
    } finally {
      setPosting(false);
    }
  };

  const handleDelete = async (commentId: string) => {
    const { error } = await supabase.from("cycle_scenario_comments").delete().eq("id", commentId);
    if (!error) loadComments();
  };

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
      {/* Comments list */}
      {comments.length === 0 ? (
        <p className="text-xs text-muted-foreground text-center py-4">
          No comments yet. Be the first to add an observation.
        </p>
      ) : (
        <div className="space-y-3 max-h-[400px] overflow-y-auto pr-1">
          {comments.map((c) => (
            <div key={c.id} className="flex gap-2.5 group">
              <Avatar className="h-7 w-7 flex-shrink-0 mt-0.5">
                <AvatarFallback className="text-[10px] bg-primary/10 text-primary">
                  {getInitials(c.profile?.full_name || "?")}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-medium text-foreground">{c.profile?.full_name}</span>
                  <span className="text-[10px] text-muted-foreground">
                    {formatDistanceToNow(new Date(c.created_at), { addSuffix: true })}
                  </span>
                  {user?.id === c.user_id && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-5 w-5 opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={() => handleDelete(c.id)}
                    >
                      <Trash2 className="h-3 w-3 text-destructive" />
                    </Button>
                  )}
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

      {/* New comment input */}
      <div className="space-y-2 pt-2 border-t">
        <Textarea
          value={newComment}
          onChange={(e) => setNewComment(e.target.value)}
          placeholder="Add your observation..."
          rows={2}
          className="text-sm resize-none"
          onKeyDown={(e) => {
            if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) handlePost();
          }}
        />
        {pendingFiles.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {pendingFiles.map((f, i) => (
              <div key={i} className="relative">
                <img
                  src={URL.createObjectURL(f)}
                  alt=""
                  className="h-12 w-12 object-cover rounded border"
                />
                <button
                  onClick={() => setPendingFiles(prev => prev.filter((_, idx) => idx !== i))}
                  className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-destructive text-destructive-foreground flex items-center justify-center"
                >
                  <X className="h-2.5 w-2.5" />
                </button>
              </div>
            ))}
          </div>
        )}
        <div className="flex items-center gap-2 justify-end">
          <label className="cursor-pointer">
            <input type="file" accept="image/*" multiple className="hidden" onChange={handleFileSelect} />
            <Button variant="ghost" size="sm" className="h-7 text-xs" asChild>
              <span><Paperclip className="h-3.5 w-3.5 mr-1" /> Attach</span>
            </Button>
          </label>
          <Button
            size="sm"
            className="h-7 text-xs"
            onClick={handlePost}
            disabled={posting || uploading || (!newComment.trim() && pendingFiles.length === 0)}
          >
            {(posting || uploading) ? (
              <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" />
            ) : (
              <Send className="h-3.5 w-3.5 mr-1" />
            )}
            Post
          </Button>
        </div>
      </div>
    </div>
  );
}
