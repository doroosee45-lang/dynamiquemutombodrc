import React from 'react';

interface Props extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  hint?: string;
  leftIcon?: React.ReactNode;
}

export const Input: React.FC<Props> = ({ label, error, hint, leftIcon, className = '', ...props }) => (
  <div className="space-y-1">
    {label && (
      <label className="block text-sm font-medium text-gray-700">
        {label} {props.required && <span className="text-red-500">*</span>}
      </label>
    )}
    <div className="relative">
      {leftIcon && (
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
          {leftIcon}
        </div>
      )}
      <input
        {...props}
        className={`block w-full rounded-lg border ${error ? 'border-red-500' : 'border-gray-300'}
          bg-white px-3 py-2 text-gray-900 placeholder-gray-400 shadow-sm
          focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent
          disabled:bg-gray-50 disabled:text-gray-500
          ${leftIcon ? 'pl-10' : ''} ${className}`}
      />
    </div>
    {error && <p className="text-xs text-red-600">{error}</p>}
    {hint && !error && <p className="text-xs text-gray-500">{hint}</p>}
  </div>
);

interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
  hint?: string;
}

export const Textarea: React.FC<TextareaProps> = ({ label, error, hint, className = '', ...props }) => (
  <div className="space-y-1">
    {label && (
      <label className="block text-sm font-medium text-gray-700">
        {label} {props.required && <span className="text-red-500">*</span>}
      </label>
    )}
    <textarea
      {...props}
      className={`block w-full rounded-lg border ${error ? 'border-red-500' : 'border-gray-300'}
        bg-white px-3 py-2 text-gray-900 placeholder-gray-400 shadow-sm resize-none
        focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent
        ${className}`}
    />
    {error && <p className="text-xs text-red-600">{error}</p>}
    {hint && !error && <p className="text-xs text-gray-500">{hint}</p>}
  </div>
);

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  options: { value: string; label: string }[];
}

export const Select: React.FC<SelectProps> = ({ label, error, options, className = '', ...props }) => (
  <div className="space-y-1">
    {label && (
      <label className="block text-sm font-medium text-gray-700">
        {label} {props.required && <span className="text-red-500">*</span>}
      </label>
    )}
    <select
      {...props}
      className={`block w-full rounded-lg border ${error ? 'border-red-500' : 'border-gray-300'}
        bg-white px-3 py-2 text-gray-900 shadow-sm
        focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent
        ${className}`}
    >
      <option value="">Sélectionner...</option>
      {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
    </select>
    {error && <p className="text-xs text-red-600">{error}</p>}
  </div>
);
