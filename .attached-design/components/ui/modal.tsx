'use client'

import * as React from 'react'
import { X } from 'lucide-react'
import { cn } from '@/lib/utils'

interface ModalProps {
  open: boolean
  onClose: () => void
  title: string
  description?: string
  children: React.ReactNode
  footer?: React.ReactNode
  className?: string
}

/** Native <dialog> gives us focus trapping, Esc handling and top-layer rendering for free. */
export function Modal({ open, onClose, title, description, children, footer, className }: ModalProps) {
  const ref = React.useRef<HTMLDialogElement>(null)
  const titleId = React.useId()
  const descId = React.useId()

  React.useEffect(() => {
    const dialog = ref.current
    if (!dialog) return
    if (open && !dialog.open) dialog.showModal()
    if (!open && dialog.open) dialog.close()
  }, [open])

  return (
    <dialog
      ref={ref}
      onClose={onClose}
      onClick={(e) => {
        if (e.target === ref.current) onClose()
      }}
      aria-labelledby={titleId}
      aria-describedby={description ? descId : undefined}
      className={cn(
        'm-auto w-[calc(100%-2rem)] max-w-lg rounded-2xl border border-border bg-card p-0 text-foreground shadow-[var(--shadow-pop)] open:animate-in open:fade-in-0 open:zoom-in-95',
        className,
      )}
    >
      <div className="flex items-start justify-between gap-4 px-5 pt-5">
        <div>
          <h2 id={titleId} className="text-base font-semibold tracking-[-0.01em]">
            {title}
          </h2>
          {description && (
            <p id={descId} className="mt-1 text-sm text-muted-foreground">
              {description}
            </p>
          )}
        </div>
        <button
          type="button"
          onClick={onClose}
          className="-mr-1.5 -mt-1 flex size-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
          aria-label="Close dialog"
        >
          <X className="size-4" />
        </button>
      </div>
      <div className="px-5 py-5">{children}</div>
      {footer && (
        <div className="flex flex-col-reverse gap-2 border-t border-border bg-muted/40 px-5 py-3.5 sm:flex-row sm:justify-end">
          {footer}
        </div>
      )}
    </dialog>
  )
}
