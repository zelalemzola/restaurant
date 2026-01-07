import { betterAuth } from "better-auth";
import { mongodbAdapter } from "better-auth/adapters/mongodb";
import { MongoClient } from "mongodb";
import bcrypt from "bcryptjs";

const client = new MongoClient(
  process.env.MONGODB_URI || "mongodb://localhost:27017/restaurant-erp"
);

export const auth = betterAuth({
  database: mongodbAdapter(client.db("restaurant-erp")),
  secret: process.env.BETTER_AUTH_SECRET!,
  baseURL: process.env.BETTER_AUTH_URL || "https://restaurant-lime-nu-21.vercel.app/",
  emailAndPassword: {
    enabled: true,
    requireEmailVerification: false,
  },
  password: {
    hash: async (password: string) => {
      return await bcrypt.hash(password, 12);
    },
    verify: async (password: string, hash: string) => {
      return await bcrypt.compare(password, hash);
    },
  },
  socialProviders: {
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID as string,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET as string,
      accessType: "offline",
      prompt: "select_account consent",
    },
  },
  session: {
    expiresIn: 60 * 60 * 24 * 7, // 7 days
    updateAge: 60 * 60 * 24, // 1 day
  },
  user: {
    additionalFields: {
      role: {
        type: "string",
        defaultValue: "user",
        required: false,
      },
      firstName: {
        type: "string",
        required: false,
      },
      lastName: {
        type: "string",
        required: false,
      },
    },
  },
  trustedOrigins: [process.env.BETTER_AUTH_URL || "https://restaurant-lime-nu-21.vercel.app/"],
});

export type Session = typeof auth.$Infer.Session.session & {
  user: typeof auth.$Infer.Session.user;
};
export type User = typeof auth.$Infer.Session.user;
