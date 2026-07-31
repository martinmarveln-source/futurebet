import { auth as betterAuthInstance } from "./lib/auth";
import { headers } from "next/headers";

export const auth = async () => {
  return await betterAuthInstance.api.getSession({
    headers: await headers(),
  });
};
