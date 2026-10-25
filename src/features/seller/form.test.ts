import { expect, test } from 'vitest'
import { auctionInput } from './form'
test('validates future dates, exact positive cents and product before submitting', () => {
  const fields = {
    productSnapshotId: 'p1',
    starting: '1.01',
    increment: '0.01',
    starts: '2031-01-01T12:00',
    ends: '2031-01-02T12:00',
  }
  expect(auctionInput(fields, Date.parse('2030-01-01')).startingBidCents).toBe(
    '101',
  )
  expect(auctionInput(fields, Date.parse('2030-01-01')).startsAt).toMatch(/Z$/)
  expect(() =>
    auctionInput({ ...fields, increment: '0' }, Date.parse('2030-01-01')),
  ).toThrow()
  expect(() =>
    auctionInput({ ...fields, ends: fields.starts }, Date.parse('2030-01-01')),
  ).toThrow()
  expect(() => auctionInput(fields, Date.parse('2032-01-01'))).toThrow()
})
