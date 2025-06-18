import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { getMetadataTypeLabel } from '@/lib/utils';

interface BreadcrumbsProps {
  metadataName?: string;
  metadataId?: string;
}

export const Breadcrumbs = ({ metadataName, metadataId }: BreadcrumbsProps) => {
  const pathname = usePathname();
  
  if (!pathname) return null;
  
  // Generate breadcrumb items based on the current pathname
  const generateBreadcrumbs = () => {
    const paths = pathname.split('/').filter(Boolean);
    
    // Root item
    const breadcrumbs = [
      {
        label: 'Home',
        href: '/',
        isCurrent: paths.length === 0,
      },
    ];
    
    // Metadata type (e.g., data-elements, indicators)
    if (paths.length >= 1) {
      // Convert path to readable label (e.g., data-elements -> Data Elements)
      const typeLabel = getMetadataTypeLabel(paths[0].replace(/-/g, '_').toUpperCase());
      
      breadcrumbs.push({
        label: typeLabel,
        href: `/${paths[0]}`,
        isCurrent: paths.length === 1,
      });
    }
    
    // Metadata detail item
    if (paths.length >= 2 && metadataName) {
      breadcrumbs.push({
        label: metadataName,
        href: `/${paths[0]}/${paths[1]}`,
        isCurrent: true,
      });
    }
    
    return breadcrumbs;
  };
  
  const breadcrumbs = generateBreadcrumbs();
  
  return (
    <nav className="flex py-3 px-5 text-gray-700 bg-gray-50 rounded-md" aria-label="Breadcrumb">
      <ol className="inline-flex items-center space-x-1 md:space-x-3">
        {breadcrumbs.map((breadcrumb, index) => {
          const isLast = index === breadcrumbs.length - 1;
          
          return (
            <li key={breadcrumb.href} className="inline-flex items-center">
              {index > 0 && (
                <svg className="w-6 h-6 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                  <path
                    fillRule="evenodd"
                    d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z"
                    clipRule="evenodd"
                  />
                </svg>
              )}
              
              {isLast ? (
                <span className="ml-1 text-sm font-medium text-gray-500 md:ml-2">
                  {breadcrumb.label}
                </span>
              ) : (
                <Link
                  href={breadcrumb.href}
                  className="ml-1 text-sm font-medium text-blue-600 hover:text-blue-700 md:ml-2"
                >
                  {breadcrumb.label}
                </Link>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}; 