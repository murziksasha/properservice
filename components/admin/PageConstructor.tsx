'use client';

import type { Section, SiteData } from '@/lib/types';
import { useMemo, useState } from 'react';

function uid() {
  return Math.random().toString(36).slice(2, 10);
}

const SECTION_TYPES = [
  'hero', 'advantages', 'malfunctions', 'about-links', 'callback', 'feedback', 'contacts', 'shop-grid',
] as const;

function newSection(type: (typeof SECTION_TYPES)[number]): Section {
  const id = uid();
  switch (type) {
    case 'hero':
      return { id, type, visible: true, titleHtml: 'Заголовок', aboutLines: [''], callbackTitle: 'Залиште заявку', callbackButtonText: 'Надіслати', callbackPlaceholder: '+38( ___ ) __ __ ___', image: '/img/services/technika_img.png', imageAlt: 'image' };
    case 'advantages':
      return { id, type, visible: true, items: [] };
    case 'malfunctions':
      return { id, type, visible: true, title: 'Несправності', intro: '', items: [''], image: '/img/services/technika_img.png', imageAlt: 'image' };
    case 'about-links':
      return { id, type, visible: true, titleHtml: 'Заголовок', subtitle: '', items: [] };
    case 'callback':
      return { id, type, visible: true, title: 'Залиште заявку', buttonText: 'Надіслати', placeholder: '+38( ___ ) __ __ ___' };
    case 'feedback':
      return { id, type, visible: true, images: ['/img/feedback/feed-1.jpg'], moreReviewsButtonText: 'Більше відгуків' };
    case 'contacts':
      return { id, type, visible: true, title: 'Контакти', inviteText: '', addressHtml: '', phones: [], email: '', social: [], mapEmbedUrl: '' };
    case 'shop-grid':
      return { id, type, visible: true, title: 'Магазин', subtitle: '' };
    default:
      return { id, type: 'callback', visible: true, title: '', buttonText: '', placeholder: '' };
  }
}

