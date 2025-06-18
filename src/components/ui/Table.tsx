import { ReactNode, HTMLAttributes, TableHTMLAttributes, TdHTMLAttributes, ThHTMLAttributes } from 'react';

// Table props
export interface TableProps extends TableHTMLAttributes<HTMLTableElement> {
  children: ReactNode;
  striped?: boolean;
  bordered?: boolean;
  hover?: boolean;
  compact?: boolean;
}

// Table.Head props
export interface TableHeadProps extends HTMLAttributes<HTMLTableSectionElement> {
  children: ReactNode;
}

// Table.Body props
export interface TableBodyProps extends HTMLAttributes<HTMLTableSectionElement> {
  children: ReactNode;
}

// Table.Row props
export interface TableRowProps extends HTMLAttributes<HTMLTableRowElement> {
  children: ReactNode;
  isHeader?: boolean;
}

// Table.Cell props
export interface TableCellProps extends TdHTMLAttributes<HTMLTableCellElement> {
  children?: ReactNode;
  isHeader?: boolean;
}

// Table.HeaderCell props
export interface TableHeaderCellProps extends ThHTMLAttributes<HTMLTableCellElement> {
  children?: ReactNode;
  sortable?: boolean;
  sorted?: 'asc' | 'desc' | false;
  onSort?: () => void;
}

// Table component
export const Table = ({
  children,
  striped = false,
  bordered = false,
  hover = false,
  compact = false,
  className = '',
  ...props
}: TableProps) => {
  // Base styles
  const baseStyles = 'min-w-full divide-y divide-gray-200';
  
  // Modifier styles
  const stripedStyles = striped ? 'table-striped' : '';
  const borderedStyles = bordered ? 'border border-gray-200' : '';
  const hoverStyles = hover ? 'table-hover' : '';
  const compactStyles = compact ? 'table-compact' : '';
  
  // Combined styles
  const tableStyles = `${baseStyles} ${stripedStyles} ${borderedStyles} ${hoverStyles} ${compactStyles} ${className}`;
  
  return (
    <div className="overflow-x-auto">
      <table className={tableStyles} {...props}>
        {children}
      </table>
    </div>
  );
};

// Table.Head component
const TableHead = ({ children, className = '', ...props }: TableHeadProps) => {
  return (
    <thead className={`bg-gray-50 ${className}`} {...props}>
      {children}
    </thead>
  );
};

// Table.Body component
const TableBody = ({ children, className = '', ...props }: TableBodyProps) => {
  return (
    <tbody className={`bg-white divide-y divide-gray-200 ${className}`} {...props}>
      {children}
    </tbody>
  );
};

// Table.Row component
const TableRow = ({ children, isHeader = false, className = '', ...props }: TableRowProps) => {
  // Base styles
  const baseStyles = isHeader ? '' : '';
  
  // Hover effect for non-header rows
  const hoverStyles = !isHeader ? 'hover:bg-gray-50' : '';
  
  // Combined styles
  const rowStyles = `${baseStyles} ${hoverStyles} ${className}`;
  
  return (
    <tr className={rowStyles} {...props}>
      {children}
    </tr>
  );
};

// Table.Cell component
const TableCell = ({ children, isHeader = false, className = '', ...props }: TableCellProps) => {
  // Base styles for regular cells
  const baseTdStyles = 'px-6 py-4 whitespace-nowrap text-sm text-gray-500';
  
  // Combined styles
  const cellStyles = `${baseTdStyles} ${className}`;
  
  return (
    <td className={cellStyles} {...props}>
      {children}
    </td>
  );
};

// Table.HeaderCell component
const TableHeaderCell = ({
  children,
  sortable = false,
  sorted = false,
  onSort,
  className = '',
  ...props
}: TableHeaderCellProps) => {
  // Base styles
  const baseStyles = 'px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider';
  
  // Sortable styles
  const sortableStyles = sortable ? 'cursor-pointer' : '';
  
  // Combined styles
  const headerCellStyles = `${baseStyles} ${sortableStyles} ${className}`;
  
  // Sort icon
  const renderSortIcon = () => {
    if (!sortable) return null;
    
    if (sorted === 'asc') {
      return (
        <svg className="ml-1 w-3 h-3 inline" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M14.707 12.707a1 1 0 01-1.414 0L10 9.414l-3.293 3.293a1 1 0 01-1.414-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 010 1.414z" clipRule="evenodd" />
        </svg>
      );
    }
    
    if (sorted === 'desc') {
      return (
        <svg className="ml-1 w-3 h-3 inline" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 011.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
        </svg>
      );
    }
    
    return (
      <svg className="ml-1 w-3 h-3 text-gray-400 inline opacity-0 group-hover:opacity-100" fill="currentColor" viewBox="0 0 20 20">
        <path fillRule="evenodd" d="M10 3a1 1 0 01.707.293l3 3a1 1 0 01-1.414 1.414L10 5.414 7.707 7.707a1 1 0 01-1.414-1.414l3-3A1 1 0 0110 3zm-3.707 9.293a1 1 0 011.414 0L10 14.586l2.293-2.293a1 1 0 011.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clipRule="evenodd" />
      </svg>
    );
  };
  
  return (
    <th
      className={`${headerCellStyles} group`}
      onClick={sortable ? onSort : undefined}
      {...props}
    >
      <div className="flex items-center">
        {children}
        {renderSortIcon()}
      </div>
    </th>
  );
};

// Attach subcomponents to Table
Table.Head = TableHead;
Table.Body = TableBody;
Table.Row = TableRow;
Table.Cell = TableCell;
Table.HeaderCell = TableHeaderCell; 