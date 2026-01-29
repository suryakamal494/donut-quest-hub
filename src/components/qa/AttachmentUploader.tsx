import { useState, useRef, useCallback } from "react";
import { Upload, X, Image as ImageIcon, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface AttachmentUploaderProps {
  testResultId: string;
  userId: string;
  onUploadComplete?: (urls: string[]) => void;
  existingAttachments?: string[];
  maxFiles?: number;
  className?: string;
}

export function AttachmentUploader({
  testResultId,
  userId,
  onUploadComplete,
  existingAttachments = [],
  maxFiles = 5,
  className,
}: AttachmentUploaderProps) {
  const [uploading, setUploading] = useState(false);
  const [attachments, setAttachments] = useState<string[]>(existingAttachments);
  const [previews, setPreviews] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = useCallback(async (files: FileList | null) => {
    if (!files || files.length === 0) return;

    const remainingSlots = maxFiles - attachments.length;
    if (remainingSlots <= 0) {
      toast.error(`Maximum ${maxFiles} attachments allowed`);
      return;
    }

    const filesToUpload = Array.from(files).slice(0, remainingSlots);
    const validFiles = filesToUpload.filter(file => {
      if (!file.type.startsWith('image/')) {
        toast.error(`${file.name} is not an image`);
        return false;
      }
      if (file.size > 5 * 1024 * 1024) {
        toast.error(`${file.name} is too large (max 5MB)`);
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
        const fileName = `${userId}/${testResultId}/${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;

        const { data, error } = await supabase.storage
          .from('failure-attachments')
          .upload(fileName, file, {
            cacheControl: '3600',
            upsert: false,
          });

        if (error) {
          console.error('Upload error:', error);
          toast.error(`Failed to upload ${file.name}`);
          continue;
        }

        const { data: urlData } = supabase.storage
          .from('failure-attachments')
          .getPublicUrl(data.path);

        uploadedUrls.push(urlData.publicUrl);
      }

      if (uploadedUrls.length > 0) {
        const newAttachments = [...attachments, ...uploadedUrls];
        setAttachments(newAttachments);
        onUploadComplete?.(newAttachments);
        toast.success(`${uploadedUrls.length} file(s) uploaded`);
      }
    } catch (error) {
      console.error('Upload error:', error);
      toast.error('Failed to upload files');
    } finally {
      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  }, [attachments, maxFiles, onUploadComplete, testResultId, userId]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    handleFileSelect(e.dataTransfer.files);
  }, [handleFileSelect]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
  }, []);

  const removeAttachment = useCallback(async (urlToRemove: string) => {
    // Extract path from URL to delete from storage
    const path = urlToRemove.split('/failure-attachments/')[1];
    
    if (path) {
      try {
        await supabase.storage.from('failure-attachments').remove([path]);
      } catch (error) {
        console.error('Error deleting file:', error);
      }
    }

    const newAttachments = attachments.filter(url => url !== urlToRemove);
    setAttachments(newAttachments);
    onUploadComplete?.(newAttachments);
  }, [attachments, onUploadComplete]);

  return (
    <div className={cn("space-y-3", className)}>
      {/* Upload Zone */}
      <div
        onDrop={handleDrop}
        onDragOver={handleDragOver}
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
          accept="image/*"
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
                : "Drop images here or click to upload"}
            </span>
            <span className="text-xs">Max 5MB per file • {attachments.length}/{maxFiles} files</span>
          </div>
        )}
      </div>

      {/* Preview Grid */}
      {attachments.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {attachments.map((url, index) => (
            <div
              key={url}
              className="relative group aspect-video rounded-lg overflow-hidden border bg-muted"
            >
              <img
                src={url}
                alt={`Attachment ${index + 1}`}
                className="w-full h-full object-cover"
                onError={(e) => {
                  (e.target as HTMLImageElement).src = '/placeholder.svg';
                }}
              />
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  removeAttachment(url);
                }}
                className="absolute top-1 right-1 p-1 rounded-full bg-black/50 text-white opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
