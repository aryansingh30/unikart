import type { Metadata } from 'next'
import { CatalogView } from '@/components/customer/catalog/catalog-view'
import { PageHeader } from '@/components/ui/primitives'
import { books, listingToBook, type Book } from '@/lib/data'

export const metadata: Metadata = { title: 'Explore books' }

async function getLiveListings(): Promise<Book[]> {
  try {
    const res = await fetch('http://localhost:8088/api/v1/catalog/listings', {
      cache: 'no-store',
    })
    if (res.ok) {
      const json = await res.json()
      if (json && Array.isArray(json.data) && json.data.length > 0) {
        return json.data.map(listingToBook)
      }
    }
  } catch (err) {
    // fallback if service temporarily unreachable
  }
  return books
}

export default async function CatalogPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const { q } = await searchParams
  const initialBooks = await getLiveListings()

  return (
    <>
      <PageHeader
        title="Explore books"
        description="Textbooks, lecture notes and exam prep from every Unikart store. Your campus offers pickup; other campuses deliver to you."
        breadcrumbs={[{ label: 'Customer Portal', href: '/customer' }, { label: 'Explore Books' }]}
      />
      <CatalogView key={q ?? ''} initialQuery={q ?? ''} initialBooks={initialBooks} />
    </>
  )
}
