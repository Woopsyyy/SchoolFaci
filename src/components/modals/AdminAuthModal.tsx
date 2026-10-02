import { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useAdmin } from '@/components/AdminGate'
import { Eye, EyeOff, KeyRound, Lock, ShieldCheck, Unlock } from 'lucide-react'
import { toast } from 'sonner'

type Props = {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function AdminAuthModal({ open, onOpenChange }: Props) {
  const { unlocked, unlock, lock } = useAdmin()
  const [input, setInput] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function handleUnlock(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    if (!input.trim()) {
      setError('Please enter the administrator passphrase.')
      return
    }

    unlock(input.trim())
    toast.success('Admin mode unlocked', {
      description: 'You can now update concern statuses and edit facility conditions.',
    })
    setInput('')
    onOpenChange(false)
  }

  function handleLock() {
    lock()
    toast.info('Admin mode locked', {
      description: 'Administrative write privileges have been revoked for this session.',
    })
    onOpenChange(false)
  }

  function useDemoKey() {
    setInput('change-me-in-rpc')
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex flex-col items-center gap-2 mb-1">
            <img
              src="/images/tcc-logo.png"
              alt="Talisay City College"
              className="size-12 rounded-full object-cover ring-2 ring-sky-200 shadow-md"
            />
            <div className="flex size-10 items-center justify-center rounded-xl bg-sky-50 text-sky-600 ring-4 ring-sky-50/50">
              {unlocked ? <ShieldCheck className="size-5 text-emerald-600" /> : <Lock className="size-5" />}
            </div>
          </div>
          <DialogTitle className="text-center text-lg font-bold text-slate-900">
            {unlocked ? 'Administrator Session Active' : 'Administrator Authorization'}
          </DialogTitle>
          <DialogDescription className="text-center text-xs text-slate-500">
            {unlocked
              ? 'You have active administrative privileges to modify concerns and facility records.'
              : 'Enter the administrator passphrase to unlock write actions and condition editing.'}
          </DialogDescription>
        </DialogHeader>

        {unlocked ? (
          <div className="space-y-4 py-2">
            <div className="rounded-xl border border-emerald-200 bg-emerald-50/80 p-4 text-emerald-950">
              <div className="flex items-center gap-2 font-medium">
                <ShieldCheck className="size-5 text-emerald-600" />
                <span>Privileges Verified</span>
              </div>
              <p className="mt-1 text-xs text-emerald-700">
                Session passphrase is active in memory. Remember to lock admin when you step away from this device.
              </p>
            </div>

            <DialogFooter className="sm:justify-between">
              <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>
                Done
              </Button>
              <Button variant="destructive" size="sm" onClick={handleLock} className="gap-2">
                <Lock className="size-3.5" />
                Lock Admin Session
              </Button>
            </DialogFooter>
          </div>
        ) : (
          <form onSubmit={handleUnlock} className="space-y-4 py-2">
            <div className="space-y-2">
              <label htmlFor="modal-passphrase" className="text-xs font-semibold text-slate-700">
                Admin Passphrase
              </label>
              <div className="relative">
                <Input
                  id="modal-passphrase"
                  type={showPassword ? 'text' : 'password'}
                  value={input}
                  onChange={(e) => {
                    setInput(e.target.value)
                    if (error) setError(null)
                  }}
                  placeholder="Enter passphrase…"
                  className="pr-10"
                  autoFocus
                  autoComplete="off"
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
              {error && <p className="text-xs font-medium text-red-600">{error}</p>}
            </div>

            <div className="flex items-center justify-between rounded-lg bg-slate-50 p-2.5 text-xs text-slate-500">
              <span>Demo environment key:</span>
              <button
                type="button"
                onClick={useDemoKey}
                className="inline-flex items-center gap-1 font-semibold text-sky-600 hover:text-sky-700 hover:underline"
              >
                <KeyRound className="size-3" />
                Autofill demo key
              </button>
            </div>

            <DialogFooter className="gap-2 sm:justify-end">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={!input.trim()} className="gap-2 bg-sky-600 hover:bg-sky-700">
                <Unlock className="size-3.5" />
                Unlock Admin
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  )
}
