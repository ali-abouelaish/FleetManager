'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Label } from '@/components/ui/Label'
import { Select } from '@/components/ui/Select'
import { FileText, Upload, X, Edit2, Trash2, Download } from 'lucide-react'
import { formatDate } from '@/lib/utils'

interface Document {
  id: number
  file_name: string | null
  file_type: string | null
  file_path: string | null
  file_url: string | null
  doc_type: string | null
  uploaded_at: string
  uploaded_by: number | null
}

interface CertificateType {
  key: string
  name: string
  expiryField: string
}

const CERTIFICATE_TYPES: CertificateType[] = [
  { key: 'registration_expiry_date', name: 'Vehicle Registration Certificate', expiryField: 'registration_expiry_date' },
  { key: 'plate_expiry_date', name: 'Vehicle Registration/Plate Certificate', expiryField: 'plate_expiry_date' },
  { key: 'insurance_expiry_date', name: 'Vehicle Insurance Certificate', expiryField: 'insurance_expiry_date' },
  { key: 'mot_date', name: 'MOT Certificate', expiryField: 'mot_date' },
  { key: 'tax_date', name: 'Vehicle Tax Certificate', expiryField: 'tax_date' },
  { key: 'loler_expiry_date', name: 'LOLER Certificate', expiryField: 'loler_expiry_date' },
  { key: 'first_aid_expiry', name: 'First Aid Kit Certificate', expiryField: 'first_aid_expiry' },
  { key: 'fire_extinguisher_expiry', name: 'Fire Extinguisher Certificate', expiryField: 'fire_extinguisher_expiry' },
]

