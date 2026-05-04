import React, { useState } from 'react';

interface AccordionSectionProps {
  num: string;
  title: string;
  subtitle: string;
  defaultOpen?: boolean;
  isComplete?: boolean;
  children: React.ReactNode;
}

export const AccordionSection: React.FC<AccordionSectionProps> = ({
  num,
  title,
  subtitle,
  defaultOpen = false,
  isComplete = false,
  children,
}) => {
  const [open, setOpen] = useState(defaultOpen);

  const cls = `section ${open ? 'open' : ''} ${isComplete ? 'complete' : ''}`;

  return (
    <div className={cls}>
      <div className="section-head" onClick={() => setOpen((o) => !o)}>
        <div className="left">
          <div className="section-num">
            <span>{num}</span>
          </div>
          <div>
            <div className="section-title">{title}</div>
            <div className="section-sub">{subtitle}</div>
          </div>
        </div>
        <span className="chev">⌄</span>
      </div>
      {open && <div className="section-body">{children}</div>}
    </div>
  );
};
