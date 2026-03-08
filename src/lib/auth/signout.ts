"use client";

import { clearAuthSession } from "@/lib/auth/session";

export async function clientSignout() {
  try {
    clearAuthSession();
    if (typeof window !== "undefined") {
      window.location.href = "/login";
    }
    return { success: true };
  } catch (error) {
    console.error("Error in clientSignout:", error);
    return { success: false, error: "Failed to sign out" };
  }
}


