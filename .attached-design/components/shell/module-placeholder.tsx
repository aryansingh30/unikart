import Link from 'next/link'
import { notFound } from 'next/navigation'
import { Layers } from 'lucide-react'
import { buttonVariants } from '@/components/ui/button'
import { EmptyState, PageHeader } from '@/components/ui/primitives'
import { roleConfigs, type Role } from '@/lib/navigation'

export function ModulePlaceholder({ role, slug }: { role: Role; slug: string[] }) {
  const config = roleConfigs[role]
  const href = `${config.home}/${slug.join('/')}`
  const item = config.groups.flatMap((g) => g.items).find((i) => i.href === href)
  if (!item) notFound()

  return (
    <>
      <PageHeader
        title={item.label}
        breadcrumbs={[{ label: config.label, href: config.home }, { label: item.label }]}
      />
      <div className="rounded-xl border border-dashed border-border-strong bg-card">
        <EmptyState
          icon={Layers}
          title={`${item.label} is in the next design pass`}
          description="The navigation, layout and design system for this module are in place. Detailed screens ship in the next deliverable."
          action={
            <Link href={config.home} className={buttonVariants({ variant: 'secondary' })}>
              Back to {config.groups[0].items[0].label.toLowerCase()}
            </Link>
          }
        />
      </div>
    </>
  )
}