export function PageConstructor({ initialData, pageSlug }: { initialData: SiteData; pageSlug: string }) {
  const [data, setData] = useState(initialData);
  const pageIndex = useMemo(() => data.pages.findIndex((p) => p.slug === pageSlug), [data, pageSlug]);
  const page = data.pages[pageIndex];

  if (!page) return <p>Сторінку не знайдено</p>;

  function updatePage(patch: Partial<typeof page>) {
    const pages = [...data.pages];
    pages[pageIndex] = { ...page, ...patch };
    setData({ ...data, pages });
  }

  function updateSections(sections: Section[]) {
    updatePage({ sections });
  }

  function moveSection(index: number, dir: -1 | 1) {
    const sections = [...page.sections];
    const target = index + dir;
    if (target < 0 || target >= sections.length) return;
    [sections[index], sections[target]] = [sections[target], sections[index]];
    updateSections(sections);
  }

  async function uploadImage(file: File): Promise<string> {
    const formData = new FormData();
    formData.append('file', file);
    const res = await fetch('/api/upload', { method: 'POST', body: formData });
    if (!res.ok) {
      alert('Upload failed');
      return '';
    }
    const json = await res.json();
    return json.url as string;
  }

  async function save() {
    await fetch('/api/site', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    alert('Збережено');
  }

  return (
    <div>
      {/* Page level controls */}
      <div className="admin-card" style={{ marginBottom: 16 }}>
        <div className="admin-row" style={{ marginBottom: 12 }}>
          <button type="button" className="admin-btn" onClick={save}>Зберегти</button>
          <a href={pageSlug ? `/${pageSlug}` : '/'} target="_blank" className="admin-btn admin-btn--secondary">Перегляд</a>
          <select onChange={(e) => {
            if (!e.target.value) return;
            updateSections([...page.sections, newSection(e.target.value as (typeof SECTION_TYPES)[number])]);
            e.target.value = '';
          }} defaultValue="">
            <option value="">+ Додати секцію</option>
            {SECTION_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>

        <label>Назва сторінки
          <input value={page.title} onChange={(e) => updatePage({ title: e.target.value })} />
        </label>
        <label>Опис (meta)
          <input value={page.description} onChange={(e) => updatePage({ description: e.target.value })} />
        </label>
        <div className="admin-row" style={{ gap: 16, alignItems: 'center' }}>
          <label>
            <input type="checkbox" checked={page.visible} onChange={(e) => updatePage({ visible: e.target.checked })} /> Видима
          </label>
          <label style={{ minWidth: 180 }}>
            Розмір заголовків (rem)
            <input
              type="number"
              step="0.1"
              value={page.titleSize ?? 4.6}
              onChange={(e) => updatePage({ titleSize: parseFloat(e.target.value) || undefined })}
            />
          </label>
          <label style={{ minWidth: 160 }}>
            Масштаб тексту
            <input
              type="number"
              step="0.1"
              min={0.6}
              max={1.6}
              value={page.textScale ?? 1}
              onChange={(e) => updatePage({ textScale: parseFloat(e.target.value) || undefined })}
            />
          </label>
          <span style={{ fontSize: '0.8rem', color: '#666' }}> (застосується після збереження та перегляду)</span>
        </div>
      </div>

      {page.sections.map((section, index) => (
        <div key={section.id} className="admin-section-item">
          <div className="admin-row" style={{ justifyContent: 'space-between' }}>
            <strong>{section.type}</strong>
            <div className="admin-row">
              <label>
                <input
                  type="checkbox"
                  checked={section.visible}
                  onChange={(e) => {
                    const sections = [...page.sections];
                    sections[index] = { ...section, visible: e.target.checked };
                    updateSections(sections);
                  }}
                />
                {' '}on
              </label>
              <button type="button" className="admin-btn admin-btn--secondary" onClick={() => moveSection(index, -1)}>↑</button>
              <button type="button" className="admin-btn admin-btn--secondary" onClick={() => moveSection(index, 1)}>↓</button>
              <button type="button" className="admin-btn admin-btn--danger" onClick={() => updateSections(page.sections.filter((_, i) => i !== index))}>×</button>
            </div>
          </div>

          {/* HERO */}
          {section.type === 'hero' ? (
            <>
              <label>Заголовок (HTML)<textarea rows={2} value={section.titleHtml} onChange={(e) => {
                const sections = [...page.sections];
                sections[index] = { ...section, titleHtml: e.target.value };
                updateSections(sections);
              }} /></label>
              <label>Зображення (URL)<input value={section.image} onChange={(e) => {
                const sections = [...page.sections];
                sections[index] = { ...section, image: e.target.value };
                updateSections(sections);
              }} /></label>
              <label>Завантажити зображення <input type="file" accept="image/*" onChange={async (e) => {
                const file = e.target.files?.[0]; if (!file) return;
                const url = await uploadImage(file);
                if (url) {
                  const sections = [...page.sections];
                  sections[index] = { ...section, image: url };
                  updateSections(sections);
                }
              }} /></label>
              <label>Alt текст<input value={section.imageAlt || ''} onChange={(e) => {
                const sections = [...page.sections]; sections[index] = { ...section, imageAlt: e.target.value }; updateSections(sections);
              }} /></label>
            </>
          ) : null}

          {/* MALFUNCTIONS */}
          {section.type === 'malfunctions' ? (
            <>
              <label>Заголовок<input value={section.title} onChange={(e) => {
                const sections = [...page.sections];
                sections[index] = { ...section, title: e.target.value };
                updateSections(sections);
              }} /></label>
              <label>Intro<input value={section.intro || ''} onChange={(e) => {
                const sections = [...page.sections]; sections[index] = { ...section, intro: e.target.value }; updateSections(sections);
              }} /></label>
              <label>Пункти (через ;)<textarea rows={3} value={section.items.join('; ')} onChange={(e) => {
                const sections = [...page.sections];
                sections[index] = { ...section, items: e.target.value.split(';').map((s) => s.trim()).filter(Boolean) };
                updateSections(sections);
              }} /></label>
              <label>Зображення (URL)<input value={section.image} onChange={(e) => {
                const sections = [...page.sections]; sections[index] = { ...section, image: e.target.value }; updateSections(sections);
              }} /></label>
              <label>Завантажити<input type="file" accept="image/*" onChange={async (e) => {
                const file = e.target.files?.[0]; if (!file) return;
                const url = await uploadImage(file); if (url) {
                  const sections = [...page.sections]; sections[index] = { ...section, image: url }; updateSections(sections);
                }
              }} /></label>
            </>
          ) : null}

          {/* ADVANTAGES */}
          {section.type === 'advantages' ? (
            <>
              <div>Переваги (items):</div>
              {(section.items || []).map((item, i) => (
                <div key={i} className="admin-row" style={{ gap: 8, marginBottom: 4 }}>
                  <input placeholder="icon url" value={item.icon} onChange={(e) => {
                    const sections = [...page.sections]; const items = [...(section.items || [])];
                    items[i] = { ...items[i], icon: e.target.value }; sections[index] = { ...section, items }; updateSections(sections);
                  }} style={{ flex: 1 }} />
                  <input placeholder="text html" value={item.textHtml} onChange={(e) => {
                    const sections = [...page.sections]; const items = [...(section.items || [])];
                    items[i] = { ...items[i], textHtml: e.target.value }; sections[index] = { ...section, items }; updateSections(sections);
                  }} style={{ flex: 2 }} />
                  <button type="button" className="admin-btn admin-btn--danger" onClick={() => {
                    const sections = [...page.sections]; const items = (section.items || []).filter((_, ii) => ii !== i);
                    sections[index] = { ...section, items }; updateSections(sections);
                  }}>×</button>
                </div>
              ))}
              <button type="button" className="admin-btn admin-btn--secondary" onClick={() => {
                const sections = [...page.sections]; const items = [...(section.items || []), { icon: '/img/icons/descr_key.png', iconAlt: 'icon', textHtml: 'Нова перевага' }];
                sections[index] = { ...section, items }; updateSections(sections);
              }}>+ перевага</button>
            </>
          ) : null}

          {/* ABOUT-LINKS */}
          {section.type === 'about-links' ? (
            <>
              <label>Заголовок (HTML)<input value={section.titleHtml || ''} onChange={(e) => {
                const sections = [...page.sections]; sections[index] = { ...section, titleHtml: e.target.value }; updateSections(sections);
              }} /></label>
              <label>Subtitle<input value={section.subtitle || ''} onChange={(e) => {
                const sections = [...page.sections]; sections[index] = { ...section, subtitle: e.target.value }; updateSections(sections);
              }} /></label>
              <div>Посилання (items):</div>
              {(section.items || []).map((item, i) => (
                <div key={i} className="admin-row" style={{ gap: 8, marginBottom: 4, flexWrap: 'wrap' }}>
                  <input placeholder="label" value={item.label} onChange={(e) => {
                    const sections = [...page.sections]; const items = [...(section.items || [])];
                    items[i] = { ...items[i], label: e.target.value }; sections[index] = { ...section, items }; updateSections(sections);
                  }} />
                  <input placeholder="href" value={item.href} onChange={(e) => {
                    const sections = [...page.sections]; const items = [...(section.items || [])];
                    items[i] = { ...items[i], href: e.target.value }; sections[index] = { ...section, items }; updateSections(sections);
                  }} />
                  <input placeholder="image" value={item.image} onChange={(e) => {
                    const sections = [...page.sections]; const items = [...(section.items || [])];
                    items[i] = { ...items[i], image: e.target.value }; sections[index] = { ...section, items }; updateSections(sections);
                  }} style={{ flex: 1 }} />
                  <input type="file" accept="image/*" onChange={async (e) => {
                    const file = e.target.files?.[0]; if (!file) return;
                    const url = await uploadImage(file); if (url) {
                      const sections = [...page.sections]; const items = [...(section.items || [])];
                      items[i] = { ...items[i], image: url }; sections[index] = { ...section, items }; updateSections(sections);
                    }
                  }} />
                  <button type="button" className="admin-btn admin-btn--danger" onClick={() => {
                    const sections = [...page.sections]; const items = (section.items || []).filter((_, ii) => ii !== i);
                    sections[index] = { ...section, items }; updateSections(sections);
                  }}>×</button>
                </div>
              ))}
              <button type="button" className="admin-btn admin-btn--secondary" onClick={() => {
                const sections = [...page.sections]; const items = [...(section.items || []), { href: '#', image: '/img/about-link/other.png', imageAlt: '', label: 'Новий' }];
                sections[index] = { ...section, items }; updateSections(sections);
              }}>+ посилання</button>
            </>
          ) : null}

          {/* FEEDBACK */}
          {section.type === 'feedback' ? (
            <>
              <label>Кнопка "більше"<input value={section.moreReviewsButtonText || ''} onChange={(e) => {
                const sections = [...page.sections]; sections[index] = { ...section, moreReviewsButtonText: e.target.value }; updateSections(sections);
              }} /></label>
              <div>Зображення відгуків:</div>
              {(section.images || []).map((img, i) => (
                <div key={i} className="admin-row" style={{ gap: 6 }}>
                  <input value={img} onChange={(e) => {
                    const sections = [...page.sections]; const imgs = [...(section.images || [])]; imgs[i] = e.target.value;
                    sections[index] = { ...section, images: imgs }; updateSections(sections);
                  }} style={{ flex: 1 }} />
                  <input type="file" accept="image/*" onChange={async (e) => {
                    const file = e.target.files?.[0]; if (!file) return;
                    const url = await uploadImage(file); if (url) {
                      const sections = [...page.sections]; const imgs = [...(section.images || [])]; imgs[i] = url;
                      sections[index] = { ...section, images: imgs }; updateSections(sections);
                    }
                  }} />
                  <button className="admin-btn admin-btn--danger" onClick={() => {
                    const sections = [...page.sections]; const imgs = (section.images || []).filter((_, ii) => ii !== i);
                    sections[index] = { ...section, images: imgs }; updateSections(sections);
                  }}>×</button>
                </div>
              ))}
              <button type="button" className="admin-btn admin-btn--secondary" onClick={() => {
                const sections = [...page.sections]; const imgs = [...(section.images || []), '/img/feedback/feed-1.jpg'];
                sections[index] = { ...section, images: imgs }; updateSections(sections);
              }}>+ зображення</button>
            </>
          ) : null}

          {/* CONTACTS (basic) */}
          {section.type === 'contacts' ? (
            <>
              <label>Заголовок<input value={section.title} onChange={(e) => { const s = [...page.sections]; s[index] = { ...section, title: e.target.value }; updateSections(s); }} /></label>
              <label>Invite text<input value={section.inviteText || ''} onChange={(e) => { const s = [...page.sections]; s[index] = { ...section, inviteText: e.target.value }; updateSections(s); }} /></label>
              <label>Address HTML<textarea rows={2} value={section.addressHtml || ''} onChange={(e) => { const s = [...page.sections]; s[index] = { ...section, addressHtml: e.target.value }; updateSections(s); }} /></label>
              <label>Email<input value={section.email || ''} onChange={(e) => { const s = [...page.sections]; s[index] = { ...section, email: e.target.value }; updateSections(s); }} /></label>
              <label>Map embed URL<input value={section.mapEmbedUrl || ''} onChange={(e) => { const s = [...page.sections]; s[index] = { ...section, mapEmbedUrl: e.target.value }; updateSections(s); }} /></label>
            </>
          ) : null}

          {/* CALLBACK / SHOP-GRID */}
          {section.type === 'callback' || section.type === 'shop-grid' ? (
            <label>Заголовок<input value={'title' in section ? String(section.title ?? '') : ''} onChange={(e) => {
              const sections = [...page.sections];
              sections[index] = { ...section, title: e.target.value } as Section;
              updateSections(sections);
            }} /></label>
          ) : null}
        </div>
      ))}
    </div>
  );
}