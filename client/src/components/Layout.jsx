import Navbar from './Navbar'

export default function Layout({ children }) {
  return (
    <div className="app-layout">
      <Navbar />
      <main className="page-content">
        {children}
      </main>
    </div>
  )
}
