import type { Session, User } from "@supabase/supabase-js";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

import { getSupabase, supabase } from "@/lib/supabase";

export type AppRole =
  | "SUPER_ADMIN"
  | "ADMIN"
  | "TEACHER"
  | "STUDENT"
  | "PARENT";

type CanonicalRole =
  | "admin"
  | "head_of_institution"
  | "deputy_hoi"
  | "teacher"
  | "class_teacher"
  | "classroom_teacher"
  | "staff"
  | "finance_officer"
  | "finance_approver"
  | "parent"
  | "student";

export type SchoolProfile = {
  id: string;
  email: string | null;
  display_name: string | null;
  phone: string | null;
  role: AppRole;
  canonical_role: CanonicalRole;
  status: "ACTIVE" | "INACTIVE";
  avatar_url: string | null;
};

function normalizeRole(
  role: string | null | undefined
): AppRole {
  const value = role?.toString().toUpperCase();

  if (value === "PARENT") {
    return "PARENT";
  }

  if (value === "STUDENT") {
    return "STUDENT";
  }

  if (
    value === "TEACHER" ||
    value === "CLASS_TEACHER" ||
    value === "CLASSROOM_TEACHER" ||
    value === "STAFF"
  ) {
    return "TEACHER";
  }

  if (value === "SUPER_ADMIN") {
    return "SUPER_ADMIN";
  }

  return "ADMIN";
}

function metadataRole(user: User): CanonicalRole | null {
  const role = user.app_metadata?.role;

  if (typeof role !== "string") {
    return null;
  }

  return role.toLowerCase() as CanonicalRole;
}


type AuthContextValue = {
  user: User | null;
  session: Session | null;
  profile: SchoolProfile | null;
  loading: boolean;
  error: string | null;

  signIn: (
    email: string,
    password: string
  ) => Promise<{ error?: string }>;

  sendMagicLink: (
    email: string
  ) => Promise<{ error?: string }>;

  sendPasswordReset: (
    email: string
  ) => Promise<{ error?: string }>;

  updatePassword: (
    password: string
  ) => Promise<{ error?: string }>;

  signOut: () => Promise<void>;

  refreshProfile: () => Promise<SchoolProfile | null>;
};


const AuthContext =
  createContext<AuthContextValue | undefined>(undefined);


