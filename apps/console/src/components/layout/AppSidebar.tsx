import { Home, Shield, Fingerprint, Server, Search, Activity } from 'lucide-react'
import { useLocation, Link } from 'react-router-dom'
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
  SidebarFooter,
} from '@/components/ui/sidebar'

const navItems = [
  { title: 'Overview', url: '/', icon: Home },
  { title: 'Keys & Identity', url: '/keys', icon: Shield },
  { title: 'Decentralized IDs', url: '/dids', icon: Fingerprint },
  { title: 'Personal Data', url: '/pds', icon: Server },
  { title: 'Explorer', url: '/explorer', icon: Search },
  { title: 'Live Feed', url: '/feed', icon: Activity },
]

export function AppSidebar() {
  const location = useLocation()

  return (
    <Sidebar>
      <SidebarHeader className="p-4">
        <div className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
          Learning Path
        </div>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Modules</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {navItems.map((item) => {
                const isActive = location.pathname === item.url
                return (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton asChild isActive={isActive}>
                      <Link to={item.url}>
                        <item.icon className="h-4 w-4" />
                        <span>{item.title}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                )
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter className="p-4">
        <div className="text-xs text-muted-foreground">
          Built on CKB + AT Protocol
        </div>
      </SidebarFooter>
    </Sidebar>
  )
}
