import { Toaster as Sonner, type ToasterProps } from "sonner"
import { CircleCheckIcon, InfoIcon, TriangleAlertIcon, OctagonXIcon, Loader2Icon } from "lucide-react"

const Toaster = ({ ...props }: ToasterProps) => {
  return (
    <Sonner
      position="bottom-right"
      richColors
      closeButton
      icons={{
        success: <CircleCheckIcon className="size-4.5 text-emerald-500" />,
        info: <InfoIcon className="size-4.5 text-sky-500" />,
        warning: <TriangleAlertIcon className="size-4.5 text-amber-500" />,
        error: <OctagonXIcon className="size-4.5 text-red-500" />,
        loading: <Loader2Icon className="size-4.5 animate-spin text-sky-600" />,
      }}
      toastOptions={{
        className: 'rounded-xl border shadow-lg font-sans text-xs sm:text-sm',
      }}
      style={
        {
          "--normal-bg": "#ffffff",
          "--normal-text": "#0f172a",
          "--normal-border": "#e2e8f0",
          "--border-radius": "0.75rem",
        } as React.CSSProperties
      }
      {...props}
    />
  )
}

export { Toaster }