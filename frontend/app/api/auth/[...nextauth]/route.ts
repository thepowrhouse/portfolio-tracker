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
        const res = await fetch(`${apiUrl}/activity/check-blacklist?email=${user.email}`, { cache: 'no-store' });
        if (res.ok) {
          const data = await res.json();
          if (data.is_blacklisted) {
            console.log(`User ${user.email} is blacklisted, denying login.`);
            return false;
          }
        }
      } catch (err) {
        console.error("Blacklist check failed during signIn", err);
      }
      return true;
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
