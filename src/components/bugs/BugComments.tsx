import { useState, useEffect, useRef, useMemo } from "react";
import { Loader2, Send, MessageSquare, Paperclip, X, Image as ImageIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { formatDistanceToNow, format } from "date-fns";
import type { BugComment } from "@/types/bugs";
import { MarkdownRenderer } from "@/components/bugs/MarkdownRenderer";

// Component that creates object URLs with proper cleanup
function PendingFilePreviews({ files, onRemove }: { files: File[]; onRemove: (i: number) => void }) {
  const urls = useMemo(() => files.map(f => URL.createObjectURL(f)), [files]);

  useEffect(() => {
    return () => { urls.forEach(u => URL.revokeObjectURL(u)); };
  }, [urls]);

  if (files.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-2">
      {files.map((file, i) => (
        <div key={i} className="relative w-14 h-14 rounded-md border border-border overflow-hidden group">
          <img src={urls[i]} alt={file.name} className="w-full h-full object-cover" />
          <button
            onClick={() => onRemove(i)}
            className="absolute top-0 right-0 bg-destructive text-destructive-foreground rounded-bl-md p-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
          >
            <X className="h-3 w-3" />
          </button>
        </div>
      ))}
    </div>
  );
}

interface BugCommentsProps {
  bugId: string;
}

export function BugComments({ bugId }: BugCommentsProps) {
  const { user } = useAuth();
  const [comments, setComments] = useState<BugComment[]>([]);
  const [loading, setLoading] = useState(true);
  const [newComment, setNewComment] = useState("");
  const [posting, setPosting] = useState(false);
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);
  const [enlargedImage, setEnlargedImage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    loadComments();
  }, [bugId]);

  const loadComments = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("bug_comments")
        .select("*")
        .eq("bug_id", bugId)
        .order("created_at", { ascending: true });

      if (error) throw error;

      const userIds = [...new Set((data || []).map(c => c.user_id))];
      let profilesMap: Record<string, { full_name: string; email: string }> = {};

      if (userIds.length > 0) {
        const { data: profiles } = await supabase
          .from("profiles")
          .select("user_id, full_name, email")
          .in("user_id", userIds);

        (profiles || []).forEach(p => {
          profilesMap[p.user_id] = { full_name: p.full_name, email: p.email };
        });
      }

      setComments((data || []).map(c => ({
        ...c,
        attachments: c.attachments || [],
        profile: profilesMap[c.user_id],
      })) as BugComment[]);
    } catch (error) {
      console.error("Error loading comments:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const validFiles = files.filter(f => {
      if (f.size > 5 * 1024 * 1024) {
        toast.error(`${f.name} exceeds 5MB limit`);
        return false;
      }
      return true;
    });
    setPendingFiles(prev => [...prev, ...validFiles].slice(0, 3));
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const removePendingFile = (index: number) => {
    setPendingFiles(prev => prev.filter((_, i) => i !== index));
  };

  const uploadFiles = async (): Promise<string[]> => {
    if (!user || pendingFiles.length === 0) return [];
    const urls: string[] = [];

    for (const file of pendingFiles) {
      const ext = file.name.split(".").pop();
      const path = `comments/${user.id}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
      const { error } = await supabase.storage.from("bug-attachments").upload(path, file);
      if (error) {
        console.error("Upload error:", error);
        continue;
      }
      const { data: urlData } = supabase.storage.from("bug-attachments").getPublicUrl(path);
      urls.push(urlData.publicUrl);
    }
    return urls;
  };

  const postComment = async () => {
    if (!user || (!newComment.trim() && pendingFiles.length === 0)) return;

    setPosting(true);
    try {
      const attachmentUrls = await uploadFiles();

      const { error } = await supabase.from("bug_comments").insert({
        bug_id: bugId,
        user_id: user.id,
        comment: newComment.trim(),
        attachments: attachmentUrls,
      } as any);

      if (error) throw error;

      setNewComment("");
      setPendingFiles([]);
      await loadComments();
      toast.success("Comment posted");
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setPosting(false);
    }
  };

  return (
    <>
      <Card className="glass">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <MessageSquare className="h-5 w-5 text-primary" />
            Activity ({comments.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {loading ? (
            <div className="flex justify-center py-4">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : comments.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              No comments yet. Start the discussion.
            </p>
          ) : (
            <div className="space-y-4">
              {comments.map(comment => (
                <div key={comment.id} className="flex gap-3">
                  <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary text-xs font-bold shrink-0">
                    {comment.profile?.full_name?.charAt(0) || "?"}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="text-sm font-medium text-foreground">
                        {comment.profile?.full_name || "Unknown"}
                      </span>
                      <span className="text-xs text-muted-foreground" title={format(new Date(comment.created_at), "dd MMM yyyy, h:mm a")}>
                        {format(new Date(comment.created_at), "dd MMM yyyy, h:mm a")}
                        {" • "}
                        {formatDistanceToNow(new Date(comment.created_at), { addSuffix: true })}
                      </span>
                    </div>
                    <MarkdownRenderer content={comment.comment} className="text-sm" />

                    {/* Comment attachments */}
                    {comment.attachments && comment.attachments.length > 0 && (
                      <div className="flex flex-wrap gap-2 mt-2">
                        {comment.attachments.map((url, i) => (
                          <button
                            key={i}
                            onClick={() => setEnlargedImage(url)}
                            className="w-16 h-16 rounded-md border border-border overflow-hidden hover:ring-2 hover:ring-primary/50 transition-all"
                          >
                            <img src={url} alt={`Attachment ${i + 1}`} className="w-full h-full object-cover" />
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Post Comment */}
          {user && (
            <div className="pt-2 border-t border-border space-y-2">
              <Textarea
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                placeholder="Add a comment..."
                rows={2}
              />

              {/* Pending file previews */}
              <PendingFilePreviews files={pendingFiles} onRemove={removePendingFile} />

              <div className="flex gap-2">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  multiple
                  className="hidden"
                  onChange={handleFileSelect}
                />
                <Button
                  variant="outline"
                  size="icon"
                  className="shrink-0"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={pendingFiles.length >= 3}
                  title="Attach images (max 3)"
                >
                  <Paperclip className="h-4 w-4" />
                </Button>
                <div className="flex-1" />
                <Button
                  onClick={postComment}
                  disabled={posting || (!newComment.trim() && pendingFiles.length === 0)}
                  size="sm"
                  className="shrink-0"
                >
                  {posting ? <Loader2 className="h-4 w-4 animate-spin mr-1.5" /> : <Send className="h-4 w-4 mr-1.5" />}
                  Send
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Enlarged image overlay */}
      {enlargedImage && (
        <div
          className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4"
          onClick={() => setEnlargedImage(null)}
        >
          <button
            className="absolute top-4 right-4 text-white hover:text-gray-300"
            onClick={() => setEnlargedImage(null)}
          >
            <X className="h-6 w-6" />
          </button>
          <img
            src={enlargedImage}
            alt="Enlarged"
            className="max-w-full max-h-full object-contain rounded-lg"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </>
  );
}
