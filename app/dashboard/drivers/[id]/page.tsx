import { DriverDetailClient } from './DriverDetailClient'

export default async function DriverDetailPage({
  params,
}: {
  params: { id: string }
}) {
  return <DriverDetailClient id={params.id} />
}