export default function VehicleComplianceDocuments({ vehicleId }: { vehicleId: number }) {
  const supabase = createClient()
  const [documents, setDocuments] = useState<Document[]>([])
  const [vehicle, setVehicle] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [editingDoc, setEditingDoc] = useState<Document | null>(null)
  const [showUpload, setShowUpload] = useState(false)
  const [selectedCertificateType, setSelectedCertificateType] = useState('')
  const [files, setFiles] = useState<FileList | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [editingDocType, setEditingDocType] = useState('')

  useEffect(() => {
    loadVehicle()
    loadDocuments()
  }, [vehicleId])

  const loadVehicle = async () => {
    const { data } = await supabase
      .from('vehicles')
      .select('*')
      .eq('id', vehicleId)
      .single()
    if (data) {
      setVehicle(data)
    }
  }

  const loadDocuments = async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('documents')
      .select('id, file_name, file_type, file_path, file_url, doc_type, uploaded_at, uploaded_by')
      .eq('vehicle_id', vehicleId)
      .order('uploaded_at', { ascending: false })

    if (error) {
      console.error('Error fetching vehicle documents', error)
      setDocuments([])
    } else {
      setDocuments(data || [])
    }
    setLoading(false)
  }

  const getDocumentsByType = (certType: string) => {
    return documents.filter(doc => doc.doc_type === certType)
  }

  const getPublicUrl = (path: string | null, fallback: string | null) => {
    if (fallback) return fallback
    if (!path) return null
    const { data } = supabase.storage.from('VEHICLE_DOCUMENTS').getPublicUrl(path)
    return data.publicUrl
  }

  const handleUpload = async () => {
    if (!files || files.length === 0) {
      setError('Please select at least one file.')
      return
    }
    if (!selectedCertificateType) {
      setError('Please select a certificate type.')
      return
    }
    setError(null)
    setUploading(true)
    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i]
        const ext = file.name.split('.').pop() || 'bin'
        const ts = Date.now()
        const rand = Math.random().toString(36).slice(2, 8)
        const storagePath = `vehicles/${vehicleId}/${selectedCertificateType}/${ts}_${rand}.${ext}`

        const { error: uploadErr } = await supabase.storage
          .from('VEHICLE_DOCUMENTS')
          .upload(storagePath, file, { cacheControl: '3600', upsert: false })
        if (uploadErr) throw uploadErr

        const { data: { publicUrl } } = supabase.storage
          .from('VEHICLE_DOCUMENTS')
          .getPublicUrl(storagePath)

        const { error: docErr } = await supabase.from('documents').insert({
          vehicle_id: vehicleId,
          file_name: file.name,
          file_type: file.type,
          file_path: storagePath,
          file_url: publicUrl,
          doc_type: selectedCertificateType,
          uploaded_by: null,
        })
        if (docErr) throw docErr
      }
      setFiles(null)
      setSelectedCertificateType('')
      setShowUpload(false)
      loadDocuments()
    } catch (err: any) {
      console.error('Upload failed', err)
      setError(err.message || 'Upload failed')
    } finally {
      setUploading(false)
    }
  }

  const handleEditDocType = async (docId: number, newDocType: string) => {
    try {
      const { error } = await supabase
        .from('documents')
        .update({ doc_type: newDocType || null })
        .eq('id', docId)

      if (error) throw error
      setEditingDoc(null)
      setEditingDocType('')
      loadDocuments()
    } catch (err: any) {
      console.error('Update failed', err)
      setError(err.message || 'Update failed')
    }
  }

  const handleDelete = async (docId: number) => {
    if (!confirm('Are you sure you want to delete this document?')) return

    try {
      const doc = documents.find(d => d.id === docId)
      if (doc?.file_path) {
        const { error: deleteErr } = await supabase.storage
          .from('VEHICLE_DOCUMENTS')
          .remove([doc.file_path])
        if (deleteErr) console.error('Storage delete error', deleteErr)
      }

      const { error } = await supabase
        .from('documents')
        .delete()
        .eq('id', docId)

      if (error) throw error
      loadDocuments()
    } catch (err: any) {
      console.error('Delete failed', err)
      setError(err.message || 'Delete failed')
    }
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="bg-navy text-white">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center space-x-2">
              <FileText className="h-5 w-5" />
              <span>Compliance Documents</span>
            </CardTitle>
            <Button size="sm" variant="secondary" onClick={() => setShowUpload(!showUpload)}>
              {showUpload ? 'Cancel' : 'Upload Document'}
            </Button>
          </div>
        </CardHeader>
        <CardContent className="pt-6 space-y-6">
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <p className="text-sm text-red-800">{error}</p>
            </div>
          )}

          {showUpload && (
            <div className="space-y-3 border rounded-lg p-4 bg-gray-50">
              <h3 className="font-semibold text-gray-900">Upload New Document</h3>
              <div className="grid gap-3 md:grid-cols-2">
                <div className="space-y-1">
                  <Label htmlFor="certType">Certificate Type *</Label>
                  <Select
                    id="certType"
                    value={selectedCertificateType}
                    onChange={(e) => setSelectedCertificateType(e.target.value)}
                  >
                    <option value="">Select certificate type...</option>
                    {CERTIFICATE_TYPES.map(cert => (
                      <option key={cert.key} value={cert.key}>
                        {cert.name}
                      </option>
                    ))}
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label>Files *</Label>
                  <Input
                    type="file"
                    multiple
                    accept="image/*,application/pdf"
                    onChange={(e) => setFiles(e.target.files)}
                  />
                </div>
              </div>
              <div className="flex space-x-2">
                <Button onClick={handleUpload} disabled={uploading}>
                  <Upload className="h-4 w-4 mr-2" />
                  {uploading ? 'Uploading...' : 'Upload'}
                </Button>
                <Button
                  variant="ghost"
                  onClick={() => {
                    setShowUpload(false)
                    setError(null)
                    setFiles(null)
                    setSelectedCertificateType('')
                  }}
                >
                  <X className="h-4 w-4 mr-2" />
                  Cancel
                </Button>
              </div>
            </div>
          )}

          {loading ? (
            <div className="text-center py-8 text-sm text-gray-600">Loading documents...</div>
          ) : (
            <div className="space-y-6">
              {CERTIFICATE_TYPES.map(cert => {
                const certDocs = getDocumentsByType(cert.key)
                return (
                  <div key={cert.key} className="border rounded-lg p-4">
                    <div className="flex items-center justify-between mb-3">
                      <div>
                        <h4 className="font-semibold text-gray-900">{cert.name}</h4>
                        {vehicle && vehicle[cert.expiryField] && (
                          <p className="text-sm text-gray-600">
                            Expiry: {formatDate(vehicle[cert.expiryField])}
                          </p>
                        )}
                      </div>
                      <span className="text-sm text-gray-500">
                        {certDocs.length} document{certDocs.length !== 1 ? 's' : ''}
                      </span>
                    </div>
                    {certDocs.length === 0 ? (
                      <p className="text-sm text-gray-500 italic">No documents uploaded</p>
                    ) : (
                      <div className="space-y-2">
                        {certDocs.map(doc => {
                          const url = getPublicUrl(doc.file_path, doc.file_url)
                          return (
                            <div
                              key={doc.id}
                              className="flex items-center justify-between p-2 bg-gray-50 rounded border"
                            >
                              <div className="flex items-center space-x-3 flex-1 min-w-0">
                                <FileText className="h-4 w-4 text-gray-400 flex-shrink-0" />
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm font-medium text-gray-900 truncate">
                                    {doc.file_name || 'File'}
                                  </p>
                                  <p className="text-xs text-gray-500">
                                    {new Date(doc.uploaded_at).toLocaleString()}
                                  </p>
                                </div>
                              </div>
                              <div className="flex items-center space-x-2 flex-shrink-0">
                                {editingDoc?.id === doc.id ? (
                                  <>
                                    <Select
                                      value={editingDocType}
                                      onChange={(e) => setEditingDocType(e.target.value)}
                                      className="text-xs"
                                    >
                                      <option value="">None</option>
                                      {CERTIFICATE_TYPES.map(c => (
                                        <option key={c.key} value={c.key}>
                                          {c.name}
                                        </option>
                                      ))}
                                    </Select>
                                    <Button
                                      size="sm"
                                      variant="secondary"
                                      onClick={() => handleEditDocType(doc.id, editingDocType)}
                                    >
                                      Save
                                    </Button>
                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      onClick={() => {
                                        setEditingDoc(null)
                                        setEditingDocType('')
                                      }}
                                    >
                                      Cancel
                                    </Button>
                                  </>
                                ) : (
                                  <>
                                    {url && (
                                      <a
                                        href={url}
                                        target="_blank"
                                        rel="noreferrer"
                                        className="text-blue-600 hover:text-blue-800"
                                        title="View/Download"
                                      >
                                        <Download className="h-4 w-4" />
                                      </a>
                                    )}
                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      onClick={() => {
                                        setEditingDoc(doc)
                                        setEditingDocType(doc.doc_type || '')
                                      }}
                                      title="Edit document type"
                                    >
                                      <Edit2 className="h-4 w-4" />
                                    </Button>
                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      onClick={() => handleDelete(doc.id)}
                                      title="Delete"
                                      className="text-red-600 hover:text-red-800"
                                    >
                                      <Trash2 className="h-4 w-4" />
                                    </Button>
                                  </>
                                )}
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

