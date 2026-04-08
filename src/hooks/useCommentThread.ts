import { useState, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";

export interface CommentData {
  id: string;
  user_id: string;
  comment: string;
  attachments: string[];
  created_at: string;
  verdict_status?: string | null;
  profile?: { full_name: string; email: string };
}

export function useCommentThread(
  cycleId: string,
  scenarioId: string,
  onCommentCountChange?: (count: number) => void
) {
  const { user, role } = useAuth();
  const { toast } = useToast();
  const [comments, setComments] = useState<CommentData[]>([]);
  const [loading, setLoading] = useState(true);
  const [posting, setPosting] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState("");
  const [saving, setSaving] = useState(false);

  const onCommentCountChangeRef = useRef(onCommentCountChange);
  onCommentCountChangeRef.current = onCommentCountChange;

  const canEditComment = (c: CommentData) =>
    user?.id === c.user_id || role === "admin";

  const canDeleteComment = canEditComment;

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
      profile: profileMap[c.user_id] || { full_name: "Team Member", email: "" },
    }));

    setComments(enriched);
    onCommentCountChangeRef.current?.(enriched.length);
    setLoading(false);
  }, [cycleId, scenarioId]);

  const startEdit = (c: CommentData) => {
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

  const postComment = async (text: string, attachmentUrls: string[]) => {
    if (!user) {
      toast({ title: "Please log in to comment", variant: "destructive" });
      return;
    }
    if (!text.trim() && attachmentUrls.length === 0) return;
    try {
      setPosting(true);
      const commentText = text.trim() || "(attachment)";

      const { error } = await supabase.from("cycle_scenario_comments").insert({
        cycle_id: cycleId,
        scenario_id: scenarioId,
        user_id: user.id,
        comment: commentText,
        attachments: attachmentUrls,
      });
      if (error) throw error;
      await loadComments();
      toast({ title: "Comment added" });
    } catch (err: any) {
      toast({ title: "Error posting comment", description: err.message, variant: "destructive" });
    } finally {
      setPosting(false);
    }
  };

  const deleteComment = async (commentId: string) => {
    const { error } = await supabase.from("cycle_scenario_comments").delete().eq("id", commentId);
    if (!error) loadComments();
  };

  const uploadFiles = async (files: File[]): Promise<string[]> => {
    if (files.length === 0) return [];
    const urls: string[] = [];
    for (const file of files) {
      const path = `cycle-comments/${cycleId}/${scenarioId}/${Date.now()}-${file.name}`;
      const { error } = await supabase.storage.from("bug-attachments").upload(path, file, { cacheControl: "3600" });
      if (!error) {
        const { data: urlData } = supabase.storage.from("bug-attachments").getPublicUrl(path);
        urls.push(urlData.publicUrl);
      }
    }
    return urls;
  };

  return {
    comments,
    loading,
    posting,
    editingId,
    editText,
    setEditText,
    saving,
    canEditComment,
    canDeleteComment,
    loadComments,
    startEdit,
    cancelEdit,
    saveEdit,
    postComment,
    deleteComment,
    uploadFiles,
  };
}
