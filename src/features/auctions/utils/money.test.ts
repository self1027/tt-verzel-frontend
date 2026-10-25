import { describe, expect, it } from 'vitest'
import {
  centsToBrlInput,
  formatCentsToBrl,
  parseBrlInputToCents,
} from './money'

describe('auction money formatting', () => {
  it('formats canonical cents without losing bigint precision', () => {
    expect(formatCentsToBrl('900719925474099312345')).toBe(
      'R$ 9.007.199.254.740.993.123,45',
    )
    expect(formatCentsToBrl('0')).toBe('R$ 0,00')
  })

  it('converts BRL filter text to canonical cents without floating point', () => {
    expect(parseBrlInputToCents('1234,5')).toBe('123450')
    expect(parseBrlInputToCents('1234.56')).toBe('123456')
    expect(parseBrlInputToCents('')).toBeUndefined()
    expect(parseBrlInputToCents('-1')).toBeUndefined()
    expect(parseBrlInputToCents('2,999')).toBeUndefined()
  })

  it('converts canonical cents to a precise filter value', () => {
    expect(centsToBrlInput('125')).toBe('1,25')
  })
})

it('rejects cents above backend BIGINT range', () => {
  expect(parseBrlInputToCents('92233720368547758.08')).toBeUndefined()
})
