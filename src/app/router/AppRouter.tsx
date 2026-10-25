import { BrowserRouter, Route, Routes } from 'react-router'
import { SiteLayout } from '@/components/layout/SiteLayout'
import { AuctionsPage } from '@/features/auctions/pages/AuctionsPage'
import { AuctionDetailPage } from '@/features/auctions/pages/AuctionDetailPage'
import { NotFoundPage } from '@/features/auctions/pages/NotFoundPage'
import { LoginPage } from '@/features/auth/LoginPage'
import { RequireRole } from '@/features/auth/RequireRole'
import { WalletPage } from '@/features/wallet/WalletPage'
import { MyBidsPage } from '@/features/account/MyBidsPage'
import { SellerPage } from '@/features/seller/SellerPage'
import { AuditPage } from '@/features/audit/AuditPage'
import { ReceiptPage } from '@/features/audit/ReceiptPage'

export function AppRouter() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<SiteLayout />}>
          <Route index element={<AuctionsPage />} />
          <Route path="login" element={<LoginPage />} />
          <Route path="auctions/:id" element={<AuctionDetailPage />} />
          <Route path="auctions/:id/audit" element={<AuditPage />} />
          <Route path="auctions/:id/receipt" element={<ReceiptPage />} />
          <Route element={<RequireRole role="BIDDER" />}>
            <Route path="wallet" element={<WalletPage />} />
            <Route path="my-bids" element={<MyBidsPage />} />
          </Route>
          <Route element={<RequireRole role="AUCTIONEER" />}>
            <Route path="seller" element={<SellerPage />} />
          </Route>
          <Route path="*" element={<NotFoundPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}
