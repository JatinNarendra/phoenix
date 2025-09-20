import React, { ReactNode } from 'react';

interface CustomYellowButtonProps {
  children: ReactNode;
  className?: string;
  onClick?: () => void;
  href?: string;
  disabled?: boolean;
}

const CustomYellowButton: React.FC<CustomYellowButtonProps> = ({
  children,
  className = '',
  onClick,
  href,
}) => {
  const buttonStyle = {
    background: '#E18700',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '10px 24px',
    cursor: 'pointer',
    borderRadius: '14px',
    borderBottom: '5px solid #AF5500',
    fontSize: '16px',
    fontWeight: '700',
    fontFamily: "Mplus1,Poppins, sans-serif"
  };

  if (href) {
    return (
      <a 
        href={href}
        className={className}
        style={buttonStyle}
        onClick={onClick}
      >
        {children}
      </a>
    );
  }

  return (
    <button
      className={className}
      style={buttonStyle}
      onClick={onClick}
    >
      {children}
    </button>
  );
};

export default CustomYellowButton; 