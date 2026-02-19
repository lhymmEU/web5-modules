import { Outlet } from 'react-router-dom'
import { SidebarProvider, SidebarInset } from '@/components/ui/sidebar'
import { AppSidebar } from '@/components/layout/AppSidebar'
import { Header } from '@/components/layout/Header'
import { Toaster } from '@/components/ui/sonner'

export function Layout() {
  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <Header />
        <main className="flex-1 overflow-auto">
          <div className="max-w-5xl h-full align-start p-6">
            <Outlet />
          </div>
        </main>
      </SidebarInset>
      <Toaster richColors position="bottom-right" />
    </SidebarProvider>
  )
}
