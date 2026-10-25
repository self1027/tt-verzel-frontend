import { useRef, useState } from 'react'
import { ApiError } from '@/api/client'
export function useMoneyAction(
  send: (cents: string, key: string) => Promise<unknown>,
  onSuccess: () => void,
) {
  const intent = useRef<{ cents: string; key: string } | null>(null)
  const sending = useRef(false)
  const [pending, setPending] = useState(false)
  const [uncertain, setUncertain] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  async function submit(cents: string) {
    if (sending.current) return
    if (intent.current && intent.current.cents !== cents) {
      setError('Confirme a tentativa anterior antes de alterar o valor.')
      return
    }
    intent.current ??= { cents, key: crypto.randomUUID() }
    sending.current = true
    setPending(true)
    setError('')
    setSuccess(false)
    try {
      await send(cents, intent.current.key)
      intent.current = null
      setUncertain(false)
      setSuccess(true)
      onSuccess()
    } catch (cause) {
      const unresolved = !(cause instanceof ApiError) || cause.status >= 500
      setUncertain(unresolved)
      if (!unresolved) intent.current = null
      setError(
        unresolved
          ? 'A confirmação não chegou. Tente novamente com o mesmo valor; a operação não será duplicada.'
          : cause.message,
      )
    } finally {
      sending.current = false
      setPending(false)
    }
  }
  return { submit, pending, uncertain, error, success }
}
