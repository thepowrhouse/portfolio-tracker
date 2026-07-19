import NextAuth from "next-auth";
import GoogleProvider from "next-auth/providers/google";

const handler = NextAuth({
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID || "",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || "",
    }),
  ],
  callbacks: {
    async signIn({ user, account, profile }) {
      try {
        if (!user.email) return false;
        const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
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
        session.user.email = token.email || session.user.email;
      }
      return session;
    },
    async jwt({ token, user }) {
      if (user) {
        token.email = user.email;
      }
      return token;
    },
  },
  session: {
    strategy: "jwt",
  },
});

export { handler as GET, handler as POST };
