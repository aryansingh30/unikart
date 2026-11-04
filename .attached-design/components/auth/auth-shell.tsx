import Image from 'next/image'
import Link from 'next/link'
import { BookOpen, ShieldCheck } from 'lucide-react'
import { Logo } from '@/components/brand/logo'

export function AuthShell({
  children,
  topLink,
}: {
  children: React.ReactNode
  topLink?: { prompt: string; label: string; href: string }
}) {
  return (
    <div className="grid min-h-dvh bg-card lg:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)]">
      <div className="flex min-h-dvh flex-col px-5 py-5 sm:px-10 sm:py-7">
        <header className="flex items-center justify-between gap-4">
          <Link href="/login" className="rounded-md" aria-label="Unikart home">
            <Logo />
          </Link>
          {topLink && (
            <p className="text-[13px] text-muted-foreground">
              <span className="hidden sm:inline">{topLink.prompt} </span>
              <Link href={topLink.href} className="font-medium text-foreground underline-offset-4 hover:underline">
                {topLink.label}
              </Link>
            </p>
          )}
        </header>

        <main className="flex flex-1 items-center justify-center py-10">
          <div className="w-full max-w-[400px]">{children}</div>
        </main>

        <footer className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 text-xs text-muted-foreground">
          <span>© 2026 Unikart Campus Commerce Pvt. Ltd.</span>
          <nav aria-label="Legal" className="flex gap-4">
            <Link href="#" className="hover:text-foreground">Privacy</Link>
            <Link href="#" className="hover:text-foreground">Terms</Link>
            <Link href="/design-system" className="hover:text-foreground">Design system</Link>
          </nav>
        </footer>
      </div>

      <aside className="relative hidden p-3 lg:block" aria-label="About Unikart">
        <div className="relative h-full overflow-hidden rounded-2xl bg-muted">
          <Image
            src="/images/campus-store.png"
            alt="Interior of a Unikart campus bookstore with wooden shelves of textbooks"
            fill
            priority
            sizes="55vw"
            className="object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/10 to-black/0" aria-hidden="true" />

          <div className="absolute left-6 top-6 flex items-center gap-2 rounded-full border border-white/20 bg-black/25 px-3 py-1.5 text-xs font-medium text-white backdrop-blur-md">
            <span className="size-1.5 rounded-full bg-[oklch(0.8_0.15_155)]" aria-hidden="true" />
            Unikart · MNNIT — open until 7:00 PM
          </div>

          <div className="absolute right-6 top-20 w-[300px] rounded-2xl border border-white/60 bg-white/90 p-4 shadow-[var(--shadow-pop)] backdrop-blur-xl xl:right-10">
            <div className="flex gap-3">
              <div className="relative h-[68px] w-[51px] shrink-0 overflow-hidden rounded-[4px] shadow-[var(--shadow-book)]">
                <Image src="/covers/algorithms.png" alt="" fill sizes="51px" className="object-cover" />
              </div>
              <div className="min-w-0">
                <p className="flex items-center gap-1 text-[11px] font-medium uppercase tracking-[0.05em] text-primary">
                  <BookOpen className="size-3" aria-hidden="true" />
                  Borrow · 14 days
                </p>
                <p className="mt-1 truncate text-sm font-medium text-foreground">Introduction to Algorithms</p>
                <p className="text-xs text-muted-foreground">Like New · Central Library</p>
              </div>
            </div>
            <dl className="mt-3.5 space-y-1.5 border-t border-border pt-3 text-[13px]">
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Borrow fee</dt>
                <dd className="font-medium tabular">₹116</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Refundable deposit</dt>
                <dd className="font-medium tabular">₹725</dd>
              </div>
            </dl>
            <p className="mt-3 flex items-center gap-1.5 rounded-lg bg-success-soft px-2.5 py-1.5 text-xs font-medium text-success">
              <ShieldCheck className="size-3.5" aria-hidden="true" />
              Deposit returns to your wallet after inspection
            </p>
          </div>

          <div className="absolute inset-x-0 bottom-0 p-8 xl:p-10">
            <p className="max-w-md text-balance text-[28px] font-semibold leading-[1.15] tracking-[-0.025em] text-white xl:text-[32px]">
              Every textbook on campus. Buy it, borrow it, or sell it back.
            </p>
            <dl className="mt-6 flex gap-8 text-white">
              {[
                ['4', 'Partner campuses'],
                ['38k', 'Titles in stock'],
                ['₹1.2 Cr', 'Saved by students'],
              ].map(([value, label]) => (
                <div key={label}>
                  <dd className="text-lg font-semibold tabular">{value}</dd>
                  <dt className="text-xs text-white/70">{label}</dt>
                </div>
              ))}
            </dl>
          </div>
        </div>
      </aside>
    </div>
  )
}

export function AuthHeading({ title, description }: { title: string; description: React.ReactNode }) {
  return (
    <div className="mb-7">
      <h1 className="text-[26px] font-semibold leading-8 tracking-[-0.025em] text-foreground">{title}</h1>
      <p className="mt-2 text-pretty text-sm leading-6 text-muted-foreground">{description}</p>
    </div>
  )
}
