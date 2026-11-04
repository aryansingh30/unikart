import { ManagerConsole } from '@/components/manager/manager-console'

export default async function ManagerModulePage({ params }: { params: Promise<{ slug: string[] }> }) {
  const { slug } = await params
  return <ManagerConsole slug={slug} />
}
