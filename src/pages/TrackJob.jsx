import React, { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'

const TrackJob = () => {
  const { jobCode } = useParams()
  const [job, setJob] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    fetchJob()

    // Subscribe to real-time changes for this specific job
    const channel = supabase
      .channel(`track_${jobCode}`)
      .on('postgres_changes', 
        { event: 'UPDATE', schema: 'public', table: 'print_jobs', filter: `job_code=eq.${jobCode}` }, 
        (payload) => {
          setJob(payload.new)
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [jobCode])

  const fetchJob = async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('print_jobs')
      .select('*')
      .eq('job_code', jobCode)
      .single()

    if (error) {
      setError('Job not found or error fetching details')
      console.error(error)
    } else {
      setJob(data)
    }
    setLoading(false)
  }

  const getStatusDisplay = (status) => {
    switch (status) {
      case 'pending':
        return { label: 'PENDING ⏳', color: 'bg-amber-100 text-amber-700 border-amber-200' }
      case 'printing':
        return { label: 'PRINTING 🖨️', color: 'bg-blue-100 text-blue-700 border-blue-200 animate-pulse' }
      case 'printed_stored':
        return { label: 'DONE ✅ (Stored)', color: 'bg-green-100 text-green-700 border-green-200' }
      case 'printed_deleted':
        return { label: 'DONE ✅ (Deleted)', color: 'bg-green-100 text-green-700 border-green-200' }
      default:
        return { label: 'UNKNOWN', color: 'bg-slate-100 text-slate-700 border-slate-200' }
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-navy"></div>
      </div>
    )
  }

  if (error || !job) {
    return (
      <div className="max-w-md mx-auto p-8 text-center">
        <h2 className="text-2xl font-display mb-4">Oops!</h2>
        <p className="text-slate-500 mb-8">{error}</p>
        <Link to="/" className="inline-block py-4 px-8 bg-brand-navy text-white rounded-2xl font-bold touch-target">
          Back to Upload
        </Link>
      </div>
    )
  }

  const status = getStatusDisplay(job.status)

  return (
    <div className="max-w-md mx-auto p-4 animate-in fade-in duration-500">
      <Link to="/" className="inline-flex items-center gap-2 text-slate-500 mb-8 hover:text-brand-navy touch-target">
        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
          <path fillRule="evenodd" d="M9.707 16.707a1 1 0 01-1.414 0l-6-6a1 1 0 010-1.414l6-6a1 1 0 011.414 1.414L5.414 9H17a1 1 0 110 2H5.414l4.293 4.293a1 1 0 010 1.414z" clipRule="evenodd" />
        </svg>
        Back to Upload
      </Link>

      <div className="bg-white rounded-3xl p-8 shadow-xl border border-slate-100 text-center mb-6">
        <div className="inline-block px-4 py-1 bg-slate-100 rounded-full text-xs font-bold tracking-widest text-slate-500 mb-4">
          JOB CODE: {job.job_code}
        </div>
        
        <div className={`py-4 px-6 rounded-2xl border-2 mb-8 text-lg font-bold ${status.color}`}>
          {status.label}
        </div>

        <div className="text-left space-y-4">
          <div>
            <span className="text-xs font-bold text-slate-400 block uppercase tracking-wider">File Name</span>
            <span className="font-medium text-slate-700 break-all">{job.file_name}</span>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <span className="text-xs font-bold text-slate-400 block uppercase tracking-wider">Submitted</span>
              <span className="text-sm text-slate-600">{new Date(job.created_at).toLocaleTimeString()}</span>
            </div>
            <div>
              <span className="text-xs font-bold text-slate-400 block uppercase tracking-wider">Copies</span>
              <span className="text-sm font-bold text-slate-900">{job.copies}</span>
            </div>
          </div>

          <div className="pt-4 border-t border-slate-50">
            <span className="text-xs font-bold text-slate-400 block uppercase tracking-wider mb-2">Print Settings</span>
            <div className="flex flex-wrap gap-2">
              {[
                job.color_mode === 'color' ? 'Color' : 'B&W',
                job.paper_size,
                job.sides === 'single' ? 'Single-sided' : 'Double-sided',
                job.orientation
              ].map(tag => (
                <span key={tag} className="px-3 py-1 bg-slate-50 text-slate-600 rounded-lg text-xs font-medium">
                  {tag}
                </span>
              ))}
            </div>
          </div>

          {job.status === 'printed_stored' && (
            <div className="mt-6 p-4 bg-green-50 rounded-2xl flex items-center gap-3 border border-green-100">
              <span className="text-2xl">🗂️</span>
              <div>
                <p className="text-sm font-bold text-green-800">Stored by Shop</p>
                <p className="text-xs text-green-600">Your digital copy is saved in our records.</p>
              </div>
            </div>
          )}

          {job.status === 'printed_deleted' && (
            <div className="mt-6 p-4 bg-slate-50 rounded-2xl flex items-center gap-3 border border-slate-100">
              <span className="text-2xl">🗑️</span>
              <div>
                <p className="text-sm font-bold text-slate-700">Deleted after Printing</p>
                <p className="text-xs text-slate-500">Document removed from our server for your privacy.</p>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="text-center p-4">
        <button 
          onClick={() => window.print()}
          className="text-sm text-slate-400 hover:text-brand-navy underline"
        >
          Print this tracking page
        </button>
      </div>
    </div>
  )
}

export default TrackJob
