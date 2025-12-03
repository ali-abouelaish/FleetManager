'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/Button'
import { Plus, X } from 'lucide-react'
import AddParentContactForm from './AddParentContactForm'

interface AddParentContactSectionProps {
  passengerId: number
}

export default function AddParentContactSection({ passengerId }: AddParentContactSectionProps) {
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
              Add Parent Contact
            </>
          )}
        </Button>
      </div>

      {showForm && (
        <AddParentContactForm 
          passengerId={passengerId} 
          onSuccess={() => setShowForm(false)}
          onCancel={() => setShowForm(false)}
        />
      )}
    </>
  )
}

