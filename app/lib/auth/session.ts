import { cookies } from "next/headers";
import { getIronSession, type SessionOptions } from "iron-session";

export type AuthSession = {
 nonce?: string;
 siwe?: {
 address: string;
 chainId: number;
 issuedAt: string;
 };
};

export const sessionOptions: SessionOptions = {
 cookieName: "dreambuilder_auth",
 password:
 process.env.SESSION_PASSWORD ||
 "change_this_to_a_long_secure_password_at_least_32_chars",
 cookieOptions: {
 secure: process.env.NODE_ENV === "production",
 },
};

export async function getAuthSession() {
 const cookieStore = await cookies();
 return getIronSession<AuthSession>(cookieStore, sessionOptions);
}