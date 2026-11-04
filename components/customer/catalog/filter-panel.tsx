'use client'

import * as React from 'react'
import { Checkbox } from '@/components/ui/field'
import { CONDITIONS, currentCustomer, getInstitution, resolveInstitutionId, stores, type Condition } from '@/lib/data'
import { useAuth } from '@/lib/auth-context'
import { cn } from '@/lib/utils'

export type ModeFilter = 'all' | 'buy' | 'borrow'

export interface Filters {
  mode: ModeFilter
  stores: string[]
  conditions: Condition[]
  minPrice: string
  maxPrice: string
  inStockOnly: boolean
}

export const defaultFilters: Filters = {
  mode: 'all',
  stores: [],
  conditions: [],
  minPrice: '',
  maxPrice: '',
  inStockOnly: false,
}

const PRICE_PRESETS = [
  { label: 'Under ₹500', min: '', max: '500' },
  { label: '₹500 – ₹1,000', min: '500', max: '1000' },
  { label: 'Over ₹1,000', min: '1000', max: '' },
]

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <fieldset className="border-b border-border py-5 first:pt-0 last:border-b-0">
      <legend className="mb-3 text-[13px] font-semibold text-foreground">{title}</legend>
      {children}
    </fieldset>
  )
}

const toggle = <T,>(list: T[], value: T) => (list.includes(value) ? list.filter((v) => v !== value) : [...list, value])

