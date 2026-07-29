// TableShell.tsx
import React, { TableHTMLAttributes } from 'react';

export interface Column<T> {
  key: string;
  header: React.ReactNode;
  render: (item: T) => React.ReactNode;
}

export interface TableShellProps<T> extends TableHTMLAttributes<HTMLTableElement> {
  columns: Column<T>[];
  data: T[];
  keyExtractor: (item: T) => string;
}

export function TableShell<T>({ columns, data, keyExtractor, className = '', ...props }: TableShellProps<T>) {
  return (
    <div className="ds-table-container">
      <table className={`ds-table ${className}`} {...props}>
        <thead>
          <tr>
            {columns.map((col) => (
              <th key={col.key} scope="col">
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.length === 0 ? (
            <tr>
              <td colSpan={columns.length} style={{ textAlign: 'center', padding: '2rem' }}>
                No records found.
              </td>
            </tr>
          ) : (
            data.map((item) => (
              <tr key={keyExtractor(item)}>
                {columns.map((col) => (
                  <td key={col.key}>{col.render(item)}</td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
