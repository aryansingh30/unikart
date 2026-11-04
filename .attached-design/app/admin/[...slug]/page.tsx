import { ModulePlaceholder } from '@/components/shell/module-placeholder'

export default async function AdminModulePage({ params }: { params: Promise<{ slug: string[] }> }) {
  const { slug } = await params
  return <ModulePlaceholder role="admin" slug={slug} />
}
