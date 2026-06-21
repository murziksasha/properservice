import type { CallbackSection as CallbackSectionType } from '@/lib/types';
import { CallbackForm } from '@/components/forms/CallbackForm';

export function CallbackBlock({ section }: { section: CallbackSectionType }) {
  return (
    <div className="about-link__callback _callback">
      <p
        className="_callback__title _paragr"
        dangerouslySetInnerHTML={{ __html: section.titleHtml ?? section.title }}
      />
      <CallbackForm
        buttonText={section.buttonText}
        buttonHtml={section.buttonHtml}
        placeholder={section.placeholder}
      />
    </div>
  );
}