CREATE POLICY "Admin can read all startups"
ON public.startups FOR SELECT TO authenticated
USING (COALESCE(auth.jwt()->>'email','') = 'danielabinav16@gmail.com');

CREATE POLICY "Admin can update all startups"
ON public.startups FOR UPDATE TO authenticated
USING (COALESCE(auth.jwt()->>'email','') = 'danielabinav16@gmail.com')
WITH CHECK (COALESCE(auth.jwt()->>'email','') = 'danielabinav16@gmail.com');