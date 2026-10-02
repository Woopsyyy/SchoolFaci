import { useEffect, useState } from 'react'
import { ArrowUp } from 'lucide-react'
import { Button } from '@/components/ui/button'

export function BackToTop() {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    function handleScroll() {
      if (window.scrollY > 300) {
        setVisible(true)
      } else {
        setVisible(false)
      }
    }
    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  function scrollToTop() {
    window.scrollTo({
      top: 0,
      behavior: 'smooth',
    })
  }

  if (!visible) return null

  return (
    <div className="no-print fixed bottom-6 right-6 z-40 animate-fade-in-scale">
      <Button
        variant="outline"
        size="icon"
        onClick={scrollToTop}
        className="size-10 rounded-full border-slate-200 bg-white/90 shadow-lg backdrop-blur-md hover:bg-sky-50 hover:text-sky-600 hover:border-sky-300 transition-all hover:-translate-y-1"
        aria-label="Scroll back to top"
      >
        <ArrowUp className="size-4" />
      </Button>
    </div>
  )
}
