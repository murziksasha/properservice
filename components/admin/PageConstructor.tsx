'use client';

import type { Section, SiteData } from '@/lib/types';
import { saveSiteData } from '@/lib/admin/saveSite';
import { uploadImage } from '@/lib/admin/uploadImage';
import { SECTION_LABELS, SECTION_TYPES, newSection } from '@/lib/section-factory';
import { useEffect, useMemo, useState } from 'react';
import { showToast } from './AdminToast';

export function PageConstructor({ initialData, pageSlug }: { initialData: SiteData; pageSlug: string }) {
  const [data, setData] = useState(initialData);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);
  const pageIndex = useMemo(() => data.pages.findIndex((p) => p.slug === pageSlug), [data, pageSlug]);
  const page = data.pages[pageIndex];

  useEffect(() => {
    if (!dirty) return;
    function onBeforeUnload(e: BeforeUnloadEvent) {
      e.preventDefault();
      e.returnValue = '';
    }
    window.addEventListener('beforeunload', onBeforeUnload);
    return () => window.removeEventListener('beforeunload', onBeforeUnload);
  }, [dirty]);

  if (!page) return <p>Сторінку не знайдено</p>;

  function mark(next: SiteData) {
    setData(next);
    setDirty(true);
  }

  function updatePage(patch: Partial<typeof page>) {
    const pages = [...data.pages];
    pages[pageIndex] = { ...page, ...patch };
    mark({ ...data, pages });
  }

  function updateSections(sections: Section[]) {
    updatePage({ sections });
  }

  function patchSection(index: number, patch: Record<string, unknown>) {
    const sections = [...page.sections];
    sections[index] = { ...sections[index], ...patch } as Section;
    updateSections(sections);
  }

  function moveSection(index: number, dir: -1 | 1) {
    const sections = [...page.sections];
    const target = index + dir;
    if (target < 0 || target >= sections.length) return;
    [sections[index], sections[target]] = [sections[target], sections[index]];
    updateSections(sections);
  }

  async function handleUpload(file: File): Promise<string> {
    const { url, error } = await uploadImage(file);
    if (!url) {
      showToast(error || 'Помилка завантаження', 'error');
      return '';
    }
    return url;
  }

  async function save() {
    setSaving(true);
    const result = await saveSiteData(data);
    setSaving(false);
    if (result.ok) {
      setDirty(false);
      showToast('Збережено', 'success');
    } else {
      showToast(result.error, 'error');
    }
  }

  return (
    <div>
      <div className='admin-card admin-sticky-bar'>
        <div className='admin-toolbar'>
          <button type='button' className='admin-btn' onClick={save} disabled={saving}>
            {saving ? 'Збереження…' : 'Зберегти'}
          </button>
          <a
            href={pageSlug ? `/${pageSlug}` : '/'}
            target='_blank'
            rel='noreferrer'
            className='admin-btn admin-btn--secondary'
          >
            Перегляд
          </a>
          <select
            className='admin-select'
            onChange={(e) => {
              if (!e.target.value) return;
              updateSections([...page.sections, newSection(e.target.value)]);
              e.target.value = '';
            }}
            defaultValue=''
          >
            <option value=''>+ Додати секцію</option>
            {SECTION_TYPES.map((t) => (
              <option key={t} value={t}>
                {SECTION_LABELS[t] || t}
              </option>
            ))}
          </select>
          {dirty ? <span className='admin-dirty'>Є незбережені зміни</span> : null}
        </div>

        <div className='admin-form'>
          <label>
            Назва сторінки
            <input value={page.title} onChange={(e) => updatePage({ title: e.target.value })} />
          </label>
          <label>
            Опис (meta)
            <input value={page.description} onChange={(e) => updatePage({ description: e.target.value })} />
          </label>
          <div className='admin-row admin-row--wrap'>
            <label className='admin-check'>
              <input
                type='checkbox'
                checked={page.visible}
                onChange={(e) => updatePage({ visible: e.target.checked })}
              />
              Видима
            </label>
            <label className='admin-field-sm'>
              Розмір заголовків (rem)
              <input
                type='number'
                step='0.1'
                value={page.titleSize ?? 4.6}
                onChange={(e) => updatePage({ titleSize: parseFloat(e.target.value) || undefined })}
              />
            </label>
            <label className='admin-field-sm'>
              Масштаб тексту
              <input
                type='number'
                step='0.1'
                min={0.6}
                max={1.6}
                value={page.textScale ?? 1}
                onChange={(e) => updatePage({ textScale: parseFloat(e.target.value) || undefined })}
              />
            </label>
          </div>
        </div>
      </div>

      {page.sections.map((section, index) => (
        <div key={section.id} className='admin-section-item admin-form'>
          <div className='admin-row admin-row--between'>
            <strong>{SECTION_LABELS[section.type] || section.type}</strong>
            <div className='admin-row'>
              <label className='admin-check'>
                <input
                  type='checkbox'
                  checked={section.visible}
                  onChange={(e) => patchSection(index, { visible: e.target.checked })}
                />
                видима
              </label>
              <button type='button' className='admin-btn admin-btn--secondary' onClick={() => moveSection(index, -1)}>
                ↑
              </button>
              <button type='button' className='admin-btn admin-btn--secondary' onClick={() => moveSection(index, 1)}>
                ↓
              </button>
              <button
                type='button'
                className='admin-btn admin-btn--danger'
                onClick={() => {
                  if (!confirm('Видалити секцію?')) return;
                  updateSections(page.sections.filter((_, i) => i !== index));
                }}
              >
                ×
              </button>
            </div>
          </div>

          {section.type === 'hero' ? (
            <>
              <label>
                Заголовок (HTML)
                <textarea
                  rows={2}
                  value={section.titleHtml}
                  onChange={(e) => patchSection(index, { titleHtml: e.target.value })}
                />
              </label>
              <label>
                Зображення (URL)
                <input value={section.image} onChange={(e) => patchSection(index, { image: e.target.value })} />
              </label>
              <label>
                Завантажити зображення
                <input
                  type='file'
                  accept='image/*'
                  onChange={async (e) => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    const url = await handleUpload(file);
                    if (url) patchSection(index, { image: url });
                  }}
                />
              </label>
              <label>
                Alt текст
                <input
                  value={section.imageAlt || ''}
                  onChange={(e) => patchSection(index, { imageAlt: e.target.value })}
                />
              </label>
            </>
          ) : null}

          {section.type === 'malfunctions' ? (
            <>
              <label>
                Заголовок
                <input value={section.title} onChange={(e) => patchSection(index, { title: e.target.value })} />
              </label>
              <label>
                Intro
                <input value={section.intro || ''} onChange={(e) => patchSection(index, { intro: e.target.value })} />
              </label>
              <label>
                Пункти (через ;)
                <textarea
                  rows={3}
                  value={section.items.join('; ')}
                  onChange={(e) =>
                    patchSection(index, {
                      items: e.target.value
                        .split(';')
                        .map((s) => s.trim())
                        .filter(Boolean),
                    })
                  }
                />
              </label>
              <label>
                Зображення (URL)
                <input value={section.image} onChange={(e) => patchSection(index, { image: e.target.value })} />
              </label>
              <label>
                Завантажити
                <input
                  type='file'
                  accept='image/*'
                  onChange={async (e) => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    const url = await handleUpload(file);
                    if (url) patchSection(index, { image: url });
                  }}
                />
              </label>
            </>
          ) : null}

          {section.type === 'advantages' ? (
            <>
              <div>Переваги (items):</div>
              {(section.items || []).map((item, i) => (
                <div key={i} className='admin-row admin-row--wrap admin-mb'>
                  <input
                    className='admin-grow'
                    placeholder='icon url'
                    value={item.icon}
                    onChange={(e) => {
                      const items = [...(section.items || [])];
                      items[i] = { ...items[i], icon: e.target.value };
                      patchSection(index, { items });
                    }}
                  />
                  <input
                    className='admin-grow-2'
                    placeholder='text html'
                    value={item.textHtml}
                    onChange={(e) => {
                      const items = [...(section.items || [])];
                      items[i] = { ...items[i], textHtml: e.target.value };
                      patchSection(index, { items });
                    }}
                  />
                  <button
                    type='button'
                    className='admin-btn admin-btn--danger'
                    onClick={() => {
                      const items = (section.items || []).filter((_, ii) => ii !== i);
                      patchSection(index, { items });
                    }}
                  >
                    ×
                  </button>
                </div>
              ))}
              <button
                type='button'
                className='admin-btn admin-btn--secondary'
                onClick={() => {
                  const items = [
                    ...(section.items || []),
                    { icon: '/img/icons/descr_key.png', iconAlt: 'icon', textHtml: 'Нова перевага' },
                  ];
                  patchSection(index, { items });
                }}
              >
                + перевага
              </button>
            </>
          ) : null}

          {section.type === 'about-links' ? (
            <>
              <label>
                Заголовок (HTML)
                <input
                  value={section.titleHtml || ''}
                  onChange={(e) => patchSection(index, { titleHtml: e.target.value })}
                />
              </label>
              <label>
                Subtitle
                <input
                  value={section.subtitle || ''}
                  onChange={(e) => patchSection(index, { subtitle: e.target.value })}
                />
              </label>
              <div>Посилання (items):</div>
              {(section.items || []).map((item, i) => (
                <div key={i} className='admin-row admin-row--wrap admin-mb'>
                  <input
                    placeholder='label'
                    value={item.label}
                    onChange={(e) => {
                      const items = [...(section.items || [])];
                      items[i] = { ...items[i], label: e.target.value };
                      patchSection(index, { items });
                    }}
                  />
                  <input
                    placeholder='href'
                    value={item.href}
                    onChange={(e) => {
                      const items = [...(section.items || [])];
                      items[i] = { ...items[i], href: e.target.value };
                      patchSection(index, { items });
                    }}
                  />
                  <input
                    className='admin-grow'
                    placeholder='image'
                    value={item.image}
                    onChange={(e) => {
                      const items = [...(section.items || [])];
                      items[i] = { ...items[i], image: e.target.value };
                      patchSection(index, { items });
                    }}
                  />
                  <input
                    type='file'
                    accept='image/*'
                    onChange={async (e) => {
                      const file = e.target.files?.[0];
                      if (!file) return;
                      const url = await handleUpload(file);
                      if (url) {
                        const items = [...(section.items || [])];
                        items[i] = { ...items[i], image: url };
                        patchSection(index, { items });
                      }
                    }}
                  />
                  <button
                    type='button'
                    className='admin-btn admin-btn--danger'
                    onClick={() => {
                      const items = (section.items || []).filter((_, ii) => ii !== i);
                      patchSection(index, { items });
                    }}
                  >
                    ×
                  </button>
                </div>
              ))}
              <button
                type='button'
                className='admin-btn admin-btn--secondary'
                onClick={() => {
                  const items = [
                    ...(section.items || []),
                    { href: '#', image: '/img/about-link/other.png', imageAlt: '', label: 'Новий' },
                  ];
                  patchSection(index, { items });
                }}
              >
                + посилання
              </button>
            </>
          ) : null}

          {section.type === 'feedback' ? (
            <>
              <label>
                Кнопка «більше»
                <input
                  value={section.moreReviewsButtonText || ''}
                  onChange={(e) => patchSection(index, { moreReviewsButtonText: e.target.value })}
                />
              </label>
              <div>Зображення відгуків:</div>
              {(section.images || []).map((img, i) => (
                <div key={i} className='admin-row admin-mb'>
                  <input
                    className='admin-grow'
                    value={img}
                    onChange={(e) => {
                      const imgs = [...(section.images || [])];
                      imgs[i] = e.target.value;
                      patchSection(index, { images: imgs });
                    }}
                  />
                  <input
                    type='file'
                    accept='image/*'
                    onChange={async (e) => {
                      const file = e.target.files?.[0];
                      if (!file) return;
                      const url = await handleUpload(file);
                      if (url) {
                        const imgs = [...(section.images || [])];
                        imgs[i] = url;
                        patchSection(index, { images: imgs });
                      }
                    }}
                  />
                  <button
                    type='button'
                    className='admin-btn admin-btn--danger'
                    onClick={() => {
                      const imgs = (section.images || []).filter((_, ii) => ii !== i);
                      patchSection(index, { images: imgs });
                    }}
                  >
                    ×
                  </button>
                </div>
              ))}
              <button
                type='button'
                className='admin-btn admin-btn--secondary'
                onClick={() => {
                  const imgs = [...(section.images || []), '/img/feedback/feed-1.jpg'];
                  patchSection(index, { images: imgs });
                }}
              >
                + зображення
              </button>
            </>
          ) : null}

          {section.type === 'contacts' ? (
            <>
              <label>
                Заголовок
                <input value={section.title} onChange={(e) => patchSection(index, { title: e.target.value })} />
              </label>
              <label>
                Invite text
                <input
                  value={section.inviteText || ''}
                  onChange={(e) => patchSection(index, { inviteText: e.target.value })}
                />
              </label>
              <label>
                Address HTML
                <textarea
                  rows={2}
                  value={section.addressHtml || ''}
                  onChange={(e) => patchSection(index, { addressHtml: e.target.value })}
                />
              </label>
              <label>
                Email
                <input value={section.email || ''} onChange={(e) => patchSection(index, { email: e.target.value })} />
              </label>
              <label>
                Map embed URL
                <input
                  value={section.mapEmbedUrl || ''}
                  onChange={(e) => patchSection(index, { mapEmbedUrl: e.target.value })}
                />
              </label>
            </>
          ) : null}

          {section.type === 'callback' || section.type === 'shop-grid' ? (
            <label>
              Заголовок
              <input
                value={'title' in section ? String(section.title ?? '') : ''}
                onChange={(e) => patchSection(index, { title: e.target.value })}
              />
            </label>
          ) : null}
        </div>
      ))}
    </div>
  );
}
