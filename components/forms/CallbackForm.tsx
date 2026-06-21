'use client';

import { FormEvent, useState } from 'react';
import { PhoneInput } from './PhoneInput';

const MESSAGES = {
  loading: 'Завантаження...',
  success: 'Дякуємо! Скоро ми з вами зв\'яжемося',
  failure: 'Щось пішло не так...',
};

interface CallbackFormProps {
  buttonText: string;
  buttonHtml?: string;
  placeholder?: string;
  className?: string;
}

export function CallbackForm({
  buttonText,
  buttonHtml,
  placeholder = '+38( ___ ) __ __ ___',
  className = '_callback__form',
}: CallbackFormProps) {
  const [status, setStatus] = useState('');

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const formData = new FormData(form);

    setStatus(MESSAGES.loading);

    try {
      // Use Next.js API (works in dev + docker). Supports FormData.
      const response = await fetch('/api/contact', { method: 'POST', body: formData });
      if (!response.ok) throw new Error('Request failed');
      setStatus(MESSAGES.success);
      form.reset();
    } catch {
      setStatus(MESSAGES.failure);
    } finally {
      setTimeout(() => setStatus(''), 3000);
    }
  }

  return (
    <form className={className} onSubmit={handleSubmit}>
      <PhoneInput name="phone" className="_callback__phone" placeholder={placeholder} />
      <button className="_callback__btn _btn" type="submit">
        {buttonHtml ? <span dangerouslySetInnerHTML={{ __html: buttonHtml }} /> : buttonText}
      </button>
      {status ? <div className="status">{status}</div> : null}
    </form>
  );
}