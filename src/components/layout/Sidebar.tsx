import { ReactNode } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { NAV_ITEMS } from '@/lib/constants';

interface SidebarProps {
  children?: ReactNode;
  isCollapsed?: boolean;
  toggleCollapse?: () => void;
}

export const Sidebar = ({ 
  children,
  isCollapsed = false,
  toggleCollapse
}: SidebarProps) => {
  const pathname = usePathname();
  
  return (
    <div className={`bg-white border-r border-gray-200 ${isCollapsed ? 'w-16' : 'w-64'} transition-all duration-300 ease-in-out`}>
      {/* Sidebar header */}
      <div className="h-16 flex items-center justify-between px-4 border-b border-gray-200">
        {!isCollapsed && (
          <h2 className="text-lg font-semibold text-gray-800">Navigation</h2>
        )}
        
        {toggleCollapse && (
          <button
            onClick={toggleCollapse}
            className="p-1 rounded-md text-gray-400 hover:text-gray-500 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {isCollapsed ? (
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 5l7 7-7 7M5 5l7 7-7 7" />
              </svg>
            ) : (
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 19l-7-7 7-7m8 14l-7-7 7-7" />
              </svg>
            )}
          </button>
        )}
      </div>
      
      {/* Navigation */}
      <nav className="mt-4 px-2 space-y-1">
        {NAV_ITEMS.map((item) => {
          const isActive = pathname?.startsWith(item.path);
          
          return (
            <Link
              key={item.path}
              href={item.path}
              className={`${
                isActive
                  ? 'bg-blue-50 text-blue-700'
                  : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
              } group flex items-center px-2 py-2 text-sm font-medium rounded-md transition-colors`}
            >
              {renderIcon(item.icon, isActive)}
              
              {!isCollapsed && (
                <>
                  <span className="ml-3">{item.label}</span>
                  
                  {/* Show a tooltip on hover when collapsed */}
                  {isCollapsed && (
                    <span className="absolute left-full rounded-md bg-gray-800 px-2 py-1 ml-6 text-xs text-white">
                      {item.label}
                    </span>
                  )}
                </>
              )}
            </Link>
          );
        })}
      </nav>
      
      {/* Additional content */}
      {children && <div className="mt-6 px-4">{children}</div>}
    </div>
  );
};

// Helper function to render icons
const renderIcon = (iconName: string, isActive: boolean) => {
  const activeClass = isActive ? 'text-blue-600' : 'text-gray-400 group-hover:text-gray-500';
  
  switch (iconName) {
    case 'database':
      return (
        <svg className={`mr-3 h-6 w-6 ${activeClass}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4m0 5c0 2.21-3.582 4-8 4s-8-1.79-8-4" />
        </svg>
      );
    
    case 'chart-bar':
      return (
        <svg className={`mr-3 h-6 w-6 ${activeClass}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
        </svg>
      );
    
    case 'template':
      return (
        <svg className={`mr-3 h-6 w-6 ${activeClass}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zM16 13a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z" />
        </svg>
      );
    
    case 'code':
      return (
        <svg className={`mr-3 h-6 w-6 ${activeClass}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
        </svg>
      );
    
    default:
      return (
        <svg className={`mr-3 h-6 w-6 ${activeClass}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
        </svg>
      );
  }
}; 