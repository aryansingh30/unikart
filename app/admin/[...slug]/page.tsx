import { AdminConsole } from '@/components/admin/admin-console'

export default async function AdminModulePage({ params }: { params: Promise<{ slug: string[] }> }) {
  const { slug } = await params
  return <AdminConsole slug={slug} />
}
