import React from 'react';

interface SkeletonProps {
  className?: string;
  lines?: number;
  height?: string;
  width?: string;
  animate?: boolean;
}

const Skeleton: React.FC<SkeletonProps> = ({
  className = '',
  lines = 1,
  height = '1rem',
  width = '100%',
  animate = true
}) => {
  const skeletonLines = Array.from({ length: lines }, (_, i) => (
    <div
      key={i}
      className={`bg-gray-200 dark:bg-gray-700 rounded ${animate ? 'animate-shimmer' : ''}`}
      style={{
        height,
        width: i === lines - 1 && lines > 1 ? '80%' : width,
        marginBottom: lines > 1 && i < lines - 1 ? '0.5rem' : '0',
      }}
    />
  ));

  return (
    <div className={className}>
      {skeletonLines}
    </div>
  );
};

interface CardSkeletonProps {
  className?: string;
  avatar?: boolean;
  title?: boolean;
  subtitle?: boolean;
  content?: boolean;
}

const CardSkeleton: React.FC<CardSkeletonProps> = ({
  className = '',
  avatar = true,
  title = true,
  subtitle = true,
  content = true
}) => {
  return (
    <div className={`p-4 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 ${className}`}>
      {avatar && (
        <div className="flex items-center space-x-3 mb-4">
          <div className="w-10 h-10 bg-gray-200 dark:bg-gray-700 rounded-full animate-shimmer" />
          <div className="flex-1">
            <Skeleton height="1rem" width="60%" />
            <Skeleton height="0.75rem" width="40%" className="mt-1" />
          </div>
        </div>
      )}
      
      {title && <Skeleton height="1.5rem" width="70%" className="mb-2" />}
      {subtitle && <Skeleton height="1rem" width="50%" className="mb-4" />}
      {content && (
        <div className="space-y-2">
          <Skeleton height="1rem" />
          <Skeleton height="1rem" />
          <Skeleton height="1rem" width="80%" />
        </div>
      )}
    </div>
  );
};

interface TableSkeletonProps {
  rows?: number;
  columns?: number;
  className?: string;
}

const TableSkeleton: React.FC<TableSkeletonProps> = ({
  rows = 5,
  columns = 4,
  className = ''
}) => {
  return (
    <div className={className}>
      {/* Header */}
      <div className="grid grid-cols-4 gap-4 mb-4">
        {Array.from({ length: columns }, (_, i) => (
          <Skeleton key={`header-${i}`} height="1.5rem" />
        ))}
      </div>
      
      {/* Rows */}
      {Array.from({ length: rows }, (_, rowIndex) => (
        <div key={`row-${rowIndex}`} className="grid grid-cols-4 gap-4 mb-3 p-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
          {Array.from({ length: columns }, (_, colIndex) => (
            <Skeleton key={`cell-${rowIndex}-${colIndex}`} height="2rem" />
          ))}
        </div>
      ))}
    </div>
  );
};

export { Skeleton, CardSkeleton, TableSkeleton };