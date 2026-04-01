import { QueryClient } from '@tanstack/react-query';


export const queryClientInstance = new QueryClient({
	defaultOptions: {
		queries: {
			refetchOnWindowFocus: false,
			retry: 1,
			staleTime: 30 * 1000,  // 30 sekund — sdílí cache, ale invalidateQueries funguje normálně
			gcTime: 5 * 60 * 1000,
		},
	},
});