'use client'

import * as React from 'react'
import { RefreshCw } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { formatINR, RENEWAL_FEE } from '@/lib/pricing'

export function RenewButton({ title }: { title: string }) {
  const [state, setState] = React.useState<'idle' | 'loading' | 'done'>('idle')

  if (state === 'done') {
    return <span className="text-xs font-medium text-success">Renewed · new due date sent to your email</span>
  }

  return (
    <Button
      variant="secondary"
      size="xs"
      loading={state === 'loading'}
      onClick={() => {
        setState('loading')
        setTimeout(() => {
          setState('done')
          toast.success('Borrowing renewed', {
            description: `${title} · ${formatINR(RENEWAL_FEE)} renewal fee charged to wallet`,
          })
        }, 900)
      }}
    >
      {state === 'idle' && <RefreshCw aria-hidden="true" />}
      Renew · {formatINR(RENEWAL_FEE)}
    </Button>
  )
}
