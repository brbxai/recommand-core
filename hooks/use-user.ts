import { useEffect } from "react";
import { useUserStore } from "@core/lib/user-store";

export function useUser() {
  const store = useUserStore();

  useEffect(() => {
    if (!store.user) {
      store.fetchUser();
    }
  }, []);

  return store;
}
