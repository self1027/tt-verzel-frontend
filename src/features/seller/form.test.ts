import { expect, test } from 'vitest'
import { auctionInput } from './form'
test('validates future dates, exact positive cents and product before submitting', () => {
  const fields = {
    productSnapshotId: 'p1',
    starting: '1.01',
    increment: '0.01',
    startsDate: '2031-01-01',
    startsTime: '12:00',
    endsDate: '2031-01-02',
    endsTime: '12:00',
  }
  expect(auctionInput(fields, Date.parse('2030-01-01')).startingBidCents).toBe(
    '101',
  )
  expect(auctionInput(fields, Date.parse('2030-01-01')).startsAt).toMatch(/Z$/)
  expect(auctionInput(fields, Date.parse('2030-01-01')).startsAt).toBe(
    new Date(2031, 0, 1, 12).toISOString(),
  )
  expect(() =>
    auctionInput({ ...fields, increment: '0' }, Date.parse('2030-01-01')),
  ).toThrow()
  expect(() =>
    auctionInput(
      { ...fields, endsDate: fields.startsDate, endsTime: fields.startsTime },
      Date.parse('2030-01-01'),
    ),
  ).toThrow()
  expect(() => auctionInput(fields, Date.parse('2032-01-01'))).toThrow()
})
