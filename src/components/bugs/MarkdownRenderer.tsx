import React, { useMemo } from "react";
import { cn } from "@/lib/utils";

interface MarkdownRendererProps {
  content: string;
  className?: string;
}

function renderMarkdown(text: string): string {
  // Escape HTML
  let html = text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");

  // Bold
  html = html.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
  // Italic
  html = html.replace(/\*(.+?)\*/g, "<em>$1</em>");

  // Process lines for lists
  const lines = html.split("\n");
  const result: string[] = [];
  let inUl = false;
  let inOl = false;

  for (const line of lines) {
    const ulMatch = line.match(/^- (.+)/);
    const olMatch = line.match(/^\d+\.\s(.+)/);

    if (ulMatch) {
      if (inOl) { result.push("</ol>"); inOl = false; }
      if (!inUl) { result.push("<ul>"); inUl = true; }
      result.push(`<li>${ulMatch[1]}</li>`);
    } else if (olMatch) {
      if (inUl) { result.push("</ul>"); inUl = false; }
      if (!inOl) { result.push("<ol>"); inOl = true; }
      result.push(`<li>${olMatch[1]}</li>`);
    } else {
      if (inUl) { result.push("</ul>"); inUl = false; }
      if (inOl) { result.push("</ol>"); inOl = false; }
      if (line.trim() === "") {
        result.push("<br/>");
      } else {
        result.push(`<p>${line}</p>`);
      }
    }
  }
  if (inUl) result.push("</ul>");
  if (inOl) result.push("</ol>");

  return result.join("");
}

export function MarkdownRenderer({ content, className }: MarkdownRendererProps) {
  const html = useMemo(() => renderMarkdown(content), [content]);

  return (
    <div
      className={cn(
        "prose prose-sm dark:prose-invert max-w-none",
        "[&_p]:my-0.5 [&_ul]:my-1 [&_ol]:my-1 [&_li]:my-0",
        "[&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5",
        className
      )}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
