import { createClient } from 'npm:@supabase/supabase-js@2';
import { crypto } from 'https://deno.land/std@0.177.0/crypto/mod.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const url = new URL(req.url);
    const pathname = url.pathname.replace('/portal-api/', '');

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Get portal info
    if (pathname === 'getPortalInfo' && req.method === 'GET') {
      const portalName = url.searchParams.get('portalName');

      if (!portalName) {
        return new Response(
          JSON.stringify({ error: 'Portal name is required' }),
          {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          }
        );
      }

      const { data: portal, error } = await supabase
        .from('portals')
        .select('*')
        .eq('name', portalName)
        .eq('is_active', true)
        .maybeSingle();

      if (error || !portal) {
        return new Response(
          JSON.stringify({ error: 'Portal not found' }),
          {
            status: 404,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          }
        );
      }

      return new Response(
        JSON.stringify(portal),
        {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Get portal folders
    if (pathname === 'getPortalFolders' && req.method === 'GET') {
      const portalId = url.searchParams.get('portalId');
      const authHeader = req.headers.get('Authorization');

      if (!portalId) {
        return new Response(
          JSON.stringify({ error: 'Portal ID is required' }),
          {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          }
        );
      }

      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return new Response(
          JSON.stringify({ error: 'Unauthorized' }),
          {
            status: 401,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          }
        );
      }

      const token = authHeader.substring(7);
      const user = await verifyJWT(token);

      if (!user) {
        return new Response(
          JSON.stringify({ error: 'Invalid token' }),
          {
            status: 401,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          }
        );
      }

      // Get folders for the portal
      const { data: folders, error: foldersError } = await supabase
        .from('folders')
        .select('*')
        .eq('portal_id', portalId);

      if (foldersError) {
        return new Response(
          JSON.stringify({ error: 'Failed to fetch folders' }),
          {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          }
        );
      }

      // Get folder permissions for the user
      const { data: permissions, error: permissionsError } = await supabase
        .from('folder_permissions')
        .select('*')
        .eq('user_id', user.userId);

      if (permissionsError) {
        return new Response(
          JSON.stringify({ error: 'Failed to fetch permissions' }),
          {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          }
        );
      }

      // Check if user is portal admin
      const { data: isAdmin } = await supabase
        .from('portal_admins')
        .select('id')
        .eq('portal_id', portalId)
        .eq('user_id', user.userId)
        .maybeSingle();

      // Enrich folders with permission info
      const enrichedFolders = folders.map(folder => {
        const permission = permissions.find(p => p.folder_id === folder.id);
        const canEdit = isAdmin || user.role === 'super' || permission?.can_edit || false;
        const canView = isAdmin || user.role === 'super' || permission?.can_view || false;

        return {
          ...folder,
          canEdit,
          canView,
        };
      });

      return new Response(
        JSON.stringify({
          folders: enrichedFolders.filter(f => f.canView),
          userRole: user.role,
          isPortalAdmin: !!isAdmin,
        }),
        {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    return new Response(
      JSON.stringify({ error: 'Not found' }),
      {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});

async function verifyJWT(token: string): Promise<any> {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) {
      return null;
    }

    const payload = JSON.parse(atob(parts[1].replace(/-/g, '+').replace(/_/g, '/')));

    // Check expiration
    if (payload.exp && payload.exp < Math.floor(Date.now() / 1000)) {
      return null;
    }

    return payload;
  } catch {
    return null;
  }
}
