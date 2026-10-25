import { useSyncExternalStore } from 'react'
import type { components } from '@/api/generated/schema'

type Session = { token: string; user: components['schemas']['User'] }
let session: Session | null = null
let timer: ReturnType<typeof setTimeout> | undefined
const listeners = new Set<() => void>()
export const subscribeSession = (listener: () => void) => {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}
export const getSession = () => session
export const useSession = () =>
  useSyncExternalStore(subscribeSession, getSession)
export function endSession() {
  clearTimeout(timer)
  session = null
  listeners.forEach((listener) => listener())
}
export function startSession(
  token: string,
  user: Session['user'],
  expiresIn: number,
) {
  clearTimeout(timer)
  session = { token, user }
  timer = setTimeout(endSession, Math.min(expiresIn * 1000, 2147483647))
  listeners.forEach((listener) => listener())
}
export function safeReturnTo(value: string | null, fallback = '/') {
  return value &&
    /^\/(?:auctions(?:\/|$)|wallet(?:\?|$)|my-bids(?:\?|$)|seller(?:\?|$))/.test(
      value,
    ) &&
    !value.includes('\\')
    ? value
    : fallback
}
