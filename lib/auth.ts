import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { auditAs } from "@/lib/audit";

export const { handlers, auth, signIn, signOut } = NextAuth({
  session: { strategy: "jwt" },
  pages: {
    signIn: "/login",
  },
  providers: [
    Credentials({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      authorize: async (credentials) => {
        const raw = credentials?.email as string | undefined;
        const password = credentials?.password as string | undefined;
        if (!raw || !password) return null;

        // ชื่อผู้ใช้เก็บเป็นตัวพิมพ์เล็กเสมอตอนสร้างบัญชี
        // ตอนล็อกอินจึงต้องแปลงให้ตรงกัน ไม่งั้นพิมพ์ Sutimon แล้วหาไม่เจอ
        const email = raw.trim().toLowerCase();

        const admin = await prisma.adminUser.findUnique({ where: { email } });
        if (!admin) {
          await auditAs(
            { id: null, name: email, role: null },
            {
              action: "auth.login_failed",
              summary: `เข้าสู่ระบบไม่สำเร็จ — ไม่พบชื่อผู้ใช้ "${email}"`,
              entity: "adminUser",
            }
          );
          return null;
        }

        const isValid = await bcrypt.compare(password, admin.passwordHash);
        if (!isValid) {
          await auditAs(
            { id: admin.id, name: admin.name, role: admin.role },
            {
              action: "auth.login_failed",
              summary: `เข้าสู่ระบบไม่สำเร็จ — รหัสผ่านไม่ถูกต้อง (${admin.email})`,
              entity: "adminUser",
              entityId: admin.id,
            }
          );
          return null;
        }

        await auditAs(
          { id: admin.id, name: admin.name, role: admin.role },
          {
            action: "auth.login",
            summary: `เข้าสู่ระบบสำเร็จ (${admin.email})`,
            entity: "adminUser",
            entityId: admin.id,
          }
        );

        return { id: admin.id, email: admin.email, name: admin.name };
      },
    }),
  ],
  callbacks: {
    authorized: ({ auth, request }) => {
      const isOnAdmin = request.nextUrl.pathname.startsWith("/admin");
      if (isOnAdmin) return !!auth?.user;
      return true;
    },
    jwt: ({ token, user }) => {
      if (user) token.id = user.id;
      return token;
    },
    session: ({ session, token }) => {
      if (session.user) session.user.id = token.id as string;
      return session;
    },
  },
});
