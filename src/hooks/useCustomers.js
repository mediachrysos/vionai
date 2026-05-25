import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";

// Centrální hook pro customers — jediný zdroj dat, sdílený přes celou appku
export function useCustomers() {
  return useQuery({
    queryKey: ["customers"],
    queryFn: () => base44.entities.Customer.list("-created_date", 5000),
    staleTime: 60 * 1000,
  });
}