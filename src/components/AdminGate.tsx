import { createContext, useCallback, useContext, useMemo, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Eye, EyeOff, KeyRound, ShieldCheck, Unlock } from 'lucide-react'
import { toast } from 'sonner'

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
  const [showPassword, setShowPassword] = useState(false)
  const [touched, setTouched] = useState(false)

  const submit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault()
      setTouched(true)
      if (input.trim()) {
        unlock(input.trim())
        toast.success('Admin privileges unlocked', {
          description: 'You can now update concern statuses and edit facility conditions.',
        })
      }
    },
    [input, unlock],
  )

  function useDemoKey() {
    setInput('change-me-in-rpc')
  }

  return (
    <div className="rounded-2xl border border-dashed border-slate-300 bg-gradient-to-b from-slate-50/80 to-white p-6 sm:p-8 text-center shadow-xs">
      <div className="mx-auto mb-3 flex size-12 items-center justify-center rounded-2xl bg-sky-50 text-sky-600 shadow-2xs">
        <ShieldCheck className="size-6 text-sky-600" />
      </div>
      <h3 className="text-base font-bold text-slate-800">Administrator Authorization Required</h3>
      <p className="mx-auto mt-1 max-w-md text-xs sm:text-sm text-slate-500">
        Enter the administrative passphrase to modify facility conditions or transition concern tickets.
      </p>

      <form onSubmit={submit} className="mx-auto mt-5 flex max-w-md flex-col gap-2 sm:flex-row">
        <div className="relative flex-1">
          <Input
            type={showPassword ? 'text' : 'password'}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Admin passphrase…"
            autoComplete="off"
            aria-label="Administrator passphrase"
            className="bg-white pr-9 text-sm"
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
            aria-label={showPassword ? 'Hide password' : 'Show password'}
          >
            {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
          </button>
        </div>
        <Button
          type="submit"
          disabled={!input.trim()}
          className="gap-1.5 bg-sky-600 hover:bg-sky-700 shadow-xs"
        >
          <Unlock className="size-3.5" />
          Unlock Access
        </Button>
      </form>

      {touched && !input.trim() && (
        <Alert variant="destructive" className="mx-auto mt-3 max-w-md text-left">
          <AlertDescription>Passphrase is required to proceed.</AlertDescription>
        </Alert>
      )}

      <div className="mt-4 flex items-center justify-center gap-2 text-xs text-slate-500">
        <span>Demo environment:</span>
        <button
          type="button"
          onClick={useDemoKey}
          className="inline-flex items-center gap-1 font-semibold text-sky-600 hover:text-sky-700 hover:underline"
        >
          <KeyRound className="size-3" />
          Autofill demo key (<code className="rounded bg-slate-200/80 px-1 py-0.5 text-[11px]">change-me-in-rpc</code>)
        </button>
      </div>
    </div>
  )
}