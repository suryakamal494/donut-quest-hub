import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Plus, X, Loader2 } from "lucide-react";
import type { BugRef } from "@/hooks/useQATimesheet";

interface Props {
  bugs: BugRef[];
  onAdd: (bug: BugRef) => void;
  onRemove: (id: string) => void;
  validate: (code: string) => Promise<BugRef | null>;
}

export function BugCodeInput({ bugs, onAdd, onRemove, validate }: Props) {
  const [value, setValue] = useState("");
  const [busy, setBusy] = useState(false);

  const handleAdd = async () => {
    if (!value.trim()) return;
    setBusy(true);
    const bug = await validate(value);
    setBusy(false);
    if (!bug) return;
    if (bugs.some((b) => b.id === bug.id)) {
      setValue("");
      return;
    }
    onAdd(bug);
    setValue("");
  };

  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        <Input
          placeholder="Enter bug code (e.g. BUG-405)"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), handleAdd())}
          disabled={busy}
        />
        <Button type="button" onClick={handleAdd} disabled={busy || !value.trim()}>
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
          <span className="ml-1 hidden sm:inline">Add</span>
        </Button>
      </div>
      {bugs.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {bugs.map((b) => (
            <Badge key={b.id} variant="secondary" className="pl-2 pr-1 py-1 gap-1 max-w-full">
              <span className="font-mono text-xs">{b.bug_code}</span>
              <span className="truncate max-w-[200px]">· {b.title}</span>
              <button
                type="button"
                onClick={() => onRemove(b.id)}
                className="ml-1 rounded hover:bg-destructive/20 p-0.5"
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          ))}
        </div>
      )}
    </div>
  );
}
