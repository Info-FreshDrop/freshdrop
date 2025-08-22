-- Allow anonymous operator applications by creating a more permissive policy
DROP POLICY IF EXISTS "operator_apps_insert_own" ON public.operator_applications;

-- Create new policy that allows both authenticated and anonymous applications
CREATE POLICY "Allow operator applications from anyone" 
ON public.operator_applications 
FOR INSERT 
WITH CHECK (
  -- Allow if user is authenticated and email matches
  (auth.uid() IS NOT NULL AND auth.email() = email) 
  OR 
  -- Allow anonymous applications (when auth.uid() is null)
  (auth.uid() IS NULL AND email IS NOT NULL AND email != '')
);

-- Update select policy to be more permissive for anonymous applications
DROP POLICY IF EXISTS "operator_apps_select_own" ON public.operator_applications;

CREATE POLICY "View operator applications" 
ON public.operator_applications 
FOR SELECT 
USING (
  -- User can see their own applications (authenticated)
  (auth.uid() IS NOT NULL AND auth.email() = email)
  OR 
  -- Admins can see all applications
  is_admin_role(auth.uid())
);

-- Update policy to allow anonymous applications to be updated by email only
DROP POLICY IF EXISTS "operator_apps_update_own" ON public.operator_applications;

CREATE POLICY "Update operator applications" 
ON public.operator_applications 
FOR UPDATE 
USING (
  -- User can update their own applications (authenticated)
  (auth.uid() IS NOT NULL AND auth.email() = email)
  OR 
  -- Admins can update all applications
  is_admin_role(auth.uid())
) 
WITH CHECK (
  -- Same conditions for updates
  (auth.uid() IS NOT NULL AND auth.email() = email)
  OR 
  is_admin_role(auth.uid())
);