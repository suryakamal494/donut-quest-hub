import { useState } from "react";
import { Image as ImageIcon, X, ZoomIn } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

interface AttachmentGalleryProps {
  attachments: string[];
  className?: string;
}

export function AttachmentGallery({ attachments, className }: AttachmentGalleryProps) {
  const [selectedImage, setSelectedImage] = useState<string | null>(null);

  if (!attachments || attachments.length === 0) {
    return null;
  }

  return (
    <>
      <div className={cn("space-y-2", className)}>
        <p className="text-xs font-medium text-muted-foreground flex items-center gap-1">
          <ImageIcon className="h-3 w-3" />
          Attachments ({attachments.length})
        </p>
        <div className="flex flex-wrap gap-2">
          {attachments.map((url, index) => (
            <button
              key={url}
              onClick={() => setSelectedImage(url)}
              className="relative w-16 h-16 rounded-lg overflow-hidden border bg-muted group hover:ring-2 ring-primary transition-all"
            >
              <img
                src={url}
                alt={`Attachment ${index + 1}`}
                className="w-full h-full object-cover"
                onError={(e) => {
                  (e.target as HTMLImageElement).src = '/placeholder.svg';
                }}
              />
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center">
                <ZoomIn className="h-4 w-4 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Lightbox Dialog */}
      <Dialog open={!!selectedImage} onOpenChange={() => setSelectedImage(null)}>
        <DialogContent className="max-w-4xl max-h-[90vh] p-0 overflow-hidden">
          <DialogHeader className="p-4 pb-0">
            <DialogTitle>Screenshot</DialogTitle>
          </DialogHeader>
          <div className="p-4 pt-2">
            {selectedImage && (
              <img
                src={selectedImage}
                alt="Full size screenshot"
                className="w-full h-auto max-h-[70vh] object-contain rounded-lg"
              />
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
