'use client';

interface ImageFieldProps {
  label?: string;
  value: string;
  onChange: (url: string) => void;
  onUpload: (file: File) => Promise<string>;
  alt?: string;
  onAltChange?: (alt: string) => void;
}

/** URL + file upload + optional preview for admin editors. */
export function ImageField({ label = 'Зображення', value, onChange, onUpload, alt, onAltChange }: ImageFieldProps) {
  return (
    <div className='admin-image-field'>
      <label>
        {label} (URL)
        <input value={value} onChange={(e) => onChange(e.target.value)} />
      </label>
      <label>
        Завантажити файл
        <input
          type='file'
          accept='image/*'
          onChange={async (e) => {
            const file = e.target.files?.[0];
            e.target.value = '';
            if (!file) return;
            const url = await onUpload(file);
            if (url) onChange(url);
          }}
        />
      </label>
      {onAltChange ? (
        <label>
          Alt текст
          <input value={alt || ''} onChange={(e) => onAltChange(e.target.value)} />
        </label>
      ) : null}
      {value ? (
        <div className='admin-image-preview'>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={value} alt={alt || ''} />
        </div>
      ) : null}
    </div>
  );
}
