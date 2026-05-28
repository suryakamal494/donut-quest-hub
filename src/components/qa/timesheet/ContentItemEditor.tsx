import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Trash2 } from "lucide-react";
import type { ContentItem } from "@/hooks/useQATimesheet";

interface Props {
  items: ContentItem[];
  onChange: (items: ContentItem[]) => void;
}

const empty: ContentItem = { subject: "", type: "PPT", title: "", count: 1, notes: "" };

export function ContentItemEditor({ items, onChange }: Props) {
  const update = (i: number, patch: Partial<ContentItem>) => {
    onChange(items.map((it, idx) => (idx === i ? { ...it, ...patch } : it)));
  };
  const remove = (i: number) => onChange(items.filter((_, idx) => idx !== i));
  const add = () => onChange([...items, { ...empty }]);

  return (
    <div className="space-y-3">
      {items.map((it, i) => (
        <div key={i} className="rounded-lg border-2 border-border p-3 space-y-2 bg-background/50">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <Input
              placeholder="Subject (e.g. Math Ch.3)"
              value={it.subject}
              onChange={(e) => update(i, { subject: e.target.value })}
            />
            <Select value={it.type} onValueChange={(v) => update(i, { type: v as ContentItem["type"] })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="PPT">PPT</SelectItem>
                <SelectItem value="Document">Document</SelectItem>
                <SelectItem value="Lesson">Lesson</SelectItem>
                <SelectItem value="Other">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-[1fr,100px] gap-2">
            <Input
              placeholder="Title / topic"
              value={it.title}
              onChange={(e) => update(i, { title: e.target.value })}
            />
            <Input
              type="number"
              min={1}
              placeholder="Count"
              value={it.count}
              onChange={(e) => update(i, { count: Math.max(1, parseInt(e.target.value) || 1) })}
            />
          </div>
          <Textarea
            placeholder="Notes (optional)"
            value={it.notes || ""}
            onChange={(e) => update(i, { notes: e.target.value })}
            rows={2}
          />
          <div className="flex justify-end">
            <Button type="button" variant="ghost" size="sm" onClick={() => remove(i)}>
              <Trash2 className="h-4 w-4 mr-1" /> Remove
            </Button>
          </div>
        </div>
      ))}
      <Button type="button" variant="outline" onClick={add} className="w-full">
        <Plus className="h-4 w-4 mr-2" /> Add content item
      </Button>
    </div>
  );
}
