
-- Update handle_new_user to include phone_number from metadata
CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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

    -- Insert profile with phone number if provided
    INSERT INTO public.profiles (user_id, full_name, email, approval_status, phone_number)
    VALUES (
        NEW.id,
        COALESCE(NEW.raw_user_meta_data->>'full_name', 'Admin'),
        NEW.email,
        user_approval_status,
        NEW.raw_user_meta_data->>'phone_number'
    );
    
    -- Assign role
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, user_role);
    
    RETURN NEW;
END;
$function$;
