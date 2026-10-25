import '@/styles/parts/tokens.css'
import '@/styles/parts/global.css'
import '@/styles/market.css'
import '@/styles/market-extra.css'
import '@/styles/market-extra-2.css'
import '@/styles/market-extra-3.css'
import '@/styles/market-base.css.part1-1.css'
import '@/styles/market-base.css.part1-2.css'
import '@/styles/market-base.css.part2.css'
import '@/styles/market-detail.css.part1-1.css'
import '@/styles/market-detail.css.part1-2.css'
import '@/styles/market-detail.css.part2.css'
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
