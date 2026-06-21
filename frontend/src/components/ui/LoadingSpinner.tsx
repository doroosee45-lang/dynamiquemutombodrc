import React from 'react';

interface Props {
  size?: 'sm' | 'md' | 'lg';
  text?: string;
}

const sizes = { sm: 'h-6 w-6', md: 'h-10 w-10', lg: 'h-16 w-16' };

export const LoadingSpinner: React.FC<Props> = ({ size = 'md', text }) => (
  <div className="flex flex-col items-center justify-center gap-3 p-8">
    <div className={`${sizes[size]} animate-spin`}>
      <svg className="text-primary-600" viewBox="0 0 24 24" fill="none">
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
        <path className="opacity-75" fill="currentColor"
          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
      </svg>
    </div>
    {text && <p className="text-sm text-gray-500">{text}</p>}
  </div>
);

export const PageLoader: React.FC = () => (
  <div className="fixed inset-0 bg-white flex items-center justify-center z-50">
    <div className="text-center">
      <div className="w-16 h-16 bg-primary-600 rounded-2xl flex items-center justify-center mx-auto mb-4 animate-pulse">
        <span className="text-white text-2xl font-bold">D</span>
      </div>
      <div className="w-10 h-10 border-4 border-primary-200 border-t-primary-600 rounded-full animate-spin mx-auto" />
      <p className="text-gray-500 text-sm mt-3">Chargement...</p>
    </div>
  </div>
);
