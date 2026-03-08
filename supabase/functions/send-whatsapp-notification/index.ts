import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface WhatsAppRequest {
  user_id: string;
  template_name: string;
  template_params: Record<string, string>;
  project_id?: string;
  notification_type: string;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const META_WHATSAPP_TOKEN = Deno.env.get("META_WHATSAPP_TOKEN");
    const META_PHONE_NUMBER_ID = Deno.env.get("META_PHONE_NUMBER_ID");

    if (!META_WHATSAPP_TOKEN || !META_PHONE_NUMBER_ID) {
      console.log("WhatsApp API not configured - skipping notification");
      return new Response(
        JSON.stringify({ success: false, error: "WhatsApp API not configured" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const { user_id, template_name, template_params, project_id, notification_type } = 
      await req.json() as WhatsAppRequest;

    // Get user profile with phone number and WhatsApp opt-in
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("phone_number, whatsapp_enabled, full_name")
      .eq("user_id", user_id)
      .single();

    if (profileError || !profile) {
      console.error("Profile not found:", profileError);
      return new Response(
        JSON.stringify({ success: false, error: "User profile not found" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!profile.phone_number) {
      console.log("User has no phone number configured");
      return new Response(
        JSON.stringify({ success: false, error: "No phone number" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!profile.whatsapp_enabled) {
      console.log("User has not opted in to WhatsApp notifications");
      return new Response(
        JSON.stringify({ success: false, error: "WhatsApp not enabled for user" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check if project has WhatsApp enabled (if project_id provided)
    if (project_id) {
      const { data: project, error: projectError } = await supabase
        .from("projects")
        .select("whatsapp_notifications_enabled")
        .eq("id", project_id)
        .single();

      if (projectError || !project?.whatsapp_notifications_enabled) {
        console.log("Project does not have WhatsApp notifications enabled");
        return new Response(
          JSON.stringify({ success: false, error: "WhatsApp not enabled for project" }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    // Format phone number (remove + if present for Meta API)
    const formattedPhone = profile.phone_number.replace(/^\+/, "");

    // Build template components
    const components = [];
    if (Object.keys(template_params).length > 0) {
      components.push({
        type: "body",
        parameters: Object.values(template_params).map((value) => ({
          type: "text",
          text: value,
        })),
      });
    }

    // Call Meta WhatsApp Business API
    const metaResponse = await fetch(
      `https://graph.facebook.com/v18.0/${META_PHONE_NUMBER_ID}/messages`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${META_WHATSAPP_TOKEN}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          messaging_product: "whatsapp",
          to: formattedPhone,
          type: "template",
          template: {
            name: template_name,
            language: { code: "en" },
            components: components.length > 0 ? components : undefined,
          },
        }),
      }
    );

    const metaResult = await metaResponse.json();

    // Log the notification attempt
    await supabase.from("whatsapp_notification_log").insert({
      user_id,
      project_id,
      notification_type,
      template_name,
      phone_number: profile.phone_number,
      status: metaResponse.ok ? "sent" : "failed",
      meta_message_id: metaResult.messages?.[0]?.id,
      error_message: metaResult.error?.message,
      payload: { template_params, meta_response: metaResult },
    });

    if (!metaResponse.ok) {
      console.error("Meta API error:", metaResult);
      return new Response(
        JSON.stringify({ success: false, error: metaResult.error?.message }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("WhatsApp notification sent successfully:", metaResult.messages?.[0]?.id);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message_id: metaResult.messages?.[0]?.id 
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Error sending WhatsApp notification:", error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
