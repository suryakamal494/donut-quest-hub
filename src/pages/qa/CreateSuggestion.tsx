import { useState, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useSuggestions } from "@/hooks/useSuggestions";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RichTextEditor } from "@/components/ui/rich-text-editor";
import { ArrowLeft, Lightbulb, Upload, X, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export default function CreateSuggestion() {
  const navigate = useNavigate();
  const { createSuggestion } = useSuggestions();
  const { user } = useAuth();

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("feature");
  const [priority, setPriority] = useState("medium");
  const [attachments, setAttachments] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = useCallback(async (files: FileList | null) => {
    if (!files || files.length === 0 || !user) return;
    const maxFiles = 8;
    const remaining = maxFiles - attachments.length;
    if (remaining <= 0) {
      toast.error(`Maximum ${maxFiles} attachments allowed`);
      return;
    }

    const validFiles = Array.from(files).slice(0, remaining).filter(file => {
      if (!file.type.startsWith("image/")) { toast.error(`${file.name} is not an image`); return false; }
      if (file.size > 5 * 1024 * 1024) { toast.error(`${file.name} is too large (max 5MB)`); return false; }
      return true;
    });
    if (validFiles.length === 0) return;

    setUploading(true);
    try {
      const urls: string[] = [];
      for (const file of validFiles) {
        const ext = file.name.split(".").pop();
        const path = `suggestions/${user.id}/${Date.now()}-${Math.random().toString(36).substring(7)}.${ext}`;
        const { data, error } = await supabase.storage.from("bug-attachments").upload(path, file, { cacheControl: "3600", upsert: false });
        if (error) { toast.error(`Failed to upload ${file.name}`); continue; }
        const { data: urlData } = supabase.storage.from("bug-attachments").getPublicUrl(data.path);
        urls.push(urlData.publicUrl);
      }
      if (urls.length > 0) {
        setAttachments(prev => [...prev, ...urls]);
        toast.success(`${urls.length} file(s) uploaded`);
      }
    } catch { toast.error("Upload failed"); }
    finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }, [attachments, user]);

  const removeAttachment = useCallback((url: string) => {
    setAttachments(prev => prev.filter(u => u !== url));
    const path = url.split("/bug-attachments/")[1];
    if (path) supabase.storage.from("bug-attachments").remove([path]).catch(() => {});
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    await createSuggestion.mutateAsync({
      title: title.trim(),
      description,
      category,
      priority,
      attachments,
    });
    navigate("/qa/suggestions");
  };

  return (
    <div className="p-4 md:p-6 max-w-3xl mx-auto space-y-4">
      <Button variant="ghost" size="sm" onClick={() => navigate("/qa/suggestions")}>
        <ArrowLeft className="h-4 w-4 mr-1" /> Back to Suggestions
      </Button>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Lightbulb className="h-5 w-5 text-primary" />
            New Product Suggestion
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="title">Title *</Label>
              <Input
                id="title"
                placeholder="Brief summary of your suggestion"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <Label>Description</Label>
              <RichTextEditor content={description} onChange={setDescription} placeholder="Describe your suggestion in detail..." />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Category</Label>
                <Select value={category} onValueChange={setCategory}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ux">UX</SelectItem>
                    <SelectItem value="feature">Feature</SelectItem>
                    <SelectItem value="performance">Performance</SelectItem>
                    <SelectItem value="workflow">Workflow</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Priority</Label>
                <Select value={priority} onValueChange={setPriority}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="critical">Critical</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Image Attachments */}
            <div className="space-y-2">
              <Label>Screenshots / Attachments</Label>
              <div
                onClick={() => !uploading && attachments.length < 8 && fileInputRef.current?.click()}
                onDrop={(e) => { e.preventDefault(); handleFileSelect(e.dataTransfer.files); }}
                onDragOver={(e) => e.preventDefault()}
                className={cn(
                  "border-2 border-dashed rounded-lg p-4 text-center cursor-pointer transition-colors",
                  "hover:border-primary hover:bg-primary/5",
                  (uploading || attachments.length >= 8) && "opacity-50 cursor-not-allowed"
                )}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={(e) => handleFileSelect(e.target.files)}
                  className="hidden"
                  disabled={uploading || attachments.length >= 8}
                />
                {uploading ? (
                  <div className="flex items-center justify-center gap-2 text-muted-foreground">
                    <Loader2 className="h-5 w-5 animate-spin" />
                    <span className="text-sm">Uploading...</span>
                  </div>
                ) : (
                  <div className="flex flex-col items-center gap-1 text-muted-foreground">
                    <Upload className="h-6 w-6" />
                    <span className="text-sm">
                      {attachments.length >= 8 ? "Maximum 8 attachments reached" : "Drop images here or click to upload"}
                    </span>
                    <span className="text-xs">Max 5MB per file • {attachments.length}/8 files</span>
                  </div>
                )}
              </div>
              {attachments.length > 0 && (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-2">
                  {attachments.map((url, i) => (
                    <div key={url} className="relative group aspect-video rounded-lg overflow-hidden border bg-muted">
                      <img src={url} alt={`Attachment ${i + 1}`} className="w-full h-full object-cover" />
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); removeAttachment(url); }}
                        className="absolute top-1 right-1 p-1 rounded-full bg-black/50 text-white opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="flex gap-2 justify-end">
              <Button type="button" variant="outline" onClick={() => navigate("/qa/suggestions")}>
                Cancel
              </Button>
              <Button type="submit" disabled={createSuggestion.isPending || !title.trim()}>
                {createSuggestion.isPending ? "Submitting..." : "Submit Suggestion"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
