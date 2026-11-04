import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { getBook, listingToBook } from '@/lib/data'
import { BookDetail } from '@/components/customer/book-detail'

type Props = { params: Promise<{ id: string }> }

async function resolveBook(id: string) {
  try {
    const res = await fetch(`http://localhost:8088/api/v1/catalog/listings/${id}`, {
      cache: 'no-store',
    })
    if (res.ok) {
      const json = await res.json()
      if (json?.data) {
        return listingToBook(json.data)
      }
    }
  } catch {
    // fallback to local
  }
  return getBook(id)
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params
  const book = await resolveBook(id)
  if (!book) return { title: 'Book not found' }
  return { title: book.title }
}

export default async function BookDetailPage({ params }: Props) {
  const { id } = await params
  const book = await resolveBook(id)
  if (!book) notFound()
  return <BookDetail book={book} />
}
