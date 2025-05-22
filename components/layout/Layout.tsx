import { ReactNode, useState } from 'react';
import { usePathname } from 'next/navigation';
import { Header } from './Header';
import { Sidebar } from './Sidebar';
import { Breadcrumbs } from './Breadcrumbs';
import { Session } from '../../types/auth';

interface LayoutProps {
  children: ReactNode;
  session: Session | null;
  onLogout: () => void;
  metadataName?: string;
  metadataId?: string;
  showBreadcrumbs?: boolean;
}

export const Layout = ({
  children,
  session,
  onLogout,
  metadataName,
  metadataId,
  showBreadcrumbs = true,
}: LayoutProps) => {
  const pathname = usePathname();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  
  // Toggle sidebar collapse
  const toggleSidebar = () => {
    setSidebarCollapsed(!sidebarCollapsed);
  };
  
  // Determine if this is the login page
  const isLoginPage = pathname === '/';
  
  // Full-width layout for login page
  if (isLoginPage || !session) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col">
        <Header session={session} onLogout={onLogout} />
        <main className="flex-1 overflow-y-auto">
          {children}
        </main>
      </div>
    );
  }
  
  // Main layout with sidebar for authenticated pages
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <Header session={session} onLogout={onLogout} />
      
      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        <Sidebar isCollapsed={sidebarCollapsed} toggleCollapse={toggleSidebar} />
        
        {/* Main content */}
        <main className={`flex-1 overflow-y-auto p-6 transition-all duration-300 ease-in-out ${sidebarCollapsed ? 'ml-16' : 'ml-64'}`}>
          {/* Breadcrumbs */}
          {showBreadcrumbs && (
            <div className="mb-6">
              <Breadcrumbs metadataName={metadataName} metadataId={metadataId} />
            </div>
          )}
          
          {/* Page content */}
          {children}
        </main>
      </div>
    </div>
  );
}; 