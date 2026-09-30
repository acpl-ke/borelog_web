import React from 'react';

interface FieldProps {
  label: string;
  required?: boolean;
  children: React.ReactNode;
  className?: string;
}

export const Field: React.FC<FieldProps> = ({ label, required, children, className = '' }) => (
  <div className={`f ${className}`}>
    <label>
      {label} {required && <span className="req">*</span>}
    </label>
    {children}
  </div>
);

interface NumberFieldProps {
  label: string;
  value: number;
  onChange: (v: number) => void;
  unit?: string;
  required?: boolean;
  step?: string;
  placeholder?: string;
}

export const NumberField: React.FC<NumberFieldProps> = ({
  label,
  value,
  onChange,
  unit = 'mtr',
  required,
  step = '0.001',
  placeholder = '0.000',
}) => (
  <Field label={label} required={required}>
    <div className="with-unit">
      <input
        className="num"
        type="number"
        step={step}
        // Empty string when value is 0 so the placeholder shows; preserves user's typed values
        value={value === 0 ? '' : value}
        placeholder={placeholder}
        onChange={(e) => {
          const v = e.target.value;
          onChange(v === '' ? 0 : parseFloat(v) || 0);
        }}
        inputMode="decimal"
      />
      <span className="unit-tag">{unit}</span>
    </div>
  </Field>
);

interface SelectFieldProps<T extends { id: number; name: string }> {
  label: string;
  required?: boolean;
  options: T[];
  value: number | undefined;
  onChange: (v: number) => void;
  placeholder?: string;
  formatLabel?: (item: T) => string;
}

export function SelectField<T extends { id: number; name: string }>({
  label,
  required,
  options,
  value,
  onChange,
  placeholder = '— Select —',
  formatLabel,
}: SelectFieldProps<T>) {
  return (
    <Field label={label} required={required}>
      <select
        value={value ?? 0}
        onChange={(e) => onChange(parseInt(e.target.value, 10))}
      >
        <option value={0}>{placeholder}</option>
        {options.map((opt) => (
          <option key={opt.id} value={opt.id}>
            {formatLabel ? formatLabel(opt) : opt.name}
          </option>
        ))}
      </select>
    </Field>
  );
}
