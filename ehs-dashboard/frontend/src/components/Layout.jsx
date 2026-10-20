import Sidebar from './Sidebar'
import TopHeader from './TopHeader'
import ScrollPageNavigator from './ScrollPageNavigator'

export default function Layout({ children }) {
  return (
    <div className="flex min-h-screen bg-[#F5F7FA]">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0">
        <TopHeader />
        <main className="flex-1 p-4 md:p-8 max-w-[1600px] mx-auto w-full space-y-6">
          {children}
        </main>
        <footer className="border-t border-slate-200/80 py-4 px-6 md:px-8 text-center text-xs text-slate-400 font-medium">
          Greenko Kurnool Cluster EHS Dashboard &bull; Developed by <strong className="text-slate-600 font-semibold">Roshith</strong>
        </footer>
        <ScrollPageNavigator />
      </div>
    </div>
  )
}
