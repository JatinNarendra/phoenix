import React from 'react';
import Image from 'next/image';
import { getPreloadedImage } from '../utils/imagePreloader';

interface ConnectionFailedProps {
  onReload: () => void;
}

const ConnectionFailed: React.FC<ConnectionFailedProps> = ({ onReload }) => {
  const imageSrc = getPreloadedImage('connectionfailedicon') || '/assets/connectionfailedicon.png';

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-dark-1 text-center px-4">
      <div className="mb-6 relative w-[160px] h-[160px]">
        <Image
          src={imageSrc}
          alt="Connection Failed Icon"
          fill
          className="object-contain"
          unoptimized
        />
      </div>
      <h2 className="text-2xl font-bold mb-4 text-gray-300">Connection Failed</h2>
      <p className="text-gray-400 mb-8">
        It seems like the connection is down. Please reload the app, and this should resolve the issue.
      </p>
      <button
        onClick={onReload}
        className="bg-primary hover:bg-primary/90 text-white font-medium py-2 px-6 rounded-lg transition-colors"
      >
        Reload Bot
      </button>
    </div>
  );
};

export default ConnectionFailed; 