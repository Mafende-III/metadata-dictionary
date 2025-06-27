'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import { useAuthStore } from '@/lib/stores/authStore';
import { Button } from '@/components/ui/Button';

export default function Header() {
  const router = useRouter();
  const pathname = usePathname();
  const { isAuthenticated, username, dhisBaseUrl, clearCredentials } = useAuthStore();
  const [currentInstance, setCurrentInstance] = useState('demo');

  const handleLogout = () => {
    clearCredentials();
    router.push('/');
  };

  const handleInstanceChange = (value: string) => {
    if (value === 'new') {
      alert('Add new instance functionality - This will open a modal to configure a new DHIS2 instance.');
      setCurrentInstance('demo');
    } else {
      setCurrentInstance(value);
    }
  };

  const isActive = (path: string) => {
    return pathname === path || pathname.startsWith(path);
  };

  const navLinks = [
    { href: '/dictionaries', label: 'Explore Dictionaries', icon: '📚' },
    { href: '/generate', label: 'Generate New', icon: '➕' },
    { href: '/instances', label: 'Instances', icon: '🔗' },
    { href: '/sql-views', label: 'SQL Views', icon: '🔍' },
  ];

  if (!isAuthenticated) {
    return null;
  }

  return (
    <nav className="bg-white border-b border-gray-200 sticky top-0 z-50 shadow-sm">
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex items-center justify-between py-4">
          {/* Logo */}
          <Link 
            href="/dictionaries" 
            className="flex items-center gap-2 text-blue-600 font-bold text-xl cursor-pointer hover:text-blue-700 transition-colors"
          >
            <span className="text-2xl">📊</span>
            DHIS2 Metadata Dictionary
          </Link>

          {/* Navigation Links */}
          <div className="hidden md:flex items-center gap-8">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={`flex items-center gap-2 text-sm font-medium transition-colors px-3 py-2 rounded-lg ${
                  isActive(link.href)
                    ? 'text-blue-600 bg-blue-50'
                    : 'text-gray-600 hover:text-blue-600 hover:bg-blue-50'
                }`}
              >
                <span>{link.icon}</span>
                {link.label}
              </Link>
            ))}
          </div>

          {/* User Menu */}
          <div className="flex items-center gap-4">
            {/* Instance Selector */}
            <div className="instance-selector">
              <span>Instance:</span>
              <select
                value={currentInstance}
                onChange={(e) => handleInstanceChange(e.target.value)}
                className="bg-transparent border-none focus:outline-none font-medium cursor-pointer"
              >
                <option value="demo">Demo DHIS2</option>
                <option value="production">Production</option>
                <option value="training">Training</option>
                <option value="new">+ Add New Instance</option>
              </select>
            </div>

            {/* User Avatar and Info */}
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 bg-blue-600 rounded-full flex items-center justify-center text-white font-semibold text-sm">
                {username ? username.charAt(0).toUpperCase() : 'U'}
              </div>
              <div className="hidden sm:block">
                <div className="text-sm font-medium text-gray-900">{username || 'User'}</div>
                <div className="text-xs text-gray-500 truncate max-w-32">
                  {dhisBaseUrl?.replace('https://', '').replace('/api', '') || 'Not connected'}
                </div>
              </div>
            </div>

            {/* Logout Button */}
            <Button
              variant="outline"
              size="sm"
              onClick={handleLogout}
              className="text-gray-600 hover:text-gray-800 border-gray-300"
            >
              Logout
            </Button>
          </div>
        </div>

        {/* Mobile Navigation */}
        <div className="md:hidden pb-4">
          <div className="grid grid-cols-2 gap-2">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={`flex items-center gap-2 text-sm font-medium px-3 py-2 rounded-lg transition-colors ${
                  isActive(link.href)
                    ? 'bg-blue-100 text-blue-600'
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                <span>{link.icon}</span>
                {link.label}
              </Link>
            ))}
          </div>
        </div>
      </div>
    </nav>
  );
}