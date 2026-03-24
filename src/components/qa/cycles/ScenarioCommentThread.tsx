import { useState, useEffect } from "react";
import { Send, Loader2, Trash2, Paperclip, X, Pencil, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useCommentThread } from "@/hooks/useCommentThread";
import { useToast } from "@/hooks/use-toast";
import { formatDistanceToNow } from "date-fns";

interface ScenarioCommentThreadProps {
  cycleId: string;
  scenarioId: string;
  onCommentCountChange?: (count: number) => void;
}

export function ScenarioCommentThread({ cycleId, scenarioId, onCommentCountChange }: ScenarioCommentThreadProps) {
  const { toast } = useToast();
  const {
    comments, loading, posting, editingId, editText, setEditText, saving,
    canEditComment, canDeleteComment, loadComments, startEdit, cancelEdit,
    saveEdit, postComment, deleteComment, uploadFiles,
  } = useCommentThread(cycleId, scenarioId, onCommentCountChange);

  const [newComment, setNewComment] = useState("");
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);

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

  const handlePost = async () => {
    setUploading(true);
    const urls = await uploadFiles(pendingFiles);
    setUploading(false);
    await postComment(newComment, urls);
    setNewComment("");
    setPendingFiles([]);
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
                  {canEditComment(c) && editingId !== c.id && (
                    <Button variant="ghost" size="icon" className="h-5 w-5 opacity-0 group-hover:opacity-100 transition-opacity" onClick={() => startEdit(c)}>
                      <Pencil className="h-3 w-3 text-muted-foreground" />
                    </Button>
                  )}
                  {canDeleteComment(c) && editingId !== c.id && (
                    <Button variant="ghost" size="icon" className="h-5 w-5 opacity-0 group-hover:opacity-100 transition-opacity" onClick={() => deleteComment(c.id)}>
                      <Trash2 className="h-3 w-3 text-destructive" />
                    </Button>
                  )}
                </div>

                {editingId === c.id ? (
                  <div className="space-y-2 mt-0.5">
                    <Textarea
                      value={editText}
                      onChange={(e) => setEditText(e.target.value)}
                      rows={2}
                      className="text-sm resize-none"
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) saveEdit();
                        if (e.key === "Escape") cancelEdit();
                      }}
                    />
                    <div className="flex gap-2">
                      <Button size="sm" className="h-6 text-xs" onClick={saveEdit} disabled={saving || !editText.trim()}>
                        {saving ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <Check className="h-3 w-3 mr-1" />}
                        Save
                      </Button>
                      <Button size="sm" variant="ghost" className="h-6 text-xs" onClick={cancelEdit} disabled={saving}>
                        Cancel
                      </Button>
                    </div>
                  </div>
                ) : (
                  <p className="text-sm text-foreground/90 whitespace-pre-wrap mt-0.5">{c.comment}</p>
                )}

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
              <PendingFilePreview key={`${f.name}-${i}`} file={f} onRemove={() => setPendingFiles(prev => prev.filter((_, idx) => idx !== i))} />
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

function PendingFilePreview({ file, onRemove }: { file: File; onRemove: () => void }) {
  const [url, setUrl] = useState<string>("");
  useEffect(() => {
    const objectUrl = URL.createObjectURL(file);
    setUrl(objectUrl);
    return () => URL.revokeObjectURL(objectUrl);
  }, [file]);

  if (!url) return null;
  return (
    <div className="relative">
      <img src={url} alt="" className="h-12 w-12 object-cover rounded border" />
      <button
        onClick={onRemove}
        className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-destructive text-destructive-foreground flex items-center justify-center"
      >
        <X className="h-2.5 w-2.5" />
      </button>
    </div>
  );
}
