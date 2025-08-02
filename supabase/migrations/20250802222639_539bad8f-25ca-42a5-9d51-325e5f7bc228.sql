-- Enable RLS on the new table
ALTER TABLE public.mv_system_health ENABLE ROW LEVEL SECURITY;

-- Create RLS policy for superadmin access
CREATE POLICY "Superadmin can view system health" 
ON public.mv_system_health 
FOR ALL 
USING (get_user_role(auth.uid()) = 'superadministrador');