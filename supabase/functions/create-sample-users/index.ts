import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.50.5";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Create Supabase admin client
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    );

    const sampleUsers = [
      {
        email: "student@campus.edu",
        password: "student123",
        name: "John Doe",
        role: "student",
        username: "student"
      },
      {
        email: "admin@campus.edu", 
        password: "admin123",
        name: "Admin User",
        role: "admin",
        username: "admin"
      },
      {
        email: "maintenance@campus.edu",
        password: "maintenance123", 
        name: "Mike Wilson",
        role: "maintenance",
        username: "maintenance"
      }
    ];

    const results = [];

    for (const userData of sampleUsers) {
      try {
        // Create user in auth
        const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
          email: userData.email,
          password: userData.password,
          email_confirm: true, // Skip email confirmation
          user_metadata: {
            name: userData.name,
            role: userData.role
          }
        });

        if (authError) {
          console.error(`Error creating user ${userData.email}:`, authError);
          results.push({
            email: userData.email,
            success: false,
            error: authError.message
          });
          continue;
        }

        if (authData.user) {
          // The profile should be created automatically by the trigger
          // Let's verify it was created
          const { data: profile, error: profileError } = await supabaseAdmin
            .from('profiles')
            .select('*')
            .eq('user_id', authData.user.id)
            .single();

          if (profileError) {
            console.error(`Profile not found for user ${userData.email}:`, profileError);
          }

          results.push({
            email: userData.email,
            success: true,
            user_id: authData.user.id,
            profile_created: !profileError
          });
        }
      } catch (error) {
        console.error(`Exception creating user ${userData.email}:`, error);
        results.push({
          email: userData.email,
          success: false,
          error: error.message
        });
      }
    }

    return new Response(JSON.stringify({
      message: "Sample users creation completed",
      results: results
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });

  } catch (error) {
    console.error("Error in create-sample-users function:", error);
    return new Response(JSON.stringify({
      error: error.message
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});