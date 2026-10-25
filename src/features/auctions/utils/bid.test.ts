import { expect, test } from 'vitest'
import { nextBidCents } from './bid'
test('calculates exact next bid and detects backend overflow', () => {
  expect(nextBidCents('100', '10', null)).toBe('100')
  expect(nextBidCents('100', '10', '9007199254740993')).toBe('9007199254741003')
  expect(nextBidCents('100', '10', '9223372036854775807')).toBeUndefined()
})
