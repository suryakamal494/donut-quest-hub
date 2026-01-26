-- Drop and recreate the handle_new_user function to check for admin email
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    admin_email TEXT := 'thedonut.ai@gmail.com';
    user_approval_status approval_status;
    user_role app_role;
BEGIN
    -- Check if this is the admin email
    IF NEW.email = admin_email THEN
        user_approval_status := 'approved';
        user_role := 'admin';
    ELSE
        user_approval_status := 'pending';
        user_role := 'user';
    END IF;

    -- Insert profile
    INSERT INTO public.profiles (user_id, full_name, email, approval_status)
    VALUES (
        NEW.id,
        COALESCE(NEW.raw_user_meta_data->>'full_name', 'Admin'),
        NEW.email,
        user_approval_status
    );
    
    -- Assign role
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, user_role);
    
    RETURN NEW;
END;
$$;