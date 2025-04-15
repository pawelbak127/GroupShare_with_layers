// src/components/forms/SubmitButton.jsx
'use client';

import React from 'react';

/**
 * Przycisk formularza z obsługą stanu ładowania i stylami
 */
export function SubmitButton({
  label,
  isSubmitting = false,
  loadingLabel = 'Przetwarzanie...',
  disabled = false,
  variant = 'primary',
  fullWidth = false,
  size = 'md',
  className = '',
  onClick,
  ...props
}) {
  // Mapowanie wariantów na odpowiednie style
  const variantStyles = {
    primary: 'bg-indigo-600 text-white hover:bg-indigo-700 focus:ring-indigo-500',
    secondary: 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50 focus:ring-indigo-500',
    danger: 'bg-red-600 text-white hover:bg-red-700 focus:ring-red-500',
    success: 'bg-green-600 text-white hover:bg-green-700 focus:ring-green-500',
  };
  
  // Mapowanie rozmiarów na odpowiednie style
  const sizeStyles = {
    sm: 'px-3 py-1.5 text-sm',
    md: 'px-4 py-2',
    lg: 'px-6 py-3 text-lg',
  };
  
  return (
    <button
      type={onClick ? 'button' : 'submit'}
      className={`
        ${variantStyles[variant] || variantStyles.primary}
        ${sizeStyles[size] || sizeStyles.md}
        ${fullWidth ? 'w-full' : ''}
        font-medium rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2
        ${(isSubmitting || disabled) ? 'opacity-70 cursor-not-allowed' : ''}
        ${className}
      `}
      disabled={isSubmitting || disabled}
      onClick={onClick}
      {...props}
    >
      {isSubmitting ? loadingLabel : label}
    </button>
  );
}