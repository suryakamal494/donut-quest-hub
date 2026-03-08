import React, { useState } from "react";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { MessageSquare, Settings, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface Project {
  id: string;
  name: string;
  whatsapp_notifications_enabled: boolean;
}

interface WhatsAppProjectSettingsProps {
  projects: Project[];
  onUpdate: () => void;
}

export function WhatsAppProjectSettings({ projects, onUpdate }: WhatsAppProjectSettingsProps) {
  const [loading, setLoading] = useState<string | null>(null);
  const { toast } = useToast();

  const toggleWhatsApp = async (projectId: string, enabled: boolean) => {
    setLoading(projectId);
    try {
      const { error } = await supabase
        .from("projects")
        .update({ whatsapp_notifications_enabled: enabled })
        .eq("id", projectId);

      if (error) throw error;

      toast({
        title: enabled ? "WhatsApp Enabled" : "WhatsApp Disabled",
        description: `Notifications ${enabled ? "enabled" : "disabled"} for this project.`,
      });
      onUpdate();
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message,
      });
    } finally {
      setLoading(null);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MessageSquare className="h-5 w-5 text-green-600" />
          WhatsApp Notifications
        </CardTitle>
        <CardDescription>
          Enable or disable WhatsApp notifications per project. Users must also opt-in individually.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {projects.length === 0 ? (
          <p className="text-muted-foreground text-sm">No projects available.</p>
        ) : (
          projects.map((project) => (
            <div
              key={project.id}
              className="flex items-center justify-between p-3 rounded-lg border bg-card"
            >
              <div className="flex items-center gap-3">
                <span className="font-medium">{project.name}</span>
                {project.whatsapp_notifications_enabled && (
                  <Badge variant="secondary" className="bg-green-100 text-green-700">
                    Enabled
                  </Badge>
                )}
              </div>
              <div className="flex items-center gap-2">
                {loading === project.id ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Switch
                    checked={project.whatsapp_notifications_enabled}
                    onCheckedChange={(checked) => toggleWhatsApp(project.id, checked)}
                  />
                )}
              </div>
            </div>
          ))
        )}

        <div className="pt-4 border-t">
          <h4 className="text-sm font-medium mb-2">Configuration Required</h4>
          <p className="text-xs text-muted-foreground mb-3">
            To enable WhatsApp notifications, you need to configure the Meta Business API credentials
            in the backend secrets:
          </p>
          <ul className="text-xs text-muted-foreground space-y-1 list-disc list-inside">
            <li>META_WHATSAPP_TOKEN - Your WhatsApp Business API access token</li>
            <li>META_PHONE_NUMBER_ID - Your WhatsApp Business phone number ID</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
}
