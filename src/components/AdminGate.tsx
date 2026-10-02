import { createContext, useCallback, useContext, useMemo, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { ShieldCheck } from 'lucide-react'

type AdminCtx = {
  unlocked: boolean
  passphrase: string
  unlock: (p: string) => void
  lock: () => void
}

const Ctx = createContext<AdminCtx | null>(null)

export function useAdmin() {
  const ctx = useContext(Ctx)
  if (!ctx) throw new Error('useAdmin must be used inside <AdminProvider>')
  return ctx
}

/**
 * Admin writes are gated by a shared passphrase instead of a login screen, which
 * keeps the prototype demo-friendly. The passphrase lives in memory only for the
 * tab session and is sent to Postgres RPCs for verification - never stored.
 */
export function AdminProvider({ children }: { children: React.ReactNode }) {
  const [passphrase, setPassphrase] = useState('')

  const value = useMemo<AdminCtx>(
    () => ({
      unlocked: passphrase.length > 0,
      passphrase,
      unlock: setPassphrase,
      lock: () => setPassphrase(''),
    }),
    [passphrase],
  )

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

export function AdminGate() {
  const { unlock } = useAdmin()
  const [input, setInput] = useState('')
  const [touched, setTouched] = useState(false)

  const submit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault()
      setTouched(true)
      if (input.trim()) unlock(input)
    },
    [input, unlock],
  )

  return (
    <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-8 text-center">
      <ShieldCheck className="mx-auto mb-3 size-8 text-slate-400" />
      <h3 className="font-semibold text-slate-800">Administrator action</h3>
      <p className="mx-auto mt-1 max-w-md text-sm text-slate-600">
        Enter the administrator passphrase to update concern status or edit facility conditions.
      </p>
      <form onSubmit={submit} className="mx-auto mt-4 flex max-w-sm flex-col gap-2 sm:flex-row">
        <Input
          type="password"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Admin passphrase"
          autoComplete="off"
          aria-label="Administrator passphrase"
        />
        <Button type="submit" disabled={!input.trim()}>
          Unlock
        </Button>
      </form>
      {touched && !input.trim() && (
        <Alert variant="destructive" className="mx-auto mt-3 max-w-sm text-left">
          <AlertDescription>Passphrase is required.</AlertDescription>
        </Alert>
      )}
      <p className="mt-3 text-xs text-slate-500">
        Demo passphrase: <code className="rounded bg-slate-200 px-1 py-0.5">change-me-in-rpc</code>
      </p>
    </div>
  )
}