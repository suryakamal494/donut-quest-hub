import { useState, useEffect, useCallback } from "react";
import { Image as ImageIcon, X, ZoomIn, ChevronLeft, ChevronRight } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

interface AttachmentGalleryProps {
  attachments: string[];
  className?: string;
}

export function AttachmentGallery({ attachments, className }: AttachmentGalleryProps) {
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);

  const isOpen = selectedIndex !== null;
  const currentUrl = isOpen ? attachments[selectedIndex] : null;

  const goPrev = useCallback(() => {
    setSelectedIndex(prev => prev !== null && prev > 0 ? prev - 1 : prev);
  }, []);

  const goNext = useCallback(() => {
    setSelectedIndex(prev => prev !== null && prev < attachments.length - 1 ? prev + 1 : prev);
  }, [attachments.length]);

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.key === "ArrowLeft") goPrev();
    if (e.key === "ArrowRight") goNext();
  }, [goPrev, goNext]);

  useEffect(() => {
    if (isOpen) {
      window.addEventListener("keydown", handleKeyDown);
      return () => window.removeEventListener("keydown", handleKeyDown);
    }
  }, [isOpen, handleKeyDown]);

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
              onClick={() => setSelectedIndex(index)}
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
      <Dialog open={isOpen} onOpenChange={() => setSelectedIndex(null)}>
        <DialogContent className="max-w-4xl max-h-[90vh] p-0 overflow-hidden">
          <DialogHeader className="p-4 pb-0">
            <DialogTitle className="flex items-center justify-between">
              <span>Screenshot</span>
              <span className="text-sm font-normal text-muted-foreground mr-6">
                {selectedIndex !== null ? selectedIndex + 1 : 0} of {attachments.length}
              </span>
            </DialogTitle>
          </DialogHeader>
          <div className="p-4 pt-2 relative flex items-center">
            {/* Prev button */}
            {selectedIndex !== null && selectedIndex > 0 && (
              <Button
                variant="ghost"
                size="icon"
                className="absolute left-2 z-10 rounded-full bg-background/80 hover:bg-background shadow"
                onClick={goPrev}
              >
                <ChevronLeft className="h-5 w-5" />
              </Button>
            )}

            {currentUrl && (
              <img
                src={currentUrl}
                alt="Full size screenshot"
                className="w-full h-auto max-h-[70vh] object-contain rounded-lg mx-auto"
              />
            )}

            {/* Next button */}
            {selectedIndex !== null && selectedIndex < attachments.length - 1 && (
              <Button
                variant="ghost"
                size="icon"
                className="absolute right-2 z-10 rounded-full bg-background/80 hover:bg-background shadow"
                onClick={goNext}
              >
                <ChevronRight className="h-5 w-5" />
              </Button>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
