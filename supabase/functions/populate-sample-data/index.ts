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

    const userResults = [];
    const createdUsers = {};

    // Create users
    for (const userData of sampleUsers) {
      try {
        const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
          email: userData.email,
          password: userData.password,
          email_confirm: true,
          user_metadata: {
            name: userData.name,
            role: userData.role,
            username: userData.username
          }
        });

        if (authError) {
          console.error(`Error creating user ${userData.email}:`, authError);
          userResults.push({
            email: userData.email,
            success: false,
            error: authError.message
          });
          continue;
        }

        if (authData.user) {
          createdUsers[userData.role] = authData.user.id;
          
          // Explicitly create profile record to ensure consistency
          const { error: profileError } = await supabaseAdmin
            .from('profiles')
            .insert({
              user_id: authData.user.id,
              name: userData.name,
              role: userData.role,
              username: userData.username,
              email: userData.email
            });

          if (profileError) {
            console.error(`Error creating profile for ${userData.email}:`, profileError);
            userResults.push({
              email: userData.email,
              success: false,
              error: `Profile creation failed: ${profileError.message}`
            });
            continue;
          }

          userResults.push({
            email: userData.email,
            success: true,
            user_id: authData.user.id,
            role: userData.role
          });
        }
      } catch (error) {
        console.error(`Exception creating user ${userData.email}:`, error);
        userResults.push({
          email: userData.email,
          success: false,
          error: error.message
        });
      }
    }

    // Wait a bit for the profiles to be created by the trigger
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Create sample complaints if we have a student user
    const complaintResults = [];
    if (createdUsers.student) {
      const sampleComplaints = [
        {
          title: 'Broken faucet in bathroom',
          description: 'The main faucet in the bathroom is leaking continuously and won\'t shut off properly.',
          category: 'plumbing',
          priority: 'medium',
          building: 'Building A',
          room_number: '101',
          specific_location: 'Main bathroom',
          status: 'submitted'
        },
        {
          title: 'Air conditioning not working',
          description: 'The AC unit in the room has stopped working completely. Room is getting very hot.',
          category: 'hvac',
          priority: 'high',
          building: 'Building A',
          room_number: '101',
          specific_location: 'Main room',
          status: 'assigned',
          assigned_to: createdUsers.maintenance
        },
        {
          title: 'Electrical outlet sparking',
          description: 'The outlet near the desk is making sparking sounds and appears dangerous.',
          category: 'electrical',
          priority: 'urgent',
          building: 'Building A',
          room_number: '101',
          specific_location: 'Near desk area',
          status: 'in-progress',
          assigned_to: createdUsers.maintenance
        },
        {
          title: 'Door lock broken',
          description: 'The main door lock is jammed and won\'t open or close properly.',
          category: 'structural',
          priority: 'high',
          building: 'Building A',
          room_number: '101',
          specific_location: 'Main entrance',
          status: 'resolved',
          assigned_to: createdUsers.maintenance,
          resolved_at: new Date().toISOString()
        },
        {
          title: 'Room needs deep cleaning',
          description: 'Room hasn\'t been properly cleaned in weeks, needs thorough cleaning.',
          category: 'cleaning',
          priority: 'low',
          building: 'Building A',
          room_number: '101',
          specific_location: 'Entire room',
          status: 'closed',
          assigned_to: createdUsers.maintenance,
          resolved_at: new Date(Date.now() - 86400000).toISOString() // Yesterday
        }
      ];

      for (const complaint of sampleComplaints) {
        try {
          const { data, error } = await supabaseAdmin
            .from('complaints')
            .insert({
              ...complaint,
              student_id: createdUsers.student
            })
            .select()
            .single();

          if (error) {
            console.error('Error creating complaint:', error);
            complaintResults.push({
              title: complaint.title,
              success: false,
              error: error.message
            });
          } else {
            complaintResults.push({
              title: complaint.title,
              success: true,
              id: data.id
            });
          }
        } catch (error) {
          console.error('Exception creating complaint:', error);
          complaintResults.push({
            title: complaint.title,
            success: false,
            error: error.message
          });
        }
      }
    }

    return new Response(JSON.stringify({
      message: "Sample data creation completed",
      users: userResults,
      complaints: complaintResults
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });

  } catch (error) {
    console.error("Error in populate-sample-data function:", error);
    return new Response(JSON.stringify({
      error: error.message
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});