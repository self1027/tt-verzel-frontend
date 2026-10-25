export function nextBidCents(
  start: string,
  increment: string,
  current: string | null,
): string | undefined {
  const next =
    current === null ? BigInt(start) : BigInt(current) + BigInt(increment)
  return next <= 9223372036854775807n ? next.toString() : undefined
}
