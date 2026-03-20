import { useState } from "react";
import { ChevronDown, ChevronUp, BookOpen } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface CycleContextPanelProps {
  content: string | null;
  defaultExpanded?: boolean;
}

export function CycleContextPanel({ content, defaultExpanded = true }: CycleContextPanelProps) {
  const [expanded, setExpanded] = useState(defaultExpanded);

  if (!content) return null;

  // Check if content looks like HTML
  const isHtml = /<[a-z][\s\S]*>/i.test(content);

  return (
    <Card className="border-primary/20 bg-primary/5">
      <div
        className="flex items-center justify-between px-4 py-3 cursor-pointer select-none"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-center gap-2">
          <BookOpen className="h-4 w-4 text-primary" />
          <span className="font-semibold text-sm text-foreground">Context & Theory</span>
        </div>
        <Button variant="ghost" size="sm" className="h-7 w-7 p-0">
          {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </Button>
      </div>
      <div
        className={cn(
          "overflow-hidden transition-all duration-300",
          expanded ? "max-h-[2000px] opacity-100" : "max-h-0 opacity-0"
        )}
      >
        <CardContent className="pt-0 pb-4 px-4">
          {isHtml ? (
            <div
              className="prose prose-sm max-w-none text-foreground/90 [&_h1]:text-2xl [&_h1]:font-bold [&_h1]:mb-3 [&_h2]:text-xl [&_h2]:font-semibold [&_h2]:mb-2 [&_h3]:text-lg [&_h3]:font-semibold [&_h3]:mb-2 [&_p]:mb-2 [&_ul]:list-disc [&_ul]:pl-6 [&_ol]:list-decimal [&_ol]:pl-6 [&_li]:mb-1 [&_img]:rounded-lg [&_img]:max-w-full [&_img]:my-3 [&_hr]:my-4 [&_strong]:font-bold [&_em]:italic [&_u]:underline"
              dangerouslySetInnerHTML={{ __html: content }}
            />
          ) : (
            <div className="prose prose-sm max-w-none text-foreground/90 whitespace-pre-wrap">
              {content}
            </div>
          )}
        </CardContent>
      </div>
    </Card>
  );
}
