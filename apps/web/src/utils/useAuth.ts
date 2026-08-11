import { signIn, signUp, signOut, sendVerificationEmail } from "@/lib/auth-client";

export default function useAuth() {
  return {
    signInWithCredentials: async (credentials: any) => {
      const { data, error } = await signIn.email({ 
        email: credentials.email, 
        password: credentials.password,
        fetchOptions: {
          onSuccess: () => {
            if (credentials.redirect && typeof window !== "undefined") {
              window.location.href = credentials.callbackUrl || "/";
            }
          }
        }
      });
      if (error) throw new Error(error.message || "CredentialsSignin");
      return data;
    },
    signUpWithCredentials: async (credentials: any) => {
      const { data, error } = await signUp.email({ 
        email: credentials.email, 
        password: credentials.password, 
        name: credentials.name,
        fetchOptions: {
          onSuccess: () => {
            if (credentials.redirect && typeof window !== "undefined") {
              window.location.href = credentials.callbackUrl || "/";
            }
          }
        }
      });
      if (error) throw new Error(error.message || "EmailCreateAccount");
      
      // Force send the verification email immediately after successful signup
      await sendVerificationEmail({
        email: credentials.email,
        callbackUrl: credentials.callbackUrl || "/",
      }).catch((err) => {
        console.error("Failed to trigger verification email:", err);
      });

      return data;
    },
    signOut: async (options?: any) => {
      return await signOut({
        fetchOptions: {
          onSuccess: options?.callbackUrl ? () => {
             if (options.redirect && typeof window !== "undefined") {
               window.location.href = options.callbackUrl;
             }
          } : undefined
        }
      });
    }
  };
}
