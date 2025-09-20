"use client";
import React from 'react';

interface NexusLoaderProps {
  isLoading?: boolean;
  size?: 'small' | 'medium' | 'large';
  className?: string;
}

const NexusLoader: React.FC<NexusLoaderProps> = ({
  isLoading = true,
  size = 'medium',
  className = '',
}) => {
  if (!isLoading) return null;

  const sizeMap = {
    small: 'w-4 h-4',
    medium: 'w-8 h-8',
    large: 'w-12 h-12',
  };

  return (
    <div className={`flex justify-center items-center ${className}`}>
      <div
        className={`${sizeMap[size]} animate-spin rounded-full border-2 border-gray-300 border-t-blue-600`}
      />
      <span className='ml-3 text-gray-600 font-medium'>Loading...</span>
    </div>
  );
};

export default NexusLoader;
