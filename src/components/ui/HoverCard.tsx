import React from 'react';

interface HoverCardProps {
  children: React.ReactNode;
  className?: string;
  hoverScale?: number;
  hoverY?: number;
  duration?: number;
  onClick?: () => void;
}

const HoverCard: React.FC<HoverCardProps> = ({
  children,
  className = '',
  hoverScale = 1.02,
  hoverY = -2,
  duration = 200,
  onClick
}) => {
  return (
    <div
      className={`transform transition-all duration-${duration} ease-in-out cursor-pointer hover:scale-${hoverScale * 100} hover:-translate-y-${hoverY} hover:shadow-lg ${className}`}
      onClick={onClick}
      style={{
        transition: `all ${duration}ms ease-in-out`,
      }}
      onMouseEnter={(e) => {
        if (onClick) {
          e.currentTarget.style.transform = `scale(${hoverScale}) translateY(-${hoverY}px)`;
        }
      }}
      onMouseLeave={(e) => {
        if (onClick) {
          e.currentTarget.style.transform = 'scale(1) translateY(0)';
        }
      }}
    >
      {children}
    </div>
  );
};

export default HoverCard;