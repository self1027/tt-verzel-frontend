const integerFormatter = new Intl.NumberFormat('pt-BR', {
  maximumFractionDigits: 0,
})
const currencySymbol =
  new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    maximumFractionDigits: 2,
  })
    .formatToParts(0)
    .find((part) => part.type === 'currency')?.value ?? 'R$'

export function formatCentsToBrl(cents: string): string {
  if (!/^(0|[1-9]\d*)$/.test(cents))
    throw new TypeError('Valor em centavos inválido')
  const value = BigInt(cents)
  const reais = value / 100n
  const centavos = (value % 100n).toString().padStart(2, '0')
  return `${currencySymbol} ${integerFormatter.format(reais)},${centavos}`
}

export function centsToBrlInput(cents: string): string {
  const value = BigInt(cents)
  return `${value / 100n},${(value % 100n).toString().padStart(2, '0')}`
}

export function parseBrlInputToCents(input: string): string | undefined {
  const value = input.trim()
  if (!value) return undefined
  const match = /^(\d+)(?:[,.](\d{1,2}))?$/.exec(value)
  if (!match) return undefined
  const fraction = (match[2] ?? '').padEnd(2, '0')
  const cents = BigInt(match[1]!) * 100n + BigInt(fraction || '0')
  return cents <= 9223372036854775807n ? cents.toString() : undefined
}
