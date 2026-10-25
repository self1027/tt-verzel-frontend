export const auctionKeys = {
  all: ['auctions'] as const,
  list: (search: object) => [...auctionKeys.all, 'list', search] as const,
  detail: (id: string) => [...auctionKeys.all, 'detail', id] as const,
  bids: (id: string) => [...auctionKeys.all, 'bids', id] as const,
}
