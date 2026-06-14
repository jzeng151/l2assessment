import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom'
import Navigation from './components/Navigation'
import HomePage from './pages/HomePage'
import AnalyzePage from './pages/AnalyzePage'
import HistoryPage from './pages/HistoryPage'
import DashboardPage from './pages/DashboardPage'

function App() {
  return (
    <Router>
      <div className="min-h-screen bg-gray-50">
        <Navigation />
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/analyze" element={<AnalyzePage />} />
          <Route path="/history" element={<HistoryPage />} />
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="*" element={
            <div className="min-h-[60vh] flex items-center justify-center px-4">
              <div className="text-center">
                <div className="text-5xl mb-4">🔍</div>
                <h1 className="text-2xl font-bold text-gray-900 mb-2">Page not found</h1>
                <p className="text-gray-600 mb-4">The page you're looking for doesn't exist.</p>
                <Link to="/" className="text-blue-600 hover:underline font-semibold">← Back to home</Link>
              </div>
            </div>
          } />
        </Routes>
      </div>
    </Router>
  )
}

export default App
