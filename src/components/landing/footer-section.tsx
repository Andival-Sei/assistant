import { Link } from "react-router-dom";

export function FooterSection() {
  return (
    <footer className="relative border-t border-zinc-200/50 dark:border-zinc-800/50 bg-white/50 dark:bg-zinc-950/50 backdrop-blur-sm">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="space-y-4">
            <h3 className="text-2xl font-bold bg-gradient-to-r from-emerald-500 to-cyan-500 bg-clip-text text-transparent">
              Ассистент
            </h3>
            <p className="text-zinc-600 dark:text-zinc-400">
              Финансы, здоровье, списки и семья в одном приложении
            </p>
          </div>
          <div className="space-y-4">
            <h4 className="text-zinc-900 dark:text-white font-semibold">
              Ссылки
            </h4>
            <ul className="space-y-2">
              <li>
                <Link
                  to="/privacy"
                  className="text-zinc-600 dark:text-zinc-400 hover:text-emerald-500 dark:hover:text-emerald-400 transition-colors"
                >
                  Политика конфиденциальности
                </Link>
              </li>
              <li>
                <Link
                  to="/terms"
                  className="text-zinc-600 dark:text-zinc-400 hover:text-emerald-500 dark:hover:text-emerald-400 transition-colors"
                >
                  Условия использования
                </Link>
              </li>
            </ul>
          </div>
          <div className="space-y-4">
            <h4 className="text-zinc-900 dark:text-white font-semibold">
              Обратная связь
            </h4>
            <p className="text-zinc-600 dark:text-zinc-400 text-sm">
              Свяжитесь с нами по любым вопросам
            </p>
            <div className="flex items-center gap-2 text-zinc-600 dark:text-zinc-400">
              <span className="text-sm">support@assistant.app</span>
            </div>
          </div>
        </div>
        <div className="mt-8 pt-8 border-t border-zinc-200/50 dark:border-zinc-800/50 text-center text-zinc-600 dark:text-zinc-400">
          <p>© {new Date().getFullYear()} Ассистент. Все права защищены.</p>
        </div>
      </div>
    </footer>
  );
}
