import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { db } from "./db";
import * as authSchema from "./db/auth-schema";

export const auth = betterAuth({
    database: drizzleAdapter(db, {
        provider: "pg",
        schema: authSchema,
    }),

    socialProviders: {
        google: {
            clientId: process.env.GOOGLE_CLIENT_ID!,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
            scopes: [
                "openid",
                "email",
                "profile",
                "https://www.googleapis.com/auth/drive.file",
            ],
            accessType: "offline",
            prompt: "consent",
        },
    },

    session: {
        expiresIn: 60 * 60 * 24 * 30,
        updateAge: 60 * 60 * 24,
        cookieCache: {
            enabled: true,
            maxAge: 60 * 5,
        },
    },

    user: {
        additionalFields: {
            googleAccessToken: {
                type: "string",
                required: false,
                fieldName: "google_access_token",
            },
            googleRefreshToken: {
                type: "string",
                required: false,
                fieldName: "google_refresh_token",
            },
        },
    },
    advanced: {
        ipAddress: {
            ipAddressHeaders: ["x-forwarded-for", "x-real-ip"],
            disableIpTracking: false,
        },
    },
});

export type Session = typeof auth.$Infer.Session.session;
export type User = typeof auth.$Infer.Session.user;
