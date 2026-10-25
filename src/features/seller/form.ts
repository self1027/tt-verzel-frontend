import type { components } from '@/api/generated/schema'
import { parseBrlInputToCents } from '@/features/auctions/utils/money'
export function auctionInput(
  fields: {
    productSnapshotId: string
    starting: string
    increment: string
    starts: string
    ends: string
  },
  now: number,
): components['schemas']['CreateAuction'] {
  const start = parseBrlInputToCents(fields.starting),
    increment = parseBrlInputToCents(fields.increment)
  if (!fields.productSnapshotId)
    throw new Error('Selecione um produto importado para criar o lote.')
  if (!start || !increment || BigInt(start) <= 0n || BigInt(increment) <= 0n)
    throw new Error(
      'Informe valores positivos em reais com até duas casas decimais.',
    )
  const starts = Date.parse(fields.starts),
    ends = Date.parse(fields.ends)
  if (
    !Number.isFinite(starts) ||
    !Number.isFinite(ends) ||
    starts <= now ||
    ends <= starts
  )
    throw new Error(
      'O início deve estar no futuro e o fim deve ser posterior ao início.',
    )
  return {
    productSnapshotId: fields.productSnapshotId,
    startingBidCents: start,
    minIncrementCents: increment,
    startsAt: new Date(starts).toISOString(),
    endsAt: new Date(ends).toISOString(),
  }
}
export function localDateInput(value: string) {
  const date = new Date(value)
  return new Date(date.getTime() - date.getTimezoneOffset() * 60000)
    .toISOString()
    .slice(0, 19)
}
