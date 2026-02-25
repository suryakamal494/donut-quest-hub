import React, { useRef, useCallback } from "react";
import { Bold, Italic, List, ListOrdered } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

interface RichTextareaProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  rows?: number;
  id?: string;
  className?: string;
}

function htmlToMarkdown(html: string): string {
  let md = html;
  // Remove style/script tags
  md = md.replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "");
  md = md.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "");
  // Bold
  md = md.replace(/<(b|strong)[^>]*>([\s\S]*?)<\/\1>/gi, "**$2**");
  // Italic
  md = md.replace(/<(i|em)[^>]*>([\s\S]*?)<\/\1>/gi, "*$2*");
  // List items
  md = md.replace(/<li[^>]*>([\s\S]*?)<\/li>/gi, "- $1\n");
  // Paragraphs / divs / br
  md = md.replace(/<br\s*\/?>/gi, "\n");
  md = md.replace(/<\/(p|div|h[1-6])>/gi, "\n");
  md = md.replace(/<(p|div|h[1-6])[^>]*>/gi, "");
  // Strip remaining tags
  md = md.replace(/<[^>]+>/g, "");
  // Decode entities
  md = md.replace(/&nbsp;/gi, " ");
  md = md.replace(/&amp;/gi, "&");
  md = md.replace(/&lt;/gi, "<");
  md = md.replace(/&gt;/gi, ">");
  md = md.replace(/&quot;/gi, '"');
  // Collapse blank lines
  md = md.replace(/\n{3,}/g, "\n\n");
  return md.trim();
}

export function RichTextarea({ value, onChange, placeholder, rows = 2, id, className }: RichTextareaProps) {
  const ref = useRef<HTMLTextAreaElement>(null);

  const wrapSelection = useCallback((before: string, after: string) => {
    const ta = ref.current;
    if (!ta) return;
    const start = ta.selectionStart;
    const end = ta.selectionEnd;
    const selected = value.slice(start, end);
    const newValue = value.slice(0, start) + before + selected + after + value.slice(end);
    onChange(newValue);
    requestAnimationFrame(() => {
      ta.focus();
      ta.setSelectionRange(start + before.length, end + before.length);
    });
  }, [value, onChange]);

  const insertList = useCallback((ordered: boolean) => {
    const ta = ref.current;
    if (!ta) return;
    const start = ta.selectionStart;
    const end = ta.selectionEnd;
    const selected = value.slice(start, end);
    const lines = selected ? selected.split("\n") : [""];
    const formatted = lines.map((l, i) => ordered ? `${i + 1}. ${l}` : `- ${l}`).join("\n");
    const prefix = start > 0 && value[start - 1] !== "\n" ? "\n" : "";
    const newValue = value.slice(0, start) + prefix + formatted + value.slice(end);
    onChange(newValue);
    requestAnimationFrame(() => ta.focus());
  }, [value, onChange]);

  const handlePaste = useCallback((e: React.ClipboardEvent<HTMLTextAreaElement>) => {
    const html = e.clipboardData.getData("text/html");
    if (!html) return; // Let default plain-text paste work
    e.preventDefault();
    const md = htmlToMarkdown(html);
    const ta = ref.current;
    if (!ta) return;
    const start = ta.selectionStart;
    const end = ta.selectionEnd;
    const newValue = value.slice(0, start) + md + value.slice(end);
    onChange(newValue);
    requestAnimationFrame(() => {
      ta.focus();
      ta.setSelectionRange(start + md.length, start + md.length);
    });
  }, [value, onChange]);

  return (
    <div className="space-y-1">
      <div className="flex items-center gap-0.5 border border-input rounded-t-md bg-muted/50 px-1 py-0.5">
        <Button type="button" variant="ghost" size="icon" className="h-7 w-7" onClick={() => wrapSelection("**", "**")} title="Bold">
          <Bold className="h-3.5 w-3.5" />
        </Button>
        <Button type="button" variant="ghost" size="icon" className="h-7 w-7" onClick={() => wrapSelection("*", "*")} title="Italic">
          <Italic className="h-3.5 w-3.5" />
        </Button>
        <Button type="button" variant="ghost" size="icon" className="h-7 w-7" onClick={() => insertList(false)} title="Bullet List">
          <List className="h-3.5 w-3.5" />
        </Button>
        <Button type="button" variant="ghost" size="icon" className="h-7 w-7" onClick={() => insertList(true)} title="Numbered List">
          <ListOrdered className="h-3.5 w-3.5" />
        </Button>
      </div>
      <Textarea
        ref={ref}
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onPaste={handlePaste}
        placeholder={placeholder}
        rows={rows}
        className={cn("rounded-t-none -mt-1 border-t-0", className)}
      />
    </div>
  );
}
