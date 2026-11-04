'use client'

import * as React from 'react'
import { SearchX, Search, SlidersHorizontal, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Select } from '@/components/ui/field'
import { Modal } from '@/components/ui/modal'
import { EmptyState, Kbd } from '@/components/ui/primitives'
import { books, CATEGORIES, getInstitution, getStore, type Book } from '@/lib/data'
import { cn } from '@/lib/utils'
import { BookCard } from '../book-card'
import { BorrowDialog } from '../borrow-dialog'
import { defaultFilters, FilterPanel, type Filters } from './filter-panel'

type Sort = 'relevance' | 'newest' | 'price-asc' | 'price-desc'

function matchesQuery(book: Book, q: string) {
  if (!q) return true
  const haystack = [book.title, book.author, book.isbn, book.category, ...book.courses].join(' ').toLowerCase()
  return q
    .toLowerCase()
    .split(/\s+/)
    .every((term) => haystack.includes(term))
}

function applyFilters(list: Book[], f: Filters) {
  const min = f.minPrice ? Number(f.minPrice) : 0
  const max = f.maxPrice ? Number(f.maxPrice) : Infinity
  return list.filter(
    (b) =>
      (f.mode === 'all' || (f.mode === 'buy' ? b.listingType !== 'borrow' : b.listingType !== 'buy')) &&
      (f.stores.length === 0 || f.stores.includes(b.storeId)) &&
      (f.conditions.length === 0 || f.conditions.includes(b.condition)) &&
      b.value >= min &&
      b.value <= max &&
      (!f.inStockOnly || b.available > 0),
  )
}

