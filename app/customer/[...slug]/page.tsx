import { ModulePlaceholder } from '@/components/shell/module-placeholder'

export default async function CustomerModulePage({ params }: { params: Promise<{ slug: string[] }> }) {
  const { slug } = await params
  return <ModulePlaceholder role="customer" slug={slug} />
}
