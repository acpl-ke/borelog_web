import React from 'react';
import { useNavigate } from 'react-router-dom';

interface PageHeaderProps {
  crumb: string;
  title: string;
  backTo?: string;
  rightIcon?: string;
  onRightClick?: () => void;
}

export const PageHeader: React.FC<PageHeaderProps> = ({
  crumb,
  title,
  backTo,
  rightIcon = '⋯',
  onRightClick,
}) => {
  const navigate = useNavigate();

  return (
    <div className="app-header">
      <div className="header-row">
        <button className="icon-btn" onClick={() => (backTo ? navigate(backTo) : navigate(-1))}>
          ←
        </button>
        <div className="header-title">
          <div className="crumb">{crumb}</div>
          <h1>{title}</h1>
        </div>
        <button className="icon-btn" onClick={onRightClick}>
          {rightIcon}
        </button>
      </div>
    </div>
  );
};
