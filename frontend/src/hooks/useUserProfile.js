// hooks/useUserProfile.js
import { useQuery } from "@tanstack/react-query";

export default function useUserProfile(userId, enabled = true) {
  return useQuery({
    queryKey: ["userProfile", userId],
    enabled: !!userId && enabled,
    queryFn: async () => {
      const res = await fetch("/api/me", { credentials: "include" });
      if (!res.ok) throw new Error("Failed to load profile");
      return res.json();
    },
    staleTime: 60_000,
  });
}
