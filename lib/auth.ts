// lib/auth.ts
import type { NextAuthOptions } from "next-auth";
import Google from "next-auth/providers/google";
import dbConnect from "@/lib/mongoose";
import User from "@/models/User";

function normEmail(e: string) {
  return e.trim().toLowerCase();
}

export const authOptions: NextAuthOptions = {
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID ?? "",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET ?? "",
      allowDangerousEmailAccountLinking: true,
    }),
  ],

  session: { strategy: "jwt" },

  callbacks: {
    // When a user signs in with Google
    async signIn({ user, account }) {
      if (account?.provider === "google" && user.email) {
        await dbConnect();

        // Upsert (create if not exists)
        const email = normEmail(user.email);
        await User.updateOne(
          { email },
          {
            $setOnInsert: {
              email,
              name: user.name ?? email,
              image: user.image,
              provider: "google",
              googleId: user.id,
              role: "MEMBER", // default role
              createdAt: new Date(),
            },
          },
          { upsert: true }
        );
      }
      return true;
    },

    // Inject DB fields into the JWT
    async jwt({ token, user }) {
      if (user?.email) {
        await dbConnect();
        const dbUser = await User.findOne({ email: normEmail(user.email) }).lean();
        if (dbUser) {
          token.sub = String(dbUser._id);
          (token as { role?: string }).role = dbUser.role;
          token.name = dbUser.name;
          token.picture = dbUser.image;
        }
      }
      return token;
    },

    // Inject JWT data into the session object
    async session({ session, token }) {
      if (session.user) {
        (session.user as { id?: string }).id = token.sub;
        (session.user as { role?: string }).role = (token as { role?: string }).role;
      }
      return session;
    },
  },

  pages: {
    signIn: "/login", // your login page
  },
};
