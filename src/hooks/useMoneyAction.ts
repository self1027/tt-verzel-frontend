import { useState, useSyncExternalStore } from 'react'
import { ApiError } from '@/api/client'

type Intent = {
  cents: string
  key: string
  pending: boolean
  uncertain: boolean
}
// Session-local ownership survives route unmounts. Never infer confirmation from balances.
const intents = new Map<string, Intent>()
const listeners = new Set<() => void>()
const subscribe = (listener: () => void) => {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}
const publish = () => {
  for (const listener of listeners) listener()
}
const uncertainMessage =
  'A confirmação não chegou. Tente novamente com o mesmo valor; a operação não será duplicada.'

export function useMoneyAction(
  send: (cents: string, key: string) => Promise<unknown>,
  onSuccess: () => void,
  scope: string,
) {
  const intent = useSyncExternalStore(subscribe, () => intents.get(scope))
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  async function submit(cents: string) {
    const previous = intents.get(scope)
    if (previous?.pending) return
    if (previous && previous.cents !== cents) {
      setError('Confirme a tentativa anterior antes de alterar o valor.')
      return
    }
    const current = previous ?? {
      cents,
      key: crypto.randomUUID(),
      pending: false,
      uncertain: false,
    }
    intents.set(scope, { ...current, pending: true })
    publish()
    setError('')
    setSuccess(false)
    try {
      await send(cents, current.key)
      intents.delete(scope)
      publish()
      setSuccess(true)
      onSuccess()
    } catch (cause) {
      // A later rejection (e.g. expired session) cannot disprove an earlier commit.
      const unresolved =
        current.uncertain || !(cause instanceof ApiError) || cause.status >= 500
      if (unresolved)
        intents.set(scope, { ...current, pending: false, uncertain: true })
      else intents.delete(scope)
      publish()
      setError(unresolved ? uncertainMessage : cause.message)
    }
  }
  return {
    submit,
    pending: intent?.pending ?? false,
    uncertain: intent?.uncertain ?? false,
    intentCents: intent?.cents,
    error: error || (intent?.uncertain ? uncertainMessage : ''),
    success,
  }
}
