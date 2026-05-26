import React, { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

const OwnerDashboard = () => {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const [error, setError] = useState('')
  const [jobs, setJobs] = useState([])
  const [filter, setFilter] = useState('pending') // 'pending', 'printing', 'completed'
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Check initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        setIsLoggedIn(true)
        fetchJobs()
      }
    })
  }, [])

  useEffect(() => {
    if (!isLoggedIn) return

    const channel = supabase
      .channel('print_jobs_changes')
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'print_jobs' }, 
        (payload) => {
          if (payload.eventType === 'INSERT') {
            setJobs(prev => [payload.new, ...prev])
            playNotificationSound()
          } else if (payload.eventType === 'UPDATE') {
            setJobs(prev => prev.map(job => job.id === payload.new.id ? payload.new : job))
          } else if (payload.eventType === 'DELETE') {
            setJobs(prev => prev.filter(job => job.id === payload.old.id))
          }
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [isLoggedIn])

  const fetchJobs = async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('print_jobs')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) console.error('Error fetching jobs:', error)
    else setJobs(data)
    setLoading(false)
  }

  const handleLogin = async (e) => {
    e.preventDefault()
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) {
      setError('Wrong email or password')
    } else {
      setIsLoggedIn(true)
      fetchJobs()
    }
  }

  const playNotificationSound = () => {
    const audio = new Audio('https://assets.mixkit.co/sfx/preview/mixkit-software-interface-start-2574.mp3')
    audio.volume = 0.5
    audio.play().catch(e => console.log('Audio play failed:', e))
  }

  const updateJobStatus = async (id, newStatus, filePath = null) => {
    const { error } = await supabase
      .from('print_jobs')
      .update({ status: newStatus })
      .eq('id', id)

    if (error) alert('Failed to update status')
    
    if (newStatus === 'printed_deleted' && filePath) {
      await supabase.storage.from('print-files').remove([filePath])
    }
  }

  const handlePrint = async (job) => {
    try {
      setLoading(true)
      // 1. Download raw data from Supabase
      const { data, error } = await supabase.storage
        .from('print-files')
        .download(job.file_path);

      if (error) throw error;

      // 2. Determine file extension and type
      const fileName = job.file_name.toLowerCase();
      const isPdf = fileName.endsWith('.pdf') || job.file_type === 'application/pdf';
      const isImage = ['.jpg', '.jpeg', '.png', '.webp', '.svg', '.gif'].some(ext => fileName.endsWith(ext)) || job.file_type?.startsWith('image/');

      // 3. Create a blob with a specific type if we know it, otherwise use the data as is
      let blob;
      if (isPdf) {
        blob = new Blob([data], { type: 'application/pdf' });
      } else if (isImage) {
        // Try to guess image type from extension or use generic image/
        const ext = fileName.split('.').pop();
        blob = new Blob([data], { type: `image/${ext === 'jpg' ? 'jpeg' : ext}` });
      } else {
        blob = new Blob([data], { type: job.file_type || 'application/octet-stream' });
      }

      const blobUrl = URL.createObjectURL(blob);
      
      if (isPdf || isImage) {
        // Open in new tab for PDFs and Images
        // We use a small timeout to ensure the browser handles the blob URL correctly
        const newTab = window.open();
        if (newTab) {
          newTab.location.href = blobUrl;
        } else {
          // Fallback if popup is blocked
          window.location.href = blobUrl;
        }
      } else {
        // Force download for Word, Excel, etc.
        const link = document.createElement('a');
        link.href = blobUrl;
        link.download = job.file_name;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      }
    } catch (e) {
      console.error('Print error:', e);
      window.open(job.file_url, '_blank');
    } finally {
      setLoading(false)
    }
  }

  const filteredJobs = jobs.filter(job => {
    if (filter === 'pending') return job.status === 'pending'
    if (filter === 'printing') return job.status === 'printing'
    if (filter === 'completed') return ['printed_stored', 'printed_deleted'].includes(job.status)
    return true
  })

  if (!isLoggedIn) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6 bg-slate-900">
        <div className="w-full max-w-sm space-y-4 bg-white p-8 rounded-3xl shadow-2xl">
          <h1 className="text-2xl font-bold text-center text-slate-900">Owner Login</h1>
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full p-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-navy/50"
          />
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full p-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-navy/50"
          />
          {error && <p className="text-red-500 text-sm text-center">{error}</p>}
          <button
            onClick={handleLogin}
            className="w-full p-3 bg-brand-navy text-white rounded-lg font-bold hover:bg-slate-800 transition-all touch-target"
          >
            Login
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-brand-navy text-white p-6 sticky top-0 z-10 shadow-lg">
        <div className="max-w-5xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-display flex items-center gap-2">
              PrintDrop Dashboard
              <span className="inline-block w-2 h-2 bg-brand-green rounded-full animate-pulse"></span>
            </h1>
            <p className="text-slate-400 text-sm">
              {jobs.filter(j => j.status === 'pending').length} pending jobs
            </p>
          </div>
          <div className="flex bg-slate-800 p-1 rounded-xl">
            {['pending', 'printing', 'completed'].map(t => (
              <button
                key={t}
                onClick={() => setFilter(t)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  filter === t ? 'bg-white text-brand-navy shadow-sm' : 'text-slate-400'
                }`}
              >
                {t.charAt(0).toUpperCase() + t.slice(1)}
              </button>
            ))}
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto p-4 md:p-6">
        {loading ? (
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-navy"></div>
          </div>
        ) : filteredJobs.length === 0 ? (
          <div className="text-center py-20 text-slate-400">
            <p className="text-lg">No {filter} jobs found.</p>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-1">
            {filteredJobs.map(job => (
              <div key={job.id} className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100 flex flex-col lg:flex-row gap-6">
                <div className="flex-1">
                  <div className="flex items-start justify-between mb-2">
                    <span className="text-xs font-bold tracking-wider text-slate-400 uppercase">Job {job.job_code}</span>
                    <span className="text-xs text-slate-400">{new Date(job.created_at).toLocaleTimeString()}</span>
                  </div>
                  
                  <h3 className="text-xl font-bold mb-1 truncate">{job.file_name}</h3>
                  <p className="text-sm text-slate-500 mb-4">
                    {job.customer_name || 'Guest'} • {job.customer_phone || 'No phone'}
                  </p>

                  <div className="grid grid-cols-2 md:grid-cols-3 gap-y-3 gap-x-4 p-4 bg-slate-50 rounded-xl text-sm border border-slate-100">
                    <div><span className="text-slate-400 block text-xs">Copies</span><span className="font-bold">{job.copies}</span></div>
                    <div><span className="text-slate-400 block text-xs">Color</span><span className="font-bold">{job.color_mode === 'color' ? 'Color' : 'B&W'}</span></div>
                    <div><span className="text-slate-400 block text-xs">Size</span><span className="font-bold">{job.paper_size}</span></div>
                    <div><span className="text-slate-400 block text-xs">Sides</span><span className="font-bold">{job.sides === 'single' ? 'Single' : 'Double'}</span></div>
                    <div><span className="text-slate-400 block text-xs">Orientation</span><span className="font-bold">{job.orientation}</span></div>
                  </div>

                  {job.special_instructions && (
                    <div className="mt-4 p-3 bg-amber-50 border border-amber-100 rounded-lg text-sm italic text-amber-800">
                      " {job.special_instructions} "
                    </div>
                  )}
                </div>

                <div className="flex flex-col sm:flex-row lg:flex-col gap-2 min-w-[200px]">
                  <button
                    onClick={() => handlePrint(job)}
                    className="flex-1 lg:flex-none py-3 px-4 bg-slate-100 text-slate-700 rounded-xl font-bold text-center hover:bg-slate-200 transition-colors touch-target"
                  >
                    View & Print
                  </button>
                  
                  {job.status === 'pending' && (
                    <button
                      onClick={() => updateJobStatus(job.id, 'printing')}
                      className="flex-1 lg:flex-none py-3 px-4 bg-brand-navy text-white rounded-xl font-bold hover:bg-slate-800 transition-colors touch-target"
                    >
                      Start Printing
                    </button>
                  )}

                  {job.status === 'printing' && (
                    <>
                      <button
                        onClick={() => updateJobStatus(job.id, 'printed_stored')}
                        className="flex-1 lg:flex-none py-3 px-4 bg-brand-green text-white rounded-xl font-bold hover:bg-green-600 transition-colors touch-target"
                      >
                        Done & Save
                      </button>
                      <button
                        onClick={() => updateJobStatus(job.id, 'printed_deleted', job.file_path)}
                        className="flex-1 lg:flex-none py-3 px-4 bg-red-500 text-white rounded-xl font-bold hover:bg-red-600 transition-colors touch-target"
                      >
                        Done & Delete
                      </button>
                    </>
                  )}

                  {['printed_stored', 'printed_deleted'].includes(job.status) && (
                    <div className={`py-3 px-4 rounded-xl text-center font-bold text-sm ${
                      job.status === 'printed_stored' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                    }`}>
                      {job.status === 'printed_stored' ? '✅ Printed & Stored' : '🗑️ Printed & Deleted'}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  )
}

export default OwnerDashboard
