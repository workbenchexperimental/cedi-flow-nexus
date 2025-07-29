-- Fix materialized view security issue by hiding it from the API
-- We'll revoke access from anon and authenticated users

REVOKE ALL ON mv_system_health FROM anon;
REVOKE ALL ON mv_system_health FROM authenticated;

-- Only allow access through the RPC functions for proper security
GRANT SELECT ON mv_system_health TO supabase_admin;