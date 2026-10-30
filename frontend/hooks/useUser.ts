import { useQuery } from "@tanstack/react-query";

import { createClient } from "@/lib/supabase";

export function useUser() {
  return useQuery({
    queryKey: ["user"],
    queryFn: async () => {
      const { data } = await createClient().auth.getUser();
      const email = data.user?.email ?? "";
      const fullName: string = data.user?.user_metadata?.full_name || email.split("@")[0];
      return { email, fullName };
    },
    staleTime: 5 * 60 * 1000,
  });
}
