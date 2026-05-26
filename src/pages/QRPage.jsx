import React from 'react'
import { QRCodeSVG } from 'qrcode.react'

const QRPage = () => {
  const shopName = import.meta.env.VITE_SHOP_NAME || 'PrintDrop'
  const appUrl = window.location.origin

  return (
    <div className="min-h-screen bg-white flex flex-col items-center justify-center p-8 text-center">
      <div className="max-w-sm w-full border-4 border-brand-navy p-12 rounded-[3rem] space-y-8 shadow-2xl print:border-none print:shadow-none print:p-0">
        <header>
          <h1 className="text-4xl font-display text-brand-navy mb-2">{shopName}</h1>
          <p className="text-slate-500 font-medium">Scan to Print Your Documents</p>
        </header>

        <div className="bg-white p-6 rounded-3xl inline-block border-2 border-slate-100 print:border-none">
          <QRCodeSVG 
            value={appUrl} 
            size={240}
            level="H"
            includeMargin={true}
          />
        </div>

        <div className="space-y-4">
          <p className="text-lg font-bold text-slate-800">
            {appUrl.replace('https://', '').replace('http://', '')}
          </p>
          <div className="flex justify-center gap-4 text-slate-400">
            <span className="flex items-center gap-1">📸 Camera</span>
            <span className="flex items-center gap-1">⬆️ Upload</span>
            <span className="flex items-center gap-1">🖨️ Print</span>
          </div>
        </div>

        <footer className="pt-8 border-t border-slate-100 print:hidden">
          <button 
            onClick={() => window.print()}
            className="w-full py-4 bg-brand-navy text-white rounded-2xl font-bold hover:bg-slate-800 transition-all touch-target"
          >
            Print QR Poster
          </button>
        </footer>
      </div>
      
      <p className="mt-8 text-slate-400 text-sm print:hidden">
        Place this QR code at your shop counter.
      </p>
    </div>
  )
}

export default QRPage
