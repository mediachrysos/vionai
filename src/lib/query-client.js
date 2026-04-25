import { QueryClient } from '@tanstack/react-query';


export const queryClientInstance = new QueryClient({
	defaultOptions: {
		queries: {
			refetchOnWindowFocus: false,
			retry: false,           // neopakovat při rate limitu
			staleTime: 5 * 60 * 1000,  // 5 minut — sdílí cache mezi komponentami
			gcTime: 10 * 60 * 1000,
		},
	},
});