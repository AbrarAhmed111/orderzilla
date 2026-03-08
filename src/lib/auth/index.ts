"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";

export async function getCurrentUser() {
  const cookieStore = await cookies();
  const accessToken = cookieStore.get("oz_access_token")?.value;
  if (!accessToken) return null;
  return { accessToken };
}

export async function requireAuth() {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login");
  }
  return user;
}


