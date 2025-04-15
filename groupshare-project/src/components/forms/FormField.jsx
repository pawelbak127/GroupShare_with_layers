// src/components/forms/FormField.jsx
'use client';

import React from 'react';

/**
 * Komponent pola formularza z obsługą błędów i różnych typów pól
 */
export function FormField({
  label,
  name,
  type = 'text',
  placeholder,
  value,
  onChange,
  error,
  required = false,
  className = '',
  min,
  max,
  step,
  options = [],
  disabled = false,
  prefix,
  suffix,
  helper,
  children,
  ...props
}) {
  // Generuj unikalny ID na podstawie nazwy pola
  const id = `form-field-${name}`;
  
  // Renderuj odpowiedni typ pola
  const renderField = () => {
    // Dla komponentów niestandardowych
    if (children) {
      return children;
    }
    
    // Dla pola select
    if (type === 'select') {
      return (
        <select
          id={id}
          name={name}
          className={`block w-full rounded-md border ${error ? 'border-red-300' : 'border-gray-300'} px-3 py-2 text-gray-700 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 ${disabled ? 'bg-gray-100 cursor-not-allowed' : ''}`}
          value={value}
          onChange={onChange}
          disabled={disabled}
          required={required}
          {...props}
        >
          {options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      );
    }
    
    // Dla pola textarea
    if (type === 'textarea') {
      return (
        <textarea
          id={id}
          name={name}
          className={`block w-full rounded-md border ${error ? 'border-red-300' : 'border-gray-300'} px-3 py-2 text-gray-700 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 ${disabled ? 'bg-gray-100 cursor-not-allowed' : ''}`}
          placeholder={placeholder}
          value={value}
          onChange={onChange}
          disabled={disabled}
          required={required}
          {...props}
        />
      );
    }
    
    // Dla pola checkbox
    if (type === 'checkbox') {
      return (
        <div className="flex items-center">
          <input
            id={id}
            type="checkbox"
            name={name}
            className={`h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-600 ${disabled ? 'bg-gray-100 cursor-not-allowed' : ''}`}
            checked={value}
            onChange={onChange}
            disabled={disabled}
            {...props}
          />
          <label htmlFor={id} className="ml-2 block text-sm font-medium leading-6 text-gray-900">
            {label}
          </label>
        </div>
      );
    }
    
    // Dla pola radio
    if (type === 'radio') {
      return (
        <div className="flex items-center">
          <input
            id={id}
            type="radio"
            name={name}
            className={`h-4 w-4 border-gray-300 text-indigo-600 focus:ring-indigo-600 ${disabled ? 'bg-gray-100 cursor-not-allowed' : ''}`}
            checked={value}
            onChange={onChange}
            disabled={disabled}
            {...props}
          />
          <label htmlFor={id} className="ml-2 block text-sm font-medium leading-6 text-gray-900">
            {label}
          </label>
        </div>
      );
    }
    
    // Domyślnie: pola input (text, number, email, itp.)
    return (
      <div className={`relative ${prefix || suffix ? 'flex rounded-md shadow-sm' : ''}`}>
        {prefix && (
          <span className="inline-flex items-center rounded-l-md border border-r-0 border-gray-300 px-3 text-gray-500 sm:text-sm">
            {prefix}
          </span>
        )}
        <input
          id={id}
          type={type}
          name={name}
          className={`block w-full rounded-md ${prefix ? 'rounded-l-none' : ''} ${suffix ? 'rounded-r-none' : ''} border ${error ? 'border-red-300' : 'border-gray-300'} px-3 py-2 text-gray-700 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 ${disabled ? 'bg-gray-100 cursor-not-allowed' : ''}`}
          placeholder={placeholder}
          value={value}
          onChange={onChange}
          disabled={disabled}
          required={required}
          min={min}
          max={max}
          step={step}
          {...props}
        />
        {suffix && (
          <span className="inline-flex items-center rounded-r-md border border-l-0 border-gray-300 px-3 text-gray-500 sm:text-sm">
            {suffix}
          </span>
        )}
      </div>
    );
  };
  
  // Nie pokazuj labela dla checkboxa i radio (wyświetlany jest obok pola)
  const showLabel = type !== 'checkbox' && type !== 'radio';
  
  return (
    <div className={`space-y-1 ${className}`}>
      {showLabel && (
        <label htmlFor={id} className="block text-sm font-medium text-gray-700">
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </label>
      )}
      
      {renderField()}
      
      {helper && !error && (
        <p className="mt-1 text-xs text-gray-500">{helper}</p>
      )}
      
      {error && (
        <p className="mt-1 text-xs text-red-600">{error}</p>
      )}
    </div>
  );
}