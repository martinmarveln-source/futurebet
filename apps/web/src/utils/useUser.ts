import { useSession } from "@/lib/auth-client";

export default function useUser() {
  const { data, isPending, refetch } = useSession();
  
  return {
    data: data?.user || null,
    loading: isPending,
    refetch,
  };
}
