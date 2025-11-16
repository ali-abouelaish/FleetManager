import { cn } from '@/lib/utils'
import { HTMLAttributes, ThHTMLAttributes, TdHTMLAttributes } from 'react'

const Table = ({ className, ...props }: HTMLAttributes<HTMLTableElement>) => (
  <div className="relative w-full overflow-auto">
    <table
      className={cn('w-full caption-bottom text-sm', className)}
      {...props}
    />
  </div>
)

const TableHeader = ({
  className,
  ...props
}: HTMLAttributes<HTMLTableSectionElement>) => (
  <thead 
    className={cn(
      'bg-navy',
      '[&_tr]:border-b',
      '[&_tr]:bg-navy',
      '[&_tr]:hover:bg-navy',
      '[&_tr]:even:bg-navy',
      '[&_tr]:odd:bg-navy',
      className
    )} 
    {...props} 
  />
)

const TableBody = ({
  className,
  ...props
}: HTMLAttributes<HTMLTableSectionElement>) => (
  <tbody
    className={cn(
      '[&_tr:last-child]:border-0',
      '[&_tr:hover]:bg-blue-50',
      '[&_tr]:even:bg-gray-50',
      '[&_tr]:odd:bg-white',
      '[&_tr[data-state=selected]]:bg-blue-100',
      className
    )}
    {...props}
  />
)

const TableRow = ({
  className,
  ...props
}: HTMLAttributes<HTMLTableRowElement>) => (
  <tr
    className={cn(
      'border-b transition-colors',
      className
    )}
    {...props}
  />
)

const TableHead = ({
  className,
  ...props
}: ThHTMLAttributes<HTMLTableCellElement>) => (
  <th
    className={cn(
      'h-12 px-4 text-left align-middle font-semibold text-white',
      'bg-transparent',
      '[&:has([role=checkbox])]:pr-0',
      className
    )}
    {...props}
  />
)

const TableCell = ({
  className,
  ...props
}: TdHTMLAttributes<HTMLTableCellElement>) => (
  <td
    className={cn('p-4 align-middle [&:has([role=checkbox])]:pr-0', className)}
    {...props}
  />
)

export { Table, TableHeader, TableBody, TableRow, TableHead, TableCell }

