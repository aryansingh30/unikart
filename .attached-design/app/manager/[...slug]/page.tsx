import { ModulePlaceholder } from '@/components/shell/module-placeholder'

export default async function ManagerModulePage({ params }: { params: Promise<{ slug: string[] }> }) {
  const { slug } = await params
  return <ModulePlaceholder role="manager" slug={slug} />
}