export function FilterPanel({
  filters,
  onChange,
  counts,
}: {
  filters: Filters
  onChange: (next: Filters) => void
  counts: { stores: Record<string, number>; conditions: Record<string, number> }
}) {
  const { user } = useAuth()
  const [cachedInst, setCachedInst] = React.useState<string>('')

  React.useEffect(() => {
    try {
      const s = localStorage.getItem('unikart_session')
      if (s) {
        const parsed = JSON.parse(s)
        if (parsed.institutionId) setCachedInst(parsed.institutionId)
      }
    } catch {}
  }, [])

  const userInstitutionId = (
    resolveInstitutionId({
      id: user?.institutionId,
      name: user?.contextTitle,
      email: user?.email,
    }) ||
    resolveInstitutionId({ id: cachedInst, email: user?.email }) ||
    user?.institutionId ||
    cachedInst ||
    ''
  ).toLowerCase()
  const set = <K extends keyof Filters>(key: K, value: Filters[K]) => onChange({ ...filters, [key]: value })

  return (
    <div>
      <Section title="Availability">
        <div role="radiogroup" aria-label="Buy or borrow" className="grid grid-cols-3 rounded-[10px] bg-muted p-0.5">
          {(['all', 'buy', 'borrow'] as const).map((m) => (
            <button
              key={m}
              type="button"
              role="radio"
              aria-checked={filters.mode === m}
              onClick={() => set('mode', m)}
              className={cn(
                'h-8 rounded-lg text-[13px] font-medium capitalize transition-[background-color,color,box-shadow]',
                filters.mode === m
                  ? 'bg-card text-foreground shadow-[var(--shadow-card)]'
                  : 'text-muted-foreground hover:text-foreground',
              )}
            >
              {m === 'all' ? 'All' : m}
            </button>
          ))}
        </div>
        <label className="mt-3.5 flex cursor-pointer items-center justify-between gap-3 text-[13px] text-foreground">
          In stock only
          <span className="relative inline-flex">
            <input
              type="checkbox"
              role="switch"
              checked={filters.inStockOnly}
              onChange={(e) => set('inStockOnly', e.target.checked)}
              className="peer sr-only"
            />
            <span className="h-5 w-9 rounded-full bg-border-strong transition-colors peer-checked:bg-primary peer-focus-visible:ring-2 peer-focus-visible:ring-ring peer-focus-visible:ring-offset-2" />
            <span className="absolute left-0.5 top-0.5 size-4 rounded-full bg-white shadow-sm transition-transform peer-checked:translate-x-4" />
          </span>
        </label>
      </Section>

      <Section title="Institution & store">
        <ul className="flex flex-col gap-2.5">
          {stores.map((store) => {
            const inst = getInstitution(store.institutionId)
            const home = Boolean(
              userInstitutionId && (
                store.institutionId.toLowerCase() === userInstitutionId ||
                (userInstitutionId === 'iiita' && (store.id === 'st-iiita' || store.institutionId === 'iiita')) ||
                (userInstitutionId === 'mnnit' && (store.id === 'st-mnnit' || store.institutionId === 'mnnit')) ||
                (userInstitutionId === 'iitbhu' && (store.id === 'st-iitbhu' || store.institutionId === 'iitbhu')) ||
                (userInstitutionId === 'allduniv' && (store.id === 'st-allduniv' || store.institutionId === 'allduniv'))
              )
            )
            return (
              <li key={store.id}>
                <label className="flex cursor-pointer items-start gap-2.5">
                  <Checkbox
                    checked={filters.stores.includes(store.id)}
                    onChange={() => set('stores', toggle(filters.stores, store.id))}
                    className="mt-0.5"
                  />
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center gap-1.5 text-[13px] text-foreground">
                      <span className="truncate">{inst.shortName}</span>
                      {home && (
                        <span className="rounded bg-primary-soft px-1 text-[10.5px] font-medium leading-4 text-primary-soft-foreground">
                          Your campus
                        </span>
                      )}
                    </span>
                    <span className="block text-xs text-muted-foreground">
                      {home ? 'Pickup or delivery' : 'Delivery only'}
                    </span>
                  </span>
                  <span className="text-xs text-muted-foreground tabular">{counts.stores[store.id] ?? 0}</span>
                </label>
              </li>
            )
          })}
        </ul>
      </Section>

      <Section title="Price">
        <div className="flex items-center gap-2">
          <label className="relative flex-1">
            <span className="sr-only">Minimum price</span>
            <span className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-[13px] text-muted-foreground">₹</span>
            <input
              inputMode="numeric"
              placeholder="Min"
              value={filters.minPrice}
              onChange={(e) => set('minPrice', e.target.value.replace(/\D/g, ''))}
              className="h-9 w-full rounded-[10px] border border-input bg-card pl-6 pr-2 text-[13px] tabular shadow-[var(--shadow-xs)] focus:border-primary focus:outline-none focus:ring-[3px] focus:ring-primary/15"
            />
          </label>
          <span className="text-muted-foreground" aria-hidden="true">–</span>
          <label className="relative flex-1">
            <span className="sr-only">Maximum price</span>
            <span className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-[13px] text-muted-foreground">₹</span>
            <input
              inputMode="numeric"
              placeholder="Max"
              value={filters.maxPrice}
              onChange={(e) => set('maxPrice', e.target.value.replace(/\D/g, ''))}
              className="h-9 w-full rounded-[10px] border border-input bg-card pl-6 pr-2 text-[13px] tabular shadow-[var(--shadow-xs)] focus:border-primary focus:outline-none focus:ring-[3px] focus:ring-primary/15"
            />
          </label>
        </div>
        <div className="mt-2.5 flex flex-wrap gap-1.5">
          {PRICE_PRESETS.map((p) => {
            const active = filters.minPrice === p.min && filters.maxPrice === p.max
            return (
              <button
                key={p.label}
                type="button"
                aria-pressed={active}
                onClick={() => onChange({ ...filters, minPrice: active ? '' : p.min, maxPrice: active ? '' : p.max })}
                className={cn(
                  'h-7 rounded-lg border px-2.5 text-xs font-medium transition-colors',
                  active
                    ? 'border-primary/30 bg-primary-soft text-primary-soft-foreground'
                    : 'border-border bg-card text-muted-foreground hover:border-border-strong hover:text-foreground',
                )}
              >
                {p.label}
              </button>
            )
          })}
        </div>
        <p className="mt-2.5 text-xs text-muted-foreground">Based on item value (purchase price).</p>
      </Section>

      <Section title="Condition">
        <ul className="flex flex-col gap-2.5">
          {CONDITIONS.map((c) => (
            <li key={c}>
              <label className="flex cursor-pointer items-center gap-2.5 text-[13px] text-foreground">
                <Checkbox checked={filters.conditions.includes(c)} onChange={() => set('conditions', toggle(filters.conditions, c))} />
                <span className="flex-1">{c}</span>
                <span className="text-xs text-muted-foreground tabular">{counts.conditions[c] ?? 0}</span>
              </label>
            </li>
          ))}
        </ul>
      </Section>
    </div>
  )
}
