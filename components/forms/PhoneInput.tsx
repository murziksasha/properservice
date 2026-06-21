'use client';

import { useCallback } from 'react';

interface PhoneInputProps {
  name: string;
  className?: string;
  placeholder?: string;
}

const MATRIX = '+38 (___) ___ __ __';

export function PhoneInput({ name, className, placeholder }: PhoneInputProps) {
  const formatValue = useCallback((value: string, blur = false) => {
    const def = MATRIX.replace(/\D/g, '');
    let digits = value.replace(/\D/g, '');
    if (def.length >= digits.length) digits = def;

    let i = 0;
    const formatted = MATRIX.replace(/./g, (char) => {
      if (/[_\d]/.test(char) && i < digits.length) return digits.charAt(i++);
      return i >= digits.length ? '' : char;
    });

    if (blur && formatted.length === 2) return '';
    return formatted;
  }, []);

  return (
    <input
      type="text"
      name={name}
      className={className}
      placeholder={placeholder}
      onInput={(e) => {
        e.currentTarget.value = formatValue(e.currentTarget.value);
      }}
      onFocus={(e) => {
        e.currentTarget.value = formatValue(e.currentTarget.value);
      }}
      onBlur={(e) => {
        e.currentTarget.value = formatValue(e.currentTarget.value, true);
      }}
    />
  );
}