import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import CustomerUpload from './pages/CustomerUpload'
import TrackJob from './pages/TrackJob'
import OwnerDashboard from './pages/OwnerDashboard'
import QRPage from './pages/QRPage'

function App() {
  return (
    <Router>
      <div className="min-h-screen bg-brand-white text-brand-navy">
        <Routes>
          <Route path="/" element={<CustomerUpload />} />
          <Route path="/track/:jobCode" element={<TrackJob />} />
          <Route path="/owner" element={<OwnerDashboard />} />
          <Route path="/qr" element={<QRPage />} />
        </Routes>
      </div>
    </Router>
  )
}

export default App
