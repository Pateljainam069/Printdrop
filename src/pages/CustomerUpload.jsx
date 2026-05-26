import React, { useState, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'

const CustomerUpload = () => {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const [file, setFile] = useState(null)
  const [jobCode, setJobCode] = useState(null)
  const [loading, setLoading] = useState(false)
  const [deferredPrompt, setDeferredPrompt] = useState(null)
  const [isInstalled, setIsInstalled] = useState(false)
  const [formData, setFormData] = useState({
    copies: 1,
    colorMode: 'black_white',
    paperSize: 'A4',
    sides: 'single',
    orientation: 'portrait',
    specialInstructions: '',
    customerName: '',
    customerPhone: '',
  })

  useEffect(() => {
    // Register Service Worker
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').catch(err => console.error('SW registration failed:', err))
    }

    // Handle PWA Install Prompt
    const handleBeforeInstallPrompt = (e) => {
      e.preventDefault()
      setDeferredPrompt(e)
    }

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt)

    // Check if already installed
    if (window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true) {
      setIsInstalled(true)
    }

    // Check for shared file
    if (searchParams.get('shared') === 'true') {
      const getSharedFile = async () => {
        try {
          const cache = await caches.open('shared-file')
          const response = await cache.match('shared-file')
          if (response) {
            const blob = await response.blob()
            const sharedFile = new File([blob], "shared_document", { type: blob.type })
            setFile(sharedFile)
            await cache.delete('shared-file')
          }
        } catch (error) {
          console.error('Error retrieving shared file:', error)
        }
      }
      getSharedFile()
    }

    return () => window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
  }, [searchParams])

  const handleInstallClick = async () => {
    if (!deferredPrompt) return
    deferredPrompt.prompt()
    const { outcome } = await deferredPrompt.userChoice
    if (outcome === 'accepted') {
      setDeferredPrompt(null)
      setIsInstalled(true)
    }
  }

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0]
    if (selectedFile) {
      setFile(selectedFile)
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    
    if (!file) {
      alert('Please select a file to print')
      return
    }

    if (!formData.customerName.trim()) {
      alert('Please enter your name')
      return
    }

    setLoading(true)

    const uploadData = new FormData()
    uploadData.append('file', file)
    uploadData.append('copies', formData.copies)
    uploadData.append('color_mode', formData.colorMode)
    uploadData.append('paper_size', formData.paperSize)
    uploadData.append('sides', formData.sides)
    uploadData.append('orientation', formData.orientation)
    uploadData.append('special_instructions', formData.specialInstructions)
    uploadData.append('customer_name', formData.customerName)
    uploadData.append('customer_phone', formData.customerPhone)

    try {
      const apiUrl = import.meta.env.VITE_API_URL || 'https://printdrop-server.onrender.com/upload'
      const res = await fetch(apiUrl, {
        method: 'POST',
        body: uploadData,
      })

      if (!res.ok) {
        const text = await res.text();
        console.error('Server error:', text);
        alert('Upload failed. Check console for details.');
        return;
        }

      const data = await res.json()
      setJobCode(data.job_code)
      navigate(`/track/${data.job_code}`)
    } catch (error) {
      console.error('Error:', error)
      alert('Failed to submit job. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const updateFormData = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  const shopName = import.meta.env.VITE_SHOP_NAME || 'PrintDrop'

  return (
    <div className="max-w-md mx-auto p-4 pb-24">
      <header className="text-center mb-8">
        <h1 className="text-3xl text-brand-navy mb-1">{shopName}</h1>
        <p className="text-slate-500 mb-4">Upload your document to print</p>
        
        <div className="flex flex-col gap-3 items-center">
          {deferredPrompt && !isInstalled && (
            <button
              type="button"
              onClick={handleInstallClick}
              className="inline-flex items-center gap-2 px-6 py-2 bg-brand-navy text-white rounded-full text-sm font-bold shadow-lg animate-bounce"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              Install App to Share from WhatsApp
            </button>
          )}
        </div>
      </header>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* File Upload Zone */}
        <div className="relative border-2 border-dashed border-slate-300 rounded-2xl p-8 text-center bg-white hover:border-brand-green transition-colors">
          <input
            type="file"
            onChange={handleFileChange}
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
            accept=".pdf,.jpg,.jpeg,.png,.doc,.docx,application/pdf,image/jpeg,image/png,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
          />
          <div className="flex flex-col items-center">
            <div className="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center mb-3">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
              </svg>
            </div>
            <p className="font-medium text-slate-700">
              {file ? file.name : 'Tap to select document'}
            </p>
            {file && (
              <p className="text-xs text-slate-400 mt-1">
                {(file.size / (1024 * 1024)).toFixed(2)} MB
              </p>
            )}
          </div>
        </div>

        {/* Print Settings */}
        <div className="space-y-4 bg-white p-4 rounded-2xl shadow-sm border border-slate-100">
          <h2 className="text-lg font-display mb-2">Print Settings</h2>
          
          <div className="flex items-center justify-between">
            <label className="text-sm font-medium">Copies</label>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => updateFormData('copies', Math.max(1, formData.copies - 1))}
                className="w-10 h-10 rounded-full border border-slate-200 flex items-center justify-center hover:bg-slate-50 touch-target"
              >
                -
              </button>
              <span className="w-8 text-center font-bold">{formData.copies}</span>
              <button
                type="button"
                onClick={() => updateFormData('copies', formData.copies + 1)}
                className="w-10 h-10 rounded-full border border-slate-200 flex items-center justify-center hover:bg-slate-50 touch-target"
              >
                +
              </button>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Color Mode</label>
            <div className="grid grid-cols-2 gap-2">
              {['black_white', 'color'].map(mode => (
                <button
                  key={mode}
                  type="button"
                  onClick={() => updateFormData('colorMode', mode)}
                  className={`py-3 px-4 rounded-xl text-sm font-medium transition-all touch-target ${
                    formData.colorMode === mode 
                      ? 'bg-brand-navy text-white shadow-lg' 
                      : 'bg-slate-50 text-slate-600 border border-slate-100'
                  }`}
                >
                  {mode === 'black_white' ? 'Black & White' : 'Color'}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Paper Size</label>
            <div className="grid grid-cols-3 gap-2">
              {['A4', 'A3', 'Letter'].map(size => (
                <button
                  key={size}
                  type="button"
                  onClick={() => updateFormData('paperSize', size)}
                  className={`py-3 px-2 rounded-xl text-sm font-medium transition-all touch-target ${
                    formData.paperSize === size 
                      ? 'bg-brand-navy text-white' 
                      : 'bg-slate-50 text-slate-600 border border-slate-100'
                  }`}
                >
                  {size}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Sides</label>
            <div className="grid grid-cols-2 gap-2">
              {['single', 'double'].map(side => (
                <button
                  key={side}
                  type="button"
                  onClick={() => updateFormData('sides', side)}
                  className={`py-3 px-4 rounded-xl text-sm font-medium transition-all touch-target ${
                    formData.sides === side 
                      ? 'bg-brand-navy text-white' 
                      : 'bg-slate-50 text-slate-600 border border-slate-100'
                  }`}
                >
                  {side === 'single' ? 'Single Sided' : 'Double Sided'}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Orientation</label>
            <div className="grid grid-cols-2 gap-2">
              {['portrait', 'landscape'].map(orient => (
                <button
                  key={orient}
                  type="button"
                  onClick={() => updateFormData('orientation', orient)}
                  className={`py-3 px-4 rounded-xl text-sm font-medium transition-all touch-target ${
                    formData.orientation === orient 
                      ? 'bg-brand-navy text-white' 
                      : 'bg-slate-50 text-slate-600 border border-slate-100'
                  }`}
                >
                  {orient.charAt(0).toUpperCase() + orient.slice(1)}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Special Instructions (Optional)</label>
            <textarea
              value={formData.specialInstructions}
              onChange={(e) => updateFormData('specialInstructions', e.target.value)}
              placeholder="e.g. Print only pages 1-5"
              className="w-full p-4 bg-slate-50 rounded-xl text-sm border border-slate-100 focus:outline-none focus:ring-2 focus:ring-brand-green/20"
              rows={3}
            />
          </div>
        </div>

        {/* Customer Info */}
        <div className="space-y-4 bg-white p-4 rounded-2xl shadow-sm border border-slate-100">
          <h2 className="text-lg font-display mb-2">Your Info</h2>
          <div className="space-y-3">
            <input
              type="text"
              required
              value={formData.customerName}
              onChange={(e) => updateFormData('customerName', e.target.value)}
              placeholder="Your Name *"
              className="w-full p-4 bg-slate-50 rounded-xl text-sm border border-slate-100 focus:outline-none focus:ring-2 focus:ring-brand-green/20"
            />
            <input
              type="tel"
              value={formData.customerPhone}
              onChange={(e) => updateFormData('customerPhone', e.target.value)}
              placeholder="Phone Number (10 digits)"
              className="w-full p-4 bg-slate-50 rounded-xl text-sm border border-slate-100 focus:outline-none focus:ring-2 focus:ring-brand-green/20"
            />
          </div>
        </div>

        {/* Fixed Submit Button */}
        <div className="fixed bottom-0 left-0 right-0 p-4 bg-white/80 backdrop-blur-md border-t border-slate-100 max-w-md mx-auto z-10">
          <button
            type="submit"
            disabled={loading || !file}
            className={`w-full py-4 rounded-2xl font-bold text-lg shadow-xl transition-all touch-target ${
              loading || !file 
                ? 'bg-slate-200 text-slate-400 cursor-not-allowed' 
                : 'bg-brand-green text-white hover:bg-green-600 active:scale-[0.98]'
            }`}
          >
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Uploading...
              </span>
            ) : 'Send to Print Shop'}
          </button>
        </div>
      </form>
    </div>
  )
}

export default CustomerUpload
