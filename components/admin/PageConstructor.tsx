'use client';

import type { PhoneEntry, Section, SiteData, SocialLink } from '@/lib/types';
import { saveSiteData } from '@/lib/admin/saveSite';
import { uploadImage } from '@/lib/admin/uploadImage';
import { moveByDir, reorderItems } from '@/lib/admin/reorder';
import { useSaveShortcut, useUnsavedGuard } from '@/lib/admin/useUnsavedGuard';
import { createId } from '@/lib/id';
import { SECTION_LABELS, SECTION_TYPES, newSection } from '@/lib/section-factory';
import { useCallback, useMemo, useRef, useState } from 'react';
import { showToast } from './AdminToast';
import { ImageField } from './ImageField';

const SOCIAL_TYPES = [
  { type: 'viber', icon: '/img/icons/viber.svg' },
  { type: 'telegram', icon: '/img/icons/telegram.svg' },
  { type: 'instagram', icon: '/img/icons/instagram.svg' },
  { type: 'youtube', icon: '/img/icons/youtube.svg' },
] as const;

export function PageConstructor({ initialData, pageSlug }: { initialData: SiteData; pageSlug: string }) {
  const [data, setData] = useState(initialData);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewKey, setPreviewKey] = useState(0);
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const pageIndex = useMemo(() => data.pages.findIndex((p) => p.slug === pageSlug), [data, pageSlug]);
  const page = data.pages[pageIndex];
  const publicPath = pageSlug ? `/${pageSlug}` : '/';

  useUnsavedGuard(dirty);

  const reloadPreview = useCallback(() => {
    setPreviewKey((k) => k + 1);
  }, []);

  const save = useCallback(async () => {
    setSaving(true);
    const result = await saveSiteData(data);
    setSaving(false);
    if (result.ok) {
      if (result.updatedAt) {
        setData((prev) => ({ ...prev, updatedAt: result.updatedAt }));
      }
      setDirty(false);
      showToast('Збережено', 'success');
      reloadPreview();
    } else {
      showToast(result.error, 'error');
    }
  }, [data, reloadPreview]);

  useSaveShortcut(save, { dirty, enabled: !saving });

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
    updateSections(moveByDir(page.sections, index, dir));
  }

  function reorderSections(from: number, to: number) {
    updateSections(reorderItems(page.sections, from, to));
  }

  function duplicateSection(index: number) {
    const original = page.sections[index];
    if (!original) return;
    const copy = { ...structuredClone(original), id: createId() } as Section;
    const sections = [...page.sections];
    sections.splice(index + 1, 0, copy);
    updateSections(sections);
    setCollapsed((prev) => ({ ...prev, [copy.id]: false }));
    showToast('Секцію скопійовано', 'info');
  }

  function toggleCollapsed(id: string) {
    setCollapsed((prev) => ({ ...prev, [id]: !prev[id] }));
  }

  function setAllCollapsed(value: boolean) {
    const next: Record<string, boolean> = {};
    for (const s of page.sections) next[s.id] = value;
    setCollapsed(next);
  }

  async function handleUpload(file: File): Promise<string> {
    const { url, error } = await uploadImage(file);
    if (!url) {
      showToast(error || 'Помилка завантаження', 'error');
      return '';
    }
    return url;
  }

  return (
    <div className={previewOpen ? 'admin-constructor admin-constructor--split' : 'admin-constructor'}>
      <div className='admin-constructor__editor'>
      <div className='admin-card admin-constructor-toolbar'>
        <div className='admin-toolbar'>
          <button type='button' className='admin-btn' onClick={() => void save()} disabled={saving}>
            {saving ? 'Збереження…' : 'Зберегти'}
          </button>
          <button
            type='button'
            className={`admin-btn admin-btn--secondary${previewOpen ? ' is-active' : ''}`}
            onClick={() => {
              setPreviewOpen((v) => !v);
              if (!previewOpen) reloadPreview();
            }}
          >
            {previewOpen ? 'Закрити preview' : 'Preview'}
          </button>
          <a href={publicPath} target='_blank' rel='noreferrer' className='admin-btn admin-btn--secondary'>
            Нова вкладка ↗
          </a>
          <select
            className='admin-select'
            aria-label='Додати секцію'
            onChange={(e) => {
              if (!e.target.value) return;
              const created = newSection(e.target.value);
              updateSections([...page.sections, created]);
              setCollapsed((prev) => ({ ...prev, [created.id]: false }));
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
          <button type='button' className='admin-btn admin-btn--secondary' onClick={() => setAllCollapsed(true)}>
            Згорнути всі
          </button>
          <button type='button' className='admin-btn admin-btn--secondary' onClick={() => setAllCollapsed(false)}>
            Розгорнути всі
          </button>
          {dirty ? <span className='admin-dirty'>Є незбережені зміни · Ctrl+S</span> : null}
        </div>
        <p className='admin-hint'>Перетягуйте секції за ⠿ або кнопками ↑↓. Preview показує збережену версію сторінки.</p>
      </div>

      <div className='admin-card'>
        <div className='admin-form'>
          <label>
            Назва сторінки
            <input value={page.title} onChange={(e) => updatePage({ title: e.target.value })} />
          </label>
          <label>
            Опис (meta)
            <input value={page.description} onChange={(e) => updatePage({ description: e.target.value })} />
          </label>
          <div
            className='admin-card'
            style={
              page.contentHtml
                ? { background: '#fff8e6', border: '1px solid #f0d78c' }
                : undefined
            }
          >
            {page.contentHtml ? (
              <p className='admin-hint' style={{ marginTop: 0 }}>
                <strong>HTML-режим активний:</strong> на публічному сайті показується лише цей HTML —
                секції конструктора <strong>ігноруються</strong>. Очистіть поле, щоб увімкнути секції.
              </p>
            ) : (
              <p className='admin-hint' style={{ marginTop: 0 }}>
                Опційний HTML (політика тощо). Якщо заповнено — секції на сайті не рендеряться.
              </p>
            )}
            <label>
              contentHtml
              <textarea
                rows={page.contentHtml ? 10 : 4}
                value={page.contentHtml || ''}
                onChange={(e) => updatePage({ contentHtml: e.target.value })}
                style={{ width: '100%', fontFamily: 'monospace', fontSize: '13px' }}
                placeholder='Залиште порожнім, щоб використовувати секції'
              />
            </label>
            {page.contentHtml ? (
              <button
                type='button'
                className='admin-btn admin-btn--secondary'
                onClick={() => {
                  if (confirm('Очистити HTML і показувати секції конструктора?')) {
                    updatePage({ contentHtml: '' });
                  }
                }}
              >
                Очистити HTML → секції
              </button>
            ) : null}
          </div>
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

      {page.sections.length === 0 ? (
        <div className='admin-card'>
          <p className='admin-hint'>Секцій ще немає — додайте через «+ Додати секцію» вище.</p>
        </div>
      ) : null}

      {page.sections.map((section, index) => {
        const isCollapsed = Boolean(collapsed[section.id]);
        const isDragging = dragIndex === index;
        const isDropTarget = dragOverIndex === index && dragIndex !== null && dragIndex !== index;
        return (
          <div
            key={section.id}
            className={`admin-section-item admin-form${isCollapsed ? ' is-collapsed' : ''}${
              section.visible ? '' : ' is-hidden-section'
            }${isDragging ? ' is-dragging' : ''}${isDropTarget ? ' is-drop-target' : ''}`}
            draggable
            onDragStart={(e) => {
              const target = e.target as HTMLElement;
              // Only start drag from the handle — avoid stealing focus from inputs
              if (!target.closest('.admin-drag-handle')) {
                e.preventDefault();
                return;
              }
              setDragIndex(index);
              e.dataTransfer.effectAllowed = 'move';
              e.dataTransfer.setData('text/plain', String(index));
            }}
            onDragEnd={() => {
              setDragIndex(null);
              setDragOverIndex(null);
            }}
            onDragOver={(e) => {
              e.preventDefault();
              e.dataTransfer.dropEffect = 'move';
              if (dragOverIndex !== index) setDragOverIndex(index);
            }}
            onDragLeave={() => {
              if (dragOverIndex === index) setDragOverIndex(null);
            }}
            onDrop={(e) => {
              e.preventDefault();
              const fromRaw = e.dataTransfer.getData('text/plain');
              const from = fromRaw ? Number(fromRaw) : dragIndex;
              if (from != null && Number.isFinite(from)) {
                reorderSections(from, index);
              }
              setDragIndex(null);
              setDragOverIndex(null);
            }}
          >
            <div className='admin-row admin-row--between'>
              <div className='admin-row admin-section-head'>
                <span
                  className='admin-drag-handle'
                  title='Перетягнути секцію'
                  role='button'
                  tabIndex={0}
                  aria-label={`Перетягнути секцію ${index + 1}`}
                  onKeyDown={(e) => {
                    if (e.key === 'ArrowUp' && index > 0) {
                      e.preventDefault();
                      moveSection(index, -1);
                    }
                    if (e.key === 'ArrowDown' && index < page.sections.length - 1) {
                      e.preventDefault();
                      moveSection(index, 1);
                    }
                  }}
                >
                  ⠿
                </span>
                <button
                  type='button'
                  className='admin-section-toggle'
                  onClick={() => toggleCollapsed(section.id)}
                  aria-expanded={!isCollapsed}
                >
                  <span className='admin-section-chevron' aria-hidden>
                    {isCollapsed ? '▸' : '▾'}
                  </span>
                  <strong>
                    {index + 1}. {SECTION_LABELS[section.type] || section.type}
                  </strong>
                  {!section.visible ? <span className='admin-badge'>прихована</span> : null}
                </button>
              </div>
              <div className='admin-row'>
                <label className='admin-check'>
                  <input
                    type='checkbox'
                    checked={section.visible}
                    onChange={(e) => patchSection(index, { visible: e.target.checked })}
                  />
                  видима
                </label>
                <button
                  type='button'
                  className='admin-btn admin-btn--secondary'
                  title='Вгору'
                  aria-label='Перемістити вгору'
                  disabled={index === 0}
                  onClick={() => moveSection(index, -1)}
                >
                  ↑
                </button>
                <button
                  type='button'
                  className='admin-btn admin-btn--secondary'
                  title='Вниз'
                  aria-label='Перемістити вниз'
                  disabled={index === page.sections.length - 1}
                  onClick={() => moveSection(index, 1)}
                >
                  ↓
                </button>
                <button
                  type='button'
                  className='admin-btn admin-btn--secondary'
                  title='Дублювати'
                  aria-label='Дублювати секцію'
                  onClick={() => duplicateSection(index)}
                >
                  ⧉
                </button>
                <button
                  type='button'
                  className='admin-btn admin-btn--danger'
                  aria-label='Видалити секцію'
                  onClick={() => {
                    if (!confirm('Видалити секцію?')) return;
                    updateSections(page.sections.filter((_, i) => i !== index));
                  }}
                >
                  ×
                </button>
              </div>
            </div>

            {!isCollapsed ? (
              <div className='admin-section-body'>
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
                      Рядки «про сервіс» (кожен з нового рядка, HTML)
                      <textarea
                        rows={4}
                        value={(section.aboutLines || []).join('\n')}
                        onChange={(e) =>
                          patchSection(index, {
                            aboutLines: e.target.value.split('\n'),
                          })
                        }
                      />
                    </label>
                    <label>
                      Заголовок форми
                      <input
                        value={section.callbackTitleHtml || section.callbackTitle || ''}
                        onChange={(e) =>
                          patchSection(index, {
                            callbackTitle: e.target.value,
                            callbackTitleHtml: e.target.value,
                          })
                        }
                      />
                    </label>
                    <div className='admin-row admin-row--wrap'>
                      <label className='admin-grow'>
                        Текст кнопки
                        <input
                          value={section.callbackButtonText || ''}
                          onChange={(e) => patchSection(index, { callbackButtonText: e.target.value })}
                        />
                      </label>
                      <label className='admin-grow'>
                        Placeholder телефону
                        <input
                          value={section.callbackPlaceholder || ''}
                          onChange={(e) => patchSection(index, { callbackPlaceholder: e.target.value })}
                        />
                      </label>
                    </div>
                    <label>
                      Активний slug у навігації послуг
                      <input
                        value={section.activeServiceSlug || ''}
                        onChange={(e) => patchSection(index, { activeServiceSlug: e.target.value })}
                        placeholder='напр. phones'
                      />
                    </label>
                    <ImageField
                      value={section.image}
                      alt={section.imageAlt}
                      onChange={(url) => patchSection(index, { image: url })}
                      onAltChange={(imageAlt) => patchSection(index, { imageAlt })}
                      onUpload={handleUpload}
                    />
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
                      <input
                        value={section.intro || ''}
                        onChange={(e) => patchSection(index, { intro: e.target.value })}
                      />
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
                    <ImageField
                      value={section.image}
                      onChange={(url) => patchSection(index, { image: url })}
                      onUpload={handleUpload}
                    />
                  </>
                ) : null}

                {section.type === 'advantages' ? (
                  <>
                    <div className='admin-subhead'>Переваги</div>
                    {(section.items || []).map((item, i) => (
                      <div key={i} className='admin-nested-card'>
                        <ImageField
                          label='Іконка'
                          value={item.icon}
                          onChange={(url) => {
                            const items = [...(section.items || [])];
                            items[i] = { ...items[i], icon: url };
                            patchSection(index, { items });
                          }}
                          onUpload={handleUpload}
                        />
                        <label>
                          Текст (HTML)
                          <input
                            value={item.textHtml}
                            onChange={(e) => {
                              const items = [...(section.items || [])];
                              items[i] = { ...items[i], textHtml: e.target.value };
                              patchSection(index, { items });
                            }}
                          />
                        </label>
                        <button
                          type='button'
                          className='admin-btn admin-btn--danger'
                          onClick={() => {
                            const items = (section.items || []).filter((_, ii) => ii !== i);
                            patchSection(index, { items });
                          }}
                        >
                          Видалити перевагу
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
                    <div className='admin-subhead'>Посилання</div>
                    {(section.items || []).map((item, i) => (
                      <div key={i} className='admin-nested-card'>
                        <label>
                          Назва
                          <input
                            value={item.label}
                            onChange={(e) => {
                              const items = [...(section.items || [])];
                              items[i] = { ...items[i], label: e.target.value };
                              patchSection(index, { items });
                            }}
                          />
                        </label>
                        <label>
                          Посилання
                          <input
                            value={item.href}
                            onChange={(e) => {
                              const items = [...(section.items || [])];
                              items[i] = { ...items[i], href: e.target.value };
                              patchSection(index, { items });
                            }}
                          />
                        </label>
                        <ImageField
                          value={item.image}
                          onChange={(url) => {
                            const items = [...(section.items || [])];
                            items[i] = { ...items[i], image: url };
                            patchSection(index, { items });
                          }}
                          onUpload={handleUpload}
                        />
                        <button
                          type='button'
                          className='admin-btn admin-btn--danger'
                          onClick={() => {
                            const items = (section.items || []).filter((_, ii) => ii !== i);
                            patchSection(index, { items });
                          }}
                        >
                          Видалити
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
                    <div className='admin-subhead'>Зображення відгуків</div>
                    {(section.images || []).map((img, i) => (
                      <div key={i} className='admin-nested-card'>
                        <ImageField
                          value={img}
                          onChange={(url) => {
                            const imgs = [...(section.images || [])];
                            imgs[i] = url;
                            patchSection(index, { images: imgs });
                          }}
                          onUpload={handleUpload}
                        />
                        <button
                          type='button'
                          className='admin-btn admin-btn--danger'
                          onClick={() => {
                            const imgs = (section.images || []).filter((_, ii) => ii !== i);
                            patchSection(index, { images: imgs });
                          }}
                        >
                          Видалити
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
                      <input
                        value={section.email || ''}
                        onChange={(e) => patchSection(index, { email: e.target.value })}
                      />
                    </label>
                    <label>
                      Map embed URL
                      <input
                        value={section.mapEmbedUrl || ''}
                        onChange={(e) => patchSection(index, { mapEmbedUrl: e.target.value })}
                      />
                    </label>

                    <div className='admin-row admin-row--between admin-mb'>
                      <div className='admin-subhead' style={{ margin: 0 }}>
                        Телефони секції
                      </div>
                      <div className='admin-row'>
                        <button
                          type='button'
                          className='admin-btn admin-btn--secondary'
                          onClick={() => {
                            const fromSettings: PhoneEntry[] = [];
                            if (data.settings.headerPhone?.tel || data.settings.headerPhone?.display) {
                              fromSettings.push({ ...data.settings.headerPhone });
                            }
                            for (const p of data.settings.phones || []) {
                              if (!fromSettings.some((x) => x.tel === p.tel)) fromSettings.push({ ...p });
                            }
                            patchSection(index, {
                              phones: fromSettings,
                              email: section.email || data.settings.email,
                              mapEmbedUrl: section.mapEmbedUrl || data.settings.mapEmbedUrl,
                              social: section.social?.length
                                ? section.social
                                : structuredClone(data.settings.social || []),
                              addressHtml:
                                section.addressHtml ||
                                [data.settings.address, data.settings.addressNote].filter(Boolean).join('<br/>'),
                            });
                            showToast('Підтягнуто з Налаштувань', 'info');
                          }}
                        >
                          ↻ З налаштувань
                        </button>
                        <button
                          type='button'
                          className='admin-btn admin-btn--secondary'
                          onClick={() =>
                            patchSection(index, {
                              phones: [...(section.phones || []), { display: '', tel: '' }],
                            })
                          }
                        >
                          + Телефон
                        </button>
                      </div>
                    </div>
                    <p className='admin-hint admin-mb'>
                      Якщо список порожній — на сайті покажуться телефони з Налаштувань.
                    </p>
                    {(section.phones || []).map((phone, pi) => (
                      <div key={pi} className='admin-nested-card'>
                        <div className='admin-row admin-row--wrap'>
                          <label className='admin-grow'>
                            Відображення
                            <input
                              value={phone.display}
                              onChange={(e) => {
                                const phones = [...(section.phones || [])];
                                phones[pi] = { ...phones[pi], display: e.target.value };
                                patchSection(index, { phones });
                              }}
                            />
                          </label>
                          <label className='admin-grow'>
                            tel:
                            <input
                              value={phone.tel}
                              onChange={(e) => {
                                const phones = [...(section.phones || [])];
                                phones[pi] = { ...phones[pi], tel: e.target.value };
                                patchSection(index, { phones });
                              }}
                            />
                          </label>
                          <button
                            type='button'
                            className='admin-btn admin-btn--danger'
                            onClick={() =>
                              patchSection(index, {
                                phones: (section.phones || []).filter((_, ii) => ii !== pi),
                              })
                            }
                          >
                            ×
                          </button>
                        </div>
                      </div>
                    ))}

                    <div className='admin-row admin-row--between admin-mb'>
                      <div className='admin-subhead' style={{ margin: 0 }}>
                        Соцмережі секції
                      </div>
                      <button
                        type='button'
                        className='admin-btn admin-btn--secondary'
                        onClick={() => {
                          const preset = SOCIAL_TYPES[1];
                          const item: SocialLink = {
                            id: createId(),
                            type: preset.type,
                            url: '',
                            icon: preset.icon,
                          };
                          patchSection(index, { social: [...(section.social || []), item] });
                        }}
                      >
                        + Соцмережа
                      </button>
                    </div>
                    {(section.social || []).map((link, si) => (
                      <div key={link.id} className='admin-nested-card'>
                        <div className='admin-row admin-row--wrap'>
                          <label>
                            Тип
                            <select
                              className='admin-select'
                              value={link.type}
                              onChange={(e) => {
                                const type = e.target.value;
                                const preset = SOCIAL_TYPES.find((p) => p.type === type);
                                const social = [...(section.social || [])];
                                social[si] = {
                                  ...social[si],
                                  type,
                                  icon: preset?.icon || social[si].icon,
                                };
                                patchSection(index, { social });
                              }}
                            >
                              {SOCIAL_TYPES.map((p) => (
                                <option key={p.type} value={p.type}>
                                  {p.type}
                                </option>
                              ))}
                            </select>
                          </label>
                          <label className='admin-grow-2'>
                            URL
                            <input
                              value={link.url}
                              onChange={(e) => {
                                const social = [...(section.social || [])];
                                social[si] = { ...social[si], url: e.target.value };
                                patchSection(index, { social });
                              }}
                            />
                          </label>
                          <button
                            type='button'
                            className='admin-btn admin-btn--danger'
                            onClick={() =>
                              patchSection(index, {
                                social: (section.social || []).filter((_, ii) => ii !== si),
                              })
                            }
                          >
                            ×
                          </button>
                        </div>
                      </div>
                    ))}
                  </>
                ) : null}

                {section.type === 'callback' ? (
                  <>
                    <label>
                      Заголовок
                      <input
                        value={section.titleHtml || section.title || ''}
                        onChange={(e) =>
                          patchSection(index, { title: e.target.value, titleHtml: e.target.value })
                        }
                      />
                    </label>
                    <label>
                      Текст кнопки
                      <input
                        value={section.buttonText || ''}
                        onChange={(e) => patchSection(index, { buttonText: e.target.value })}
                      />
                    </label>
                    <label>
                      Placeholder телефону
                      <input
                        value={section.placeholder || ''}
                        onChange={(e) => patchSection(index, { placeholder: e.target.value })}
                      />
                    </label>
                  </>
                ) : null}

                {section.type === 'shop-grid' ? (
                  <>
                    <label>
                      Заголовок
                      <input
                        value={section.title || ''}
                        onChange={(e) => patchSection(index, { title: e.target.value })}
                      />
                    </label>
                    <label>
                      Підзаголовок
                      <input
                        value={section.subtitle || ''}
                        onChange={(e) => patchSection(index, { subtitle: e.target.value })}
                      />
                    </label>
                  </>
                ) : null}
              </div>
            ) : null}
          </div>
        );
      })}
      </div>

      {previewOpen ? (
        <aside className='admin-preview-panel' aria-label='Попередній перегляд сторінки'>
          <div className='admin-preview-toolbar'>
            <strong>Preview</strong>
            <span className='admin-preview-path'>{publicPath}</span>
            {dirty ? <span className='admin-dirty'>Збережіть, щоб оновити</span> : null}
            <button type='button' className='admin-btn admin-btn--secondary' onClick={reloadPreview}>
              Оновити
            </button>
            <a href={publicPath} target='_blank' rel='noreferrer' className='admin-btn admin-btn--secondary'>
              ↗
            </a>
          </div>
          <iframe
            key={previewKey}
            ref={iframeRef}
            className='admin-preview-frame'
            src={publicPath}
            title={`Preview ${publicPath}`}
          />
        </aside>
      ) : null}
    </div>
  );
}
