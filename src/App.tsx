import '@/styles/parts/tokens.css'
import '@/styles/parts/global.css'
import '@/styles/market.css'
import '@/styles/parts/account.css'

import { AppProviders } from '@/app/providers/AppProviders'
import { AppRouter } from '@/app/router/AppRouter'

export default function App() {
  return (
    <AppProviders>
      <AppRouter />
    </AppProviders>
  )
}
