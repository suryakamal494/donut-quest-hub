import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useSuggestions, ProductSuggestion } from "@/hooks/useSuggestions";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { Plus, Lightbulb, Clock, CheckCircle, XCircle, User } from "lucide-react";
import { format } from "date-fns";

const categoryLabels: Record<string, string> = {
  ux: "UX",
  feature: "Feature",
  performance: "Performance",
  workflow: "Workflow",
  other: "Other",
};

const categoryColors: Record<string, string> = {
  ux: "bg-blue-100 text-blue-800",
  feature: "bg-purple-100 text-purple-800",
  performance: "bg-yellow-100 text-yellow-800",
  workflow: "bg-green-100 text-green-800",
  other: "bg-gray-100 text-gray-800",
};

const priorityColors: Record<string, string> = {
  critical: "bg-red-100 text-red-800",
  high: "bg-orange-100 text-orange-800",
  medium: "bg-yellow-100 text-yellow-700",
  low: "bg-green-100 text-green-800",
};

const statusIcons: Record<string, React.ReactNode> = {
  pending: <Clock className="h-4 w-4 text-yellow-600" />,
  approved: <CheckCircle className="h-4 w-4 text-green-600" />,
  rejected: <XCircle className="h-4 w-4 text-red-600" />,
};

const devStatusLabels: Record<string, string> = {
  planned: "Planned",
  in_progress: "In Progress",
  done: "Done",
  wont_do: "Won't Do",
};

const devStatusColors: Record<string, string> = {
  planned: "bg-blue-100 text-blue-800",
  in_progress: "bg-amber-100 text-amber-800",
  done: "bg-green-100 text-green-800",
  wont_do: "bg-gray-100 text-gray-600",
};

function SuggestionCard({ suggestion, profileMap }: { suggestion: ProductSuggestion; profileMap: Record<string, string> }) {
  const navigate = useNavigate();

  return (
    <Card
      className="cursor-pointer hover:shadow-md transition-shadow"
      onClick={() => navigate(`/qa/suggestions/${suggestion.id}`)}
    >
      <CardContent className="p-4 space-y-3">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs font-mono text-muted-foreground">{suggestion.suggestion_code}</span>
              {statusIcons[suggestion.status]}
            </div>
            <h3 className="font-semibold text-sm truncate">{suggestion.title}</h3>
          </div>
        </div>

        {suggestion.description && (
          <p className="text-xs text-muted-foreground line-clamp-2">{suggestion.description?.replace(/<[^>]*>/g, '')}</p>
        )}

        <div className="flex flex-wrap gap-1.5">
          <Badge variant="outline" className={categoryColors[suggestion.category]}>
            {categoryLabels[suggestion.category]}
          </Badge>
          <Badge variant="outline" className={priorityColors[suggestion.priority]}>
            {suggestion.priority}
          </Badge>
          {suggestion.dev_status && (
            <Badge variant="outline" className={devStatusColors[suggestion.dev_status]}>
              {devStatusLabels[suggestion.dev_status]}
            </Badge>
          )}
        </div>

        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span className="flex items-center gap-1">
            <User className="h-3 w-3" />
            {profileMap[suggestion.created_by] || "Team Member"}
          </span>
          <span>{format(new Date(suggestion.created_at), "MMM d, yyyy")}</span>
        </div>
      </CardContent>
    </Card>
  );
}

export default function SuggestionList() {
  const navigate = useNavigate();
  const { suggestions, isLoading, role } = useSuggestions();
  const { user } = useAuth();
  const isDeveloper = role === "developer";
  const isAdmin = role === "admin";
  const [profileMap, setProfileMap] = useState<Record<string, string>>({});

  // Fetch profiles for all creators
  useEffect(() => {
    const userIds = [...new Set(suggestions.map((s) => s.created_by))];
    if (userIds.length === 0) return;
    supabase
      .from("profiles")
      .select("user_id, full_name")
      .in("user_id", userIds)
      .then(({ data }) => {
        const map: Record<string, string> = {};
        data?.forEach((p) => (map[p.user_id] = p.full_name));
        setProfileMap(map);
      });
  }, [suggestions]);

  const defaultTab = isDeveloper ? "approved" : "all";

  const filterByTab = (tab: string): ProductSuggestion[] => {
    switch (tab) {
      case "pending": return suggestions.filter((s) => s.status === "pending");
      case "approved": return suggestions.filter((s) => s.status === "approved");
      case "rejected": return suggestions.filter((s) => s.status === "rejected");
      default: return suggestions;
    }
  };

  const pendingCount = suggestions.filter((s) => s.status === "pending").length;

  if (isLoading) {
    return (
      <div className="space-y-4 p-4">
        <Skeleton className="h-10 w-full" />
        <div className="grid gap-3">
          {[1, 2, 3].map((i) => <Skeleton key={i} className="h-32 w-full" />)}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 p-4 md:p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl md:text-2xl font-bold flex items-center gap-2">
            <Lightbulb className="h-6 w-6 text-primary" />
            Product Suggestions
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            {isDeveloper ? "Approved improvement requests from the QA team" : "Suggest product improvements and new features"}
          </p>
        </div>
        {!isDeveloper && (
          <Button onClick={() => navigate("/qa/suggestions/create")} size="sm">
            <Plus className="h-4 w-4 mr-1" />
            New Suggestion
          </Button>
        )}
      </div>

      <Tabs defaultValue={defaultTab}>
        {!isDeveloper && (
          <TabsList className="w-full md:w-auto">
            <TabsTrigger value="all">All ({suggestions.length})</TabsTrigger>
            <TabsTrigger value="pending">
              Pending {pendingCount > 0 && `(${pendingCount})`}
            </TabsTrigger>
            <TabsTrigger value="approved">Approved</TabsTrigger>
            <TabsTrigger value="rejected">Rejected</TabsTrigger>
          </TabsList>
        )}

        {["all", "pending", "approved", "rejected"].map((tab) => (
          <TabsContent key={tab} value={tab}>
            {filterByTab(tab).length === 0 ? (
              <Card>
                <CardContent className="p-8 text-center text-muted-foreground">
                  <Lightbulb className="h-12 w-12 mx-auto mb-3 opacity-30" />
                  <p>No suggestions found</p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                {filterByTab(tab).map((s) => (
                  <SuggestionCard key={s.id} suggestion={s} profileMap={profileMap} />
                ))}
              </div>
            )}
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}