export function CatalogView({ initialQuery = '' }: { initialQuery?: string }) {
  const [query, setQuery] = React.useState(initialQuery)
  const [category, setCategory] = React.useState<string>('All')
  const [filters, setFilters] = React.useState<Filters>(defaultFilters)
  const [sort, setSort] = React.useState<Sort>('relevance')
  const [mobileFiltersOpen, setMobileFiltersOpen] = React.useState(false)
  const [borrowing, setBorrowing] = React.useState<Book | null>(null)
  const searchRef = React.useRef<HTMLInputElement>(null)
  const deferredQuery = React.useDeferredValue(query.trim())

  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement
      if (e.key === '/' && !['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName)) {
        e.preventDefault()
        searchRef.current?.focus()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  const searched = React.useMemo(() => books.filter((b) => matchesQuery(b, deferredQuery)), [deferredQuery])
  const inCategory = React.useMemo(
    () => (category === 'All' ? searched : searched.filter((b) => b.category === category)),
    [searched, category],
  )

  const counts = React.useMemo(() => {
    const storesCount: Record<string, number> = {}
    const conditionsCount: Record<string, number> = {}
    for (const b of inCategory) {
      storesCount[b.storeId] = (storesCount[b.storeId] ?? 0) + 1
      conditionsCount[b.condition] = (conditionsCount[b.condition] ?? 0) + 1
    }
    return { stores: storesCount, conditions: conditionsCount }
  }, [inCategory])

  const results = React.useMemo(() => {
    const list = applyFilters(inCategory, filters)
    switch (sort) {
      case 'newest':
        return [...list].sort((a, b) => a.addedDaysAgo - b.addedDaysAgo)
      case 'price-asc':
        return [...list].sort((a, b) => a.value - b.value)
      case 'price-desc':
        return [...list].sort((a, b) => b.value - a.value)
      default:
        return list
    }
  }, [inCategory, filters, sort])

  const categoryCounts = React.useMemo(() => {
    const c: Record<string, number> = { All: searched.length }
    for (const b of searched) c[b.category] = (c[b.category] ?? 0) + 1
    return c
  }, [searched])

  const activeChips: { key: string; label: string; remove: () => void }[] = [
    ...(filters.mode !== 'all'
      ? [{ key: 'mode', label: filters.mode === 'buy' ? 'Available to buy' : 'Available to borrow', remove: () => setFilters((f) => ({ ...f, mode: 'all' as const })) }]
      : []),
    ...filters.stores.map((id) => ({
      key: id,
      label: getInstitution(getStore(id).institutionId).shortName,
      remove: () => setFilters((f) => ({ ...f, stores: f.stores.filter((s) => s !== id) })),
    })),
    ...filters.conditions.map((c) => ({
      key: c,
      label: c,
      remove: () => setFilters((f) => ({ ...f, conditions: f.conditions.filter((x) => x !== c) })),
    })),
    ...(filters.minPrice || filters.maxPrice
      ? [{
          key: 'price',
          label: `₹${filters.minPrice || '0'} – ${filters.maxPrice ? `₹${filters.maxPrice}` : 'any'}`,
          remove: () => setFilters((f) => ({ ...f, minPrice: '', maxPrice: '' })),
        }]
      : []),
    ...(filters.inStockOnly ? [{ key: 'stock', label: 'In stock', remove: () => setFilters((f) => ({ ...f, inStockOnly: false })) }] : []),
  ]

  const resetAll = () => {
    setFilters(defaultFilters)
    setCategory('All')
    setQuery('')
  }

  return (
    <>
      <div className="relative">
        <label htmlFor="catalog-search" className="sr-only">
          Search the catalogue
        </label>
        <Search className="pointer-events-none absolute left-4 top-1/2 size-5 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
        <input
          ref={searchRef}
          id="catalog-search"
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search by title, author, ISBN or course code"
          className="h-12 w-full rounded-xl border border-input bg-card pl-12 pr-12 text-[15px] text-foreground shadow-[var(--shadow-card)] transition-[border-color,box-shadow] placeholder:text-muted-foreground/80 hover:border-border-strong focus:border-primary focus:outline-none focus:ring-4 focus:ring-primary/10 sm:h-14 sm:text-base"
        />
        {query ? (
          <button
            type="button"
            onClick={() => {
              setQuery('')
              searchRef.current?.focus()
            }}
            className="absolute right-3 top-1/2 flex size-8 -translate-y-1/2 items-center justify-center rounded-lg text-muted-foreground hover:bg-accent hover:text-foreground"
            aria-label="Clear search"
          >
            <X className="size-4" />
          </button>
        ) : (
          <Kbd className="absolute right-4 top-1/2 hidden -translate-y-1/2 sm:inline-flex">/</Kbd>
        )}
      </div>

      <div className="-mx-4 mt-4 overflow-x-auto px-4 scrollbar-none sm:-mx-6 sm:px-6 lg:mx-0 lg:px-0">
        <div role="tablist" aria-label="Categories" className="flex w-max gap-1.5">
          {['All', ...CATEGORIES].map((c) => {
            const active = category === c
            return (
              <button
                key={c}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => setCategory(c)}
                className={cn(
                  'flex h-8 items-center gap-1.5 rounded-full border px-3 text-[13px] font-medium transition-colors',
                  active
                    ? 'border-foreground bg-foreground text-background'
                    : 'border-border bg-card text-muted-foreground hover:border-border-strong hover:text-foreground',
                )}
              >
                {c}
                <span className={cn('text-xs tabular', active ? 'text-background/60' : 'text-muted-foreground/70')}>
                  {categoryCounts[c] ?? 0}
                </span>
              </button>
            )
          })}
        </div>
      </div>

      <div className="mt-6 flex gap-8">
        <aside className="hidden w-60 shrink-0 lg:block" aria-label="Filters">
          <div className="sticky top-20">
            <div className="mb-5 flex items-center justify-between">
              <h2 className="text-sm font-semibold">Filters</h2>
              {activeChips.length > 0 && (
                <button type="button" onClick={() => setFilters(defaultFilters)} className="text-[13px] text-primary hover:underline">
                  Reset
                </button>
              )}
            </div>
            <FilterPanel filters={filters} onChange={setFilters} counts={counts} />
          </div>
        </aside>

        <section className="min-w-0 flex-1" aria-labelledby="results-heading">
          <div className="flex flex-wrap items-center gap-2">
            <h2 id="results-heading" className="mr-auto text-[13px] text-muted-foreground" aria-live="polite">
              <span className="font-medium text-foreground tabular">{results.length}</span>{' '}
              {results.length === 1 ? 'title' : 'titles'}
              {deferredQuery && (
                <>
                  {' '}for <span className="font-medium text-foreground">“{deferredQuery}”</span>
                </>
              )}
            </h2>
            <Button variant="secondary" size="sm" className="lg:hidden" onClick={() => setMobileFiltersOpen(true)}>
              <SlidersHorizontal aria-hidden="true" />
              Filters
              {activeChips.length > 0 && (
                <span className="rounded bg-primary px-1 text-[11px] text-primary-foreground tabular">{activeChips.length}</span>
              )}
            </Button>
            <label className="flex items-center gap-2">
              <span className="sr-only">Sort by</span>
              <Select value={sort} onChange={(e) => setSort(e.target.value as Sort)} className="h-8 w-40 text-[13px]">
                <option value="relevance">Most relevant</option>
                <option value="newest">Recently added</option>
                <option value="price-asc">Price: low to high</option>
                <option value="price-desc">Price: high to low</option>
              </Select>
            </label>
          </div>

          {activeChips.length > 0 && (
            <ul className="mt-3 flex flex-wrap gap-1.5" aria-label="Active filters">
              {activeChips.map((chip) => (
                <li key={chip.key}>
                  <button
                    type="button"
                    onClick={chip.remove}
                    className="flex h-7 items-center gap-1 rounded-lg border border-border bg-card pl-2.5 pr-1.5 text-xs font-medium text-foreground transition-colors hover:border-border-strong"
                    aria-label={`Remove filter ${chip.label}`}
                  >
                    {chip.label}
                    <X className="size-3.5 text-muted-foreground" aria-hidden="true" />
                  </button>
                </li>
              ))}
              <li>
                <button type="button" onClick={() => setFilters(defaultFilters)} className="h-7 px-1.5 text-xs font-medium text-muted-foreground hover:text-foreground">
                  Clear all
                </button>
              </li>
            </ul>
          )}

          {results.length === 0 ? (
            <div className="mt-5 rounded-xl border border-dashed border-border-strong bg-card">
              <EmptyState
                icon={SearchX}
                title="No titles match these filters"
                description="Try a broader search, remove a filter, or include stores at other institutions — they deliver to your address."
                action={
                  <Button variant="secondary" onClick={resetAll}>
                    Reset search & filters
                  </Button>
                }
              />
            </div>
          ) : (
            <ul className="mt-5 grid grid-cols-2 gap-2.5 sm:gap-4 md:grid-cols-3 xl:grid-cols-4">
              {results.map((book) => (
                <li key={book.id} className="flex">
                  <div className="flex w-full flex-col [&>article]:flex-1">
                    <BookCard book={book} onBorrow={setBorrowing} />
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      <Modal
        open={mobileFiltersOpen}
        onClose={() => setMobileFiltersOpen(false)}
        title="Filters"
        className="mb-0 max-h-[85dvh] w-full max-w-none rounded-b-none sm:mb-auto sm:max-w-md sm:rounded-b-2xl"
        footer={
          <>
            <Button variant="secondary" onClick={() => setFilters(defaultFilters)}>
              Reset
            </Button>
            <Button onClick={() => setMobileFiltersOpen(false)}>Show {results.length} titles</Button>
          </>
        }
      >
        <FilterPanel filters={filters} onChange={setFilters} counts={counts} />
      </Modal>

      <BorrowDialog book={borrowing} onClose={() => setBorrowing(null)} />
    </>
  )
}
