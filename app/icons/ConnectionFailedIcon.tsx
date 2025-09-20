import React from 'react';

export const ConnectionFailedIcon: React.FC = () => {
  return (
    <svg
      width="120"
      height="120"
      viewBox="0 0 120 120"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M40 50C50 30 70 30 80 50C90 70 30 70 40 50Z"
        fill="#8B4513"
      />
      <g className="flames">
        <path
          d="M45 40C45 35 50 30 55 35C60 40 40 45 45 40Z"
          fill="#FF4D4D"
        />
        <path
          d="M75 40C75 35 70 30 65 35C60 40 80 45 75 40Z"
          fill="#FF4D4D"
        />
      </g>
    </svg>
  );
}; 