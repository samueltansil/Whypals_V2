import { useQuery } from "@tanstack/react-query";

// Site-wide "free access" switch, toggled from /admin/banners. When on:
// login/register show a friendly "not needed right now" message instead of
// the real forms, the profile icon no longer sends logged-out visitors to
// login, and games no longer require being logged in to play.
export function useFreeAccessMode() {
  const { data, isLoading } = useQuery<{ enabled: boolean }>({
    queryKey: ["/api/settings/free-access"],
    queryFn: async () => {
      const res = await fetch("/api/settings/free-access");
      if (!res.ok) return { enabled: false };
      return res.json();
    },
    staleTime: 60_000,
    retry: false,
  });

  return { freeAccessEnabled: !!data?.enabled, isLoading };
}
