"use client";

import { useEffect, useState, ReactNode } from "react";
import { useRouter } from "next/navigation";
import { getAuthSession } from "@/lib/auth/session";

interface AuthGateProps {
  children: ReactNode;
  fallback?: ReactNode;
  loading?: ReactNode;
  redirectTo?: string;
}

export function AuthGate({
  children,
  fallback = null,
  loading = <div className="p-6 text-center">Checking session...</div>,
  redirectTo = "/login",
}: AuthGateProps) {
  const router = useRouter();
  const [status, setStatus] = useState<"checking" | "authed" | "denied">("checking");

  useEffect(() => {
    const session = getAuthSession();
    if (session?.accessToken) {
      setStatus("authed");
      return;
    }
    setStatus("denied");
    router.replace(redirectTo);
  }, [router, redirectTo]);

  if (status === "checking") return <>{loading}</>;
  if (status === "denied") return <>{fallback}</>;
  return <>{children}</>;
}


