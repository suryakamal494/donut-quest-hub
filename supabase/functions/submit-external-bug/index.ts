import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

// Simple in-memory rate limiter
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();

function checkRateLimit(apiKey: string): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(apiKey);
  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(apiKey, { count: 1, resetAt: now + 60_000 });
    return true;
  }
  if (entry.count >= 10) return false;
  entry.count++;
  return true;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const body = await req.json();
    const {
      api_key,
      title,
      description,
      login_type,
      severity = "minor",
      reporter_name,
      reporter_email,
      page_url,
      browser_info,
      attachments, // array of { data: base64string, filename: string, type: string }
    } = body;

    // Validate required fields
    if (!api_key) {
      return new Response(JSON.stringify({ error: "api_key is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (!title || !title.trim()) {
      return new Response(JSON.stringify({ error: "title is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (!login_type) {
      return new Response(JSON.stringify({ error: "login_type is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const validLoginTypes = ["super_admin", "institute", "teacher", "student"];
    if (!validLoginTypes.includes(login_type)) {
      return new Response(
        JSON.stringify({ error: `login_type must be one of: ${validLoginTypes.join(", ")}` }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const validSeverities = ["critical", "major", "minor", "trivial"];
    if (!validSeverities.includes(severity)) {
      return new Response(
        JSON.stringify({ error: `severity must be one of: ${validSeverities.join(", ")}` }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Rate limit check
    if (!checkRateLimit(api_key)) {
      return new Response(
        JSON.stringify({ error: "Rate limit exceeded. Max 10 submissions per minute." }),
        { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Create admin client
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    // Validate API key
    const { data: keyData, error: keyError } = await supabase
      .from("api_keys")
      .select("id, project_id, is_active")
      .eq("api_key", api_key)
      .maybeSingle();

    if (keyError || !keyData) {
      return new Response(JSON.stringify({ error: "Invalid API key" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (!keyData.is_active) {
      return new Response(JSON.stringify({ error: "API key is deactivated" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const projectId = keyData.project_id;

    // Upload attachments if any
    const uploadedUrls: string[] = [];
    if (attachments && Array.isArray(attachments)) {
      const maxAttachments = Math.min(attachments.length, 3);
      for (let i = 0; i < maxAttachments; i++) {
        const att = attachments[i];
        if (!att.data || !att.filename) continue;

        try {
          // Decode base64
          const binaryStr = atob(att.data);
          const bytes = new Uint8Array(binaryStr.length);
          for (let j = 0; j < binaryStr.length; j++) {
            bytes[j] = binaryStr.charCodeAt(j);
          }

          // Check size (5MB max)
          if (bytes.length > 5 * 1024 * 1024) continue;

          const filePath = `external/${Date.now()}-${att.filename}`;
          const { error: uploadError } = await supabase.storage
            .from("bug-attachments")
            .upload(filePath, bytes, {
              contentType: att.type || "image/png",
              upsert: false,
            });

          if (!uploadError) {
            const { data: urlData } = supabase.storage
              .from("bug-attachments")
              .getPublicUrl(filePath);
            if (urlData?.publicUrl) {
              uploadedUrls.push(urlData.publicUrl);
            }
          }
        } catch {
          // Skip failed uploads
        }
      }
    }

    // Generate bug code - the trigger handles this, so we pass a placeholder
    // Actually the trigger generates it, so we need to provide a dummy value that gets overwritten
    const { data: bugData, error: bugError } = await supabase
      .from("bugs")
      .insert({
        bug_code: "TEMP", // Will be overwritten by trigger
        title: title.trim(),
        description: description || null,
        severity,
        login_type,
        project_id: projectId,
        source: "external",
        external_reporter_name: reporter_name || null,
        external_reporter_email: reporter_email || null,
        external_page_url: page_url || null,
        external_browser_info: browser_info || null,
        attachments: uploadedUrls.length > 0 ? uploadedUrls : null,
        status: "open",
        fix_status: "unfixed",
      })
      .select("bug_code, id")
      .single();

    if (bugError) {
      console.error("Bug insert error:", bugError);
      return new Response(
        JSON.stringify({ error: "Failed to create bug report", details: bugError.message }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
        bug_code: bugData.bug_code,
        message: `Bug ${bugData.bug_code} has been reported successfully.`,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
