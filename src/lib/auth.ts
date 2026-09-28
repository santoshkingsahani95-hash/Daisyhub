import { NextAuthOptions } from 'next-auth';
import GoogleProvider from 'next-auth/providers/google';
import { prisma } from '@/lib/prisma';

export const authOptions: NextAuthOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID || '',
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
    }),
  ],
  secret: process.env.NEXTAUTH_SECRET || process.env.AUTH_SECRET,
  session: {
    strategy: 'jwt',
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  callbacks: {
    async signIn({ user, account }) {
      if (account?.provider === 'google' && user?.email) {
        try {
          const userId = `usr-google-${user.id || Date.now()}`;
          const userName = user.name || user.email.split('@')[0];

          await prisma.user.upsert({
            where: { email: user.email },
            update: {
              name: userName,
            },
            create: {
              id: userId,
              name: userName,
              email: user.email,
              role: 'CUSTOMER',
              registrationDate: new Date().toISOString().split('T')[0],
            },
          });
        } catch (error) {
          console.warn('[NextAuth] Failed to sync Google user to database:', error);
          // Return true even if DB sync fails so login continues smoothly
        }
      }
      return true;
    },
    async jwt({ token, user }) {
      if (user) {
        token.id = `usr-google-${user.id}`;
      }
      return token;
    },
    async session({ session, token }) {
      if (session?.user) {
        (session.user as any).id = token.id || (token.sub ? `usr-google-${token.sub}` : `usr-${Date.now()}`);
        (session.user as any).role = 'CUSTOMER';
      }
      return session;
    },
  },
  pages: {
    signIn: '/login',
    error: '/login',
  },
};
