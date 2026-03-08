import React, { createContext, useContext, useEffect, useState, useRef, useCallback } from "react";
import { User, Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { retryWithBackoff } from "@/lib/auth-resilience";

type ApprovalStatus = "pending" | "approved" | "rejected";
type AppRole = "admin" | "user" | "developer";

interface Profile {
  id: string;
  user_id: string;
  full_name: string;
  email: string;
  approval_status: ApprovalStatus;
  automation_enabled: boolean;
  docs_enabled: boolean;
  phone_number?: string | null;
  whatsapp_enabled: boolean;
  created_at: string;
  updated_at: string;
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  role: AppRole | null;
  isLoading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signUp: (email: string, password: string, fullName: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [role, setRole] = useState<AppRole | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchProfile = useCallback(async (userId: string) => {
    try {
      const [profileResult, roleResult] = await retryWithBackoff(
        () => Promise.all([
          supabase.from("profiles").select("*").eq("user_id", userId).maybeSingle(),
          supabase.from("user_roles").select("role").eq("user_id", userId).maybeSingle(),
        ]),
        { maxRetries: 2, baseDelayMs: 1000 }
      );

      if (profileResult.error) {
        console.error("Error fetching profile:", profileResult.error);
        return;
      }
      setProfile(profileResult.data);

      if (roleResult.error) {
        console.error("Error fetching role:", roleResult.error);
        return;
      }
      setRole(roleResult.data?.role as AppRole || null);
    } catch (error) {
      console.error("Error in fetchProfile:", error);
    }
  }, []);

  const refreshProfile = async () => {
    if (user?.id) {
      await fetchProfile(user.id);
    }
  };

  const initialSessionHandled = useRef(false);

  useEffect(() => {
    // Set up auth state listener BEFORE checking session
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, currentSession) => {
        // Skip INITIAL_SESSION if getSession() already handled it
        if (event === 'INITIAL_SESSION' && initialSessionHandled.current) {
          return;
        }

        setSession(currentSession);
        setUser(currentSession?.user ?? null);

        if (currentSession?.user) {
          setTimeout(() => {
            fetchProfile(currentSession.user.id);
          }, 0);
        } else {
          setProfile(null);
          setRole(null);
        }
        setIsLoading(false);
      }
    );

    // Then check for existing session with timeout
    const sessionTimeout = setTimeout(() => {
      console.warn("Session check timed out after 8 seconds");
      initialSessionHandled.current = true;
      setIsLoading(false);
    }, 8000);

    supabase.auth.getSession().then(({ data: { session: existingSession } }) => {
      clearTimeout(sessionTimeout);
      initialSessionHandled.current = true;
      setSession(existingSession);
      setUser(existingSession?.user ?? null);
      
      if (existingSession?.user) {
        fetchProfile(existingSession.user.id);
      }
      setIsLoading(false);
    }).catch((error) => {
      clearTimeout(sessionTimeout);
      initialSessionHandled.current = true;
      console.error("Session check failed:", error);
      setIsLoading(false);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [fetchProfile]);

  // Auto-recovery when network comes back online
  useEffect(() => {
    const handleOnline = () => {
      console.log("[AuthContext] Network back online, re-fetching profile...");
      if (user?.id) {
        fetchProfile(user.id);
      }
    };
    window.addEventListener("online", handleOnline);
    return () => window.removeEventListener("online", handleOnline);
  }, [user, fetchProfile]);

  const signIn = async (email: string, password: string) => {
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      return { error: error as Error | null };
    } catch (error) {
      return { error: error as Error };
    }
  };

  const signUp = async (email: string, password: string, fullName: string) => {
    try {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: window.location.origin,
          data: {
            full_name: fullName,
          },
        },
      });
      return { error: error as Error | null };
    } catch (error) {
      return { error: error as Error };
    }
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setSession(null);
    setProfile(null);
    setRole(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        profile,
        role,
        isLoading,
        signIn,
        signUp,
        signOut,
        refreshProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};
