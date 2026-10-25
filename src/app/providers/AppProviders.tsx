import { useEffect, useState, type PropsWithChildren } from 'react'
import { getSession, subscribeSession } from '@/features/auth/session'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

export function AppProviders({ children }: PropsWithChildren) {
  const [queryClient] = useState(() => new QueryClient())
  useEffect(
    () =>
      subscribeSession(() => {
        if (!getSession()) {
          void queryClient.cancelQueries({ queryKey: ['private'] })
          queryClient.removeQueries({ queryKey: ['private'] })
        }
      }),
    [queryClient],
  )
  return (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  )
}
