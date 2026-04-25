import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";

// Centrální hook pro payments — jediný zdroj dat, sdílený přes celou appku
export function usePayments() {
  return useQuery({
    queryKey: ["payments"],
    queryFn: () => base44.entities.Payment.list("-created_date", 5000),
    staleTime: 5 * 60 * 1000,
  });
}