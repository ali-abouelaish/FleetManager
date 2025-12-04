'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/Button'
import { Plus, X } from 'lucide-react'
import AddIncidentForm from './AddIncidentForm'

interface AddIncidentSectionProps {
  passengerId: number
  passengerRouteId: number | null
}

export default function AddIncidentSection({
  passengerId,
  passengerRouteId,
}: AddIncidentSectionProps) {
  const [showForm, setShowForm] = useState(false)

  return (
    <>
      <div className="flex justify-end mb-4">
        <Button
          size="sm"
          onClick={() => setShowForm(!showForm)}
          variant={showForm ? 'secondary' : 'primary'}
        >
          {showForm ? (
            <>
              <X className="mr-2 h-4 w-4" />
              Cancel
            </>
          ) : (
            <>
              <Plus className="mr-2 h-4 w-4" />
              Add Incident
            </>
          )}
        </Button>
      </div>

      {showForm && (
        <AddIncidentForm
          passengerId={passengerId}
          passengerRouteId={passengerRouteId}
          onSuccess={() => setShowForm(false)}
          onCancel={() => setShowForm(false)}
        />
      )}
    </>
  )
}

