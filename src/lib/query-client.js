import { QueryClient } from '@tanstack/react-query';


export const queryClientInstance = new QueryClient({
	defaultOptions: {
		queries: {
			refetchOnWindowFocus: false,
			retry: 1,
			staleTime: 2 * 60 * 1000,   // 2 minuty — sdílená cache zabrání duplicitním requestům
			gcTime: 5 * 60 * 1000,       // 5 minut v cache po unmount
		},
	},
});