import { NextAuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import CredentialsProvider from "next-auth/providers/credentials";
import jwt from "jsonwebtoken";

export const authOptions: NextAuthOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID || "",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || "",
    }),
    CredentialsProvider({
      name: "Admin Impersonation",
      credentials: {
        email: { label: "Email", type: "text" },
        adminPassword: { label: "Admin Password", type: "password" }
      },
      async authorize(credentials, req) {
        if (!credentials?.email || !credentials?.adminPassword) {
          return null;
        }
        const validPassword = process.env.ADMIN_PASSWORD || "secret123";
        if (credentials.adminPassword === validPassword) {
          return {
            id: credentials.email,
            email: credentials.email,
            name: "Ghost Mode User"
          };
        }
        return null;
      }
    })
  ],
  callbacks: {
    async signIn({ user, account, profile }) {
      if (account?.provider === "credentials") {
        return true;
      }
      
      try {
        if (!user.email) return false;
        const apiUrl = process.env.API_URL || process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
        const name = encodeURIComponent(user.name || "");
        const picture = encodeURIComponent(user.image || "");
        const res = await fetch(`${apiUrl}/activity/check-access?email=${user.email}&name=${name}&picture=${picture}`, { cache: 'no-store' });
        if (res.ok) {
          const data = await res.json();
          if (!data.has_access) {
            console.log(`User ${user.email} denied access. Reason: ${data.reason}`);
            if (data.reason === "pending") return "/?error=pending";
            if (data.reason === "blacklisted") return "/?error=blacklisted";
            return "/?error=access_denied";
          }
          return true; // Explicitly return true only when has_access is true
        }
      } catch (err) {
        console.error("Access check failed during signIn", err);
      }
      return "/?error=access_denied"; // Fail closed by default if backend is down
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.email = token.email as string || session.user.email;
        (session as any).backendToken = token.backendToken;
      }
      return session;
    },
    async jwt({ token, user }) {
      if (user) {
        token.email = user.email;
        const secret = process.env.JWT_SECRET || "fallback_secret_123";
        token.backendToken = jwt.sign({ email: user.email }, secret, { algorithm: "HS256" });
      }
      return token;
    },
  },
  session: {
    strategy: "jwt",
  },
};
