import { BrowserRouter, Route, Routes } from 'react-router'

export function AppRouter() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<main aria-label="Verzel Auction House" />} />
      </Routes>
    </BrowserRouter>
  )
}