export function SupabaseAuthProvider({
  children,
}: {
  children: React.ReactNode;
}) {

  const [session, setSession] =
    useState<Session | null>(null);

  const [profile, setProfile] =
    useState<SchoolProfile | null>(null);

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState<string | null>(null);



  const loadProfile = useCallback(
    async (
      userId: string | null
    ): Promise<SchoolProfile | null> => {

      try {

        if (!userId || !supabase) {
          setProfile(null);
          return null;
        }


        const {
          data,
          error: profileError,
        } = await supabase
          .from("profiles")
          .select(
            "id,email,display_name,phone,role,is_disabled,is_approved"
          )
          .eq("id", userId)
          .maybeSingle();



        if (profileError) {

          console.error(
            "Profile loading error:",
            profileError
          );

          setError(
            "Your account was authenticated, but your school profile could not be loaded."
          );

          setProfile(null);

          return null;
        }



        if (!data) {

          console.warn(
            "No profile found:",
            userId
          );

          setProfile(null);

          return null;
        }



        const normalizedProfile: SchoolProfile = {

          id: data.id,

          email: data.email ?? null,

          display_name:
            data.display_name ?? null,

          phone:
            data.phone ?? null,


          role:
            normalizeRole(data.role),


          canonical_role:
            data.role
              ?.toString()
              .toLowerCase() as CanonicalRole,


          status:
            data.is_disabled
              ? "INACTIVE"
              : "ACTIVE",


          avatar_url: null,
        };



        setProfile(normalizedProfile);

        return normalizedProfile;



      } catch (err) {

        console.error(
          "Unexpected profile error:",
          err
        );

        setProfile(null);

        return null;

      }
    },
    []
  );



  useEffect(() => {

    if (!supabase) {

      setError(
        "The portal has not been configured with Supabase yet."
      );

      setLoading(false);

      return;
    }


    let active = true;



    const initialise = async () => {

      try {

        const {
          data,
        } = await supabase.auth.getSession();


        if (!active) {
          return;
        }


        setSession(data.session);


        await loadProfile(
          data.session?.user.id ?? null
        );


      } catch (err) {

        console.error(err);

        if (active) {

          setError(
            "Unable to restore your school session."
          );

        }


      } finally {

        if (active) {

          setLoading(false);

        }

      }

    };



    void initialise();



    const {
      data: subscription,
    } =
      supabase.auth.onAuthStateChange(
        async (
          _event,
          nextSession
        ) => {


          setSession(nextSession);



          await loadProfile(
            nextSession?.user.id ?? null
          );



          setLoading(false);

        }
      );



    return () => {

      active = false;

      subscription.subscription.unsubscribe();

    };


  }, [loadProfile]);



  const value =
    useMemo<AuthContextValue>(() => ({

      user:
        session?.user ?? null,


      session,


      profile,


      loading,


      error,



      signIn:
        async (
          email,
          password
        ) => {

          const {
            error: signInError,
          } =
            await getSupabase()
              .auth
              .signInWithPassword({

                email:
                  email.trim().toLowerCase(),

                password,

              });


          return signInError
            ? {
                error:
                  signInError.message,
              }
            : {};

        },



      sendMagicLink:
        async email => {

          const {
            error: magicError,
          } =
            await getSupabase()
              .auth
              .signInWithOtp({

                email:
                  email.trim().toLowerCase(),

                options: {

                  emailRedirectTo:
                    `${window.location.origin}/portal/dashboard`,

                  shouldCreateUser:
                    false,

                },

              });


          return magicError
            ? {
                error:
                  magicError.message,
              }
            : {};

        },



      sendPasswordReset:
        async email => {

          const {
            error: resetError,
          } =
            await getSupabase()
              .auth
              .resetPasswordForEmail(

                email.trim().toLowerCase(),

                {
                  redirectTo:
                    `${window.location.origin}/portal/password?mode=update-password`,
                }

              );


          return resetError
            ? {
                error:
                  resetError.message,
              }
            : {};

        },



      updatePassword:
        async password => {

          const {
            error: updateError,
          } =
            await getSupabase()
              .auth
              .updateUser({
                password,
              });


          return updateError
            ? {
                error:
                  updateError.message,
              }
            : {};

        },



      signOut:
        async () => {

          await getSupabase()
            .auth
            .signOut();

          setProfile(null);
          setSession(null);

        },



      refreshProfile:
        async () =>
          loadProfile(
            session?.user.id ?? null
          ),


    }),
    [
      error,
      loadProfile,
      loading,
      profile,
      session,
    ]);



  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );

}



export function useSchoolAuth() {

  const context =
    useContext(AuthContext);


  if (!context) {

    throw new Error(
      "useSchoolAuth must be used inside SupabaseAuthProvider"
    );

  }


  return context;

}



export function isAdministrator(
  role: AppRole | undefined
) {

  return (
    role === "SUPER_ADMIN" ||
    role === "ADMIN"
  );

}



export function getPortalRedirect(
  profileOrUser: SchoolProfile | User | null,
  fallbackUser?: User | null
):
  | "/portal/admin"
  | "/portal/teacher"
  | "/portal/dashboard" {


  if (!profileOrUser) {

    return "/portal/dashboard";

  }



  let role = "";
  let email = "";



  if (
    "canonical_role" in profileOrUser ||
    "role" in profileOrUser
  ) {

    const profile =
      profileOrUser as SchoolProfile;


    role =
      profile.role
        ?.toString()
        .toUpperCase();


    email =
      profile.email
        ?.trim()
        .toLowerCase() || "";

  } else {


    const user =
      profileOrUser as User;


    role =
      metadataRole(user)
        ?.toUpperCase() || "";


    email =
      user.email
        ?.trim()
        .toLowerCase() || "";

  }



  if (!email && fallbackUser) {

    email =
      fallbackUser.email
        ?.trim()
        .toLowerCase() || "";

  }



  if (
    email === "menweschool.official@gmail.com" ||
    email === "menweprimaryandjunior@gmail.com" ||
    role === "ADMIN" ||
    role === "SUPER_ADMIN" ||
    role === "HEAD_OF_INSTITUTION" ||
    role === "DEPUTY_HOI"
  ) {

    return "/portal/admin";

  }



  if (
    role === "TEACHER" ||
    role === "CLASS_TEACHER" ||
    role === "CLASSROOM_TEACHER" ||
    role === "STAFF"
  ) {

    return "/portal/teacher";

  }



  return "/portal/dashboard";

}
