'use client';

import { FormEvent, useState } from 'react';
import { isValidUaPhone } from '@/lib/phone';
import { sanitizeHtml } from '@/lib/sanitize';
import { PhoneInput } from './PhoneInput';

const MESSAGES = {
  loading: 'Завантаження...',
  success: "Дякуємо! Скоро ми з вами зв'яжемося",
  failure: 'Щось пішло не так...',
  invalid: 'Введіть коректний номер телефону',
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
  const [isError, setIsError] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const formData = new FormData(form);
    const phone = String(formData.get('phone') || '');

    if (!isValidUaPhone(phone)) {
      setIsError(true);
      setStatus(MESSAGES.invalid);
      return;
    }

    setLoading(true);
    setIsError(false);
    setStatus(MESSAGES.loading);

    try {
      // Service context for the shop notification email / journal
      const pagePath = `${window.location.pathname}${window.location.search}`.slice(0, 300);
      const pageTitle = (document.title || '').slice(0, 120);
      formData.set('pagePath', pagePath);
      formData.set('pageTitle', pageTitle);

      const response = await fetch('/api/contact', { method: 'POST', body: formData });
      if (!response.ok) {
        if (response.status === 429) {
          const retry = response.headers.get('Retry-After');
          const sec = retry ? parseInt(retry, 10) : 60;
          const wait = Number.isFinite(sec) && sec > 0 && sec < 60 ? `${sec} с` : 'хвилину';
          setIsError(true);
          setStatus(`Забагато запитів. Зачекайте ${wait}.`);
          window.setTimeout(() => setStatus(''), 5000);
          return;
        }
        if (response.status === 400) {
          setIsError(true);
          setStatus(MESSAGES.invalid);
          return;
        }
        throw new Error('Request failed');
      }
      setIsError(false);
      setStatus(MESSAGES.success);
      form.reset();
      window.setTimeout(() => setStatus(''), 3000);
    } catch {
      setIsError(true);
      setStatus(MESSAGES.failure);
      window.setTimeout(() => setStatus(''), 5000);
    } finally {
      setLoading(false);
    }
  }

  return (
    <form className={className} onSubmit={handleSubmit} noValidate>
      <PhoneInput name='phone' className='_callback__phone' placeholder={placeholder} />
      <button className='_callback__btn _btn' type='submit' disabled={loading} aria-busy={loading}>
        {buttonHtml ? (
          <span dangerouslySetInnerHTML={{ __html: sanitizeHtml(buttonHtml) }} />
        ) : (
          buttonText
        )}
      </button>
      {status ? (
        <div className={`status${isError ? ' status--error' : ''}`} role='status' aria-live='polite'>
          {status}
        </div>
      ) : null}
    </form>
  );
}
