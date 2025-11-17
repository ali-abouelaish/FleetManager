import { DriverDetailClient } from './DriverDetailClient'

export default async function DriverDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  return <DriverDetailClient id={id} />
}
