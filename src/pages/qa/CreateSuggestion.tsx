import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useSuggestions } from "@/hooks/useSuggestions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RichTextEditor } from "@/components/ui/rich-text-editor";

import { ArrowLeft, Lightbulb } from "lucide-react";

export default function CreateSuggestion() {
  const navigate = useNavigate();
  const { createSuggestion } = useSuggestions();

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("feature");
  const [priority, setPriority] = useState("medium");
  

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
