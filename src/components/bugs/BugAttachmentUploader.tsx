import { useState, useRef, useCallback } from "react";
import { Upload, X, Loader2, FileText } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface BugAttachmentUploaderProps {
  bugId: string;
  userId: string;
  /** Controlled mode (preferred): parent owns the attachments list. */
  value?: string[];
  onChange?: (urls: string[]) => void;
  /** Legacy/uncontrolled-seed support. Used only if `value` is not provided. */
  onUploadComplete?: (urls: string[]) => void;
  existingAttachments?: string[];
  maxFiles?: number;
  className?: string;
}

export function BugAttachmentUploader({
  bugId,
  userId,
  value,
  onChange,
  onUploadComplete,
  existingAttachments = [],
  maxFiles = 8,
  className,
}: BugAttachmentUploaderProps) {
  const [uploading, setUploading] = useState(false);
  const [internalAttachments, setInternalAttachments] = useState<string[]>(existingAttachments);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const isControlled = value !== undefined;
  const attachments = isControlled ? value! : internalAttachments;

  const updateAttachments = useCallback((next: string[]) => {
    if (isControlled) {
      onChange?.(next);
    } else {
      setInternalAttachments(next);
      onChange?.(next);
      onUploadComplete?.(next);
    }
  }, [isControlled, onChange, onUploadComplete]);

  const handleFileSelect = useCallback(async (files: FileList | null) => {
    if (!files || files.length === 0) return;

    const remainingSlots = maxFiles - attachments.length;
    if (remainingSlots <= 0) {
      toast.error(`Maximum ${maxFiles} attachments allowed`);
      return;
    }

    const filesToUpload = Array.from(files).slice(0, remainingSlots);
    const allowedTypes = ['image/', 'application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
    const validFiles = filesToUpload.filter(file => {
      const isAllowed = allowedTypes.some(type => file.type.startsWith(type));
      if (!isAllowed) {
        toast.error(`${file.name} is not a supported file type`);
        return false;
      }
      if (file.size > 10 * 1024 * 1024) {
        toast.error(`${file.name} is too large (max 10MB)`);
        return false;
      }
      return true;
    });

    if (validFiles.length === 0) return;

    try {
      setUploading(true);
      const uploadedUrls: string[] = [];

      for (const file of validFiles) {
        const fileExt = file.name.split('.').pop();
        const fileName = `${userId}/${bugId}/${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;

        const { data, error } = await supabase.storage
          .from('bug-attachments')
          .upload(fileName, file, { cacheControl: '3600', upsert: false });

        if (error) {
          toast.error(`Failed to upload ${file.name}`);
          continue;
        }

        const { data: urlData } = supabase.storage
          .from('bug-attachments')
          .getPublicUrl(data.path);

        uploadedUrls.push(urlData.publicUrl);
      }

      if (uploadedUrls.length > 0) {
        updateAttachments([...attachments, ...uploadedUrls]);
        toast.success(`${uploadedUrls.length} file(s) uploaded`);
      }
    } catch (error) {
      toast.error('Failed to upload files');
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  }, [attachments, maxFiles, bugId, userId, updateAttachments]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    handleFileSelect(e.dataTransfer.files);
  }, [handleFileSelect]);

  const removeAttachment = useCallback(async (urlToRemove: string) => {
    const path = urlToRemove.split('/bug-attachments/')[1];
    if (path) {
      try {
        await supabase.storage.from('bug-attachments').remove([path]);
      } catch (error) {
        console.error('Error deleting file:', error);
      }
    }
    updateAttachments(attachments.filter(url => url !== urlToRemove));
  }, [attachments, updateAttachments]);

  return (
    <div className={cn("space-y-3", className)}>
      <div
        onDrop={handleDrop}
        onDragOver={(e) => e.preventDefault()}
        onClick={() => !uploading && fileInputRef.current?.click()}
        className={cn(
          "border-2 border-dashed rounded-lg p-4 text-center cursor-pointer transition-colors",
          "hover:border-primary hover:bg-primary/5",
          uploading && "opacity-50 cursor-not-allowed",
          attachments.length >= maxFiles && "opacity-50 cursor-not-allowed"
        )}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*,.pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
          multiple
          onChange={(e) => handleFileSelect(e.target.files)}
          className="hidden"
          disabled={uploading || attachments.length >= maxFiles}
        />
        {uploading ? (
          <div className="flex items-center justify-center gap-2 text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin" />
            <span className="text-sm">Uploading...</span>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-2 text-muted-foreground">
            <Upload className="h-6 w-6" />
            <span className="text-sm">
              {attachments.length >= maxFiles
                ? `Maximum ${maxFiles} attachments reached`
                : "Drop files here or click to upload"}
            </span>
            <span className="text-xs">Images, PDF, Word • Max 10MB per file • {attachments.length}/{maxFiles} files</span>
          </div>
        )}
      </div>

      {attachments.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {attachments.map((url, index) => {
            const isDoc = /\.(pdf|doc|docx)(\?|$)/i.test(url);
            const fileName = decodeURIComponent(url.split('/').pop()?.split('?')[0] || `File ${index + 1}`);
            return (
              <div key={url} className="relative group aspect-video rounded-lg overflow-hidden border bg-muted">
                {isDoc ? (
                  <a href={url} target="_blank" rel="noopener noreferrer" className="flex flex-col items-center justify-center w-full h-full gap-1 hover:bg-accent/50 transition-colors" onClick={(e) => e.stopPropagation()}>
                    <FileText className="h-8 w-8 text-muted-foreground" />
                    <span className="text-xs text-muted-foreground text-center px-2 truncate w-full">{fileName}</span>
                  </a>
                ) : (
                  <img
                    src={url}
                    alt={`Attachment ${index + 1}`}
                    className="w-full h-full object-cover"
                    onError={(e) => { (e.target as HTMLImageElement).src = '/placeholder.svg'; }}
                  />
                )}
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); removeAttachment(url); }}
                  className="absolute top-1 right-1 p-1 rounded-full bg-black/50 text-white opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
