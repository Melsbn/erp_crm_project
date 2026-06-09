
import { Globe } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';

const LANGUAGES = ['fr', 'en'] as const;

export function LanguageSwitcher() {
  const { i18n, t } = useTranslation();
  const currentLanguage = i18n.resolvedLanguage === 'en' ? 'en' : 'fr';

  return (
    <div className="flex items-center gap-1 rounded-full border border-slate-200 bg-white/80 p-1 dark:border-slate-700 dark:bg-slate-900">
      <Globe className="ml-2 h-3.5 w-3.5 text-slate-500 dark:text-slate-400" />
      {LANGUAGES.map((language) => {
        const isActive = currentLanguage === language;

        return (
          <Button
            key={language}
            type="button"
            variant={isActive ? 'default' : 'ghost'}
            size="sm"
            onClick={() => i18n.changeLanguage(language)}
            className={
              isActive
                ? 'h-7 rounded-full px-2 text-xs'
                : 'h-7 rounded-full px-2 text-xs text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-slate-100'
            }
            aria-label={language === 'fr' ? 'Français' : 'English'}
          >
            {t(`language.${language}`)}
          </Button>
        );
      })}
    </div>
  );
}
 

