import { LegalLayout } from "@/components/legal/legal-layout";

export function TermsPage() {
  return (
    <LegalLayout
      title="Условия использования"
      subtitle="Эти условия регулируют использование приложения «Ассистент». Продолжая использование сервиса, вы подтверждаете согласие с документом."
      effectiveDate="14 февраля 2026"
    >
      <section>
        <h2 className="text-xl font-bold text-zinc-900 dark:text-zinc-100">
          1. Общие положения
        </h2>
        <p className="mt-2 text-sm leading-relaxed text-zinc-600 dark:text-zinc-300">
          Приложение предоставляет инструменты для учета финансов, отслеживания
          данных здоровья и организации задач. Сервис предоставляется по модели
          «как есть».
        </p>
      </section>

      <section>
        <h2 className="text-xl font-bold text-zinc-900 dark:text-zinc-100">
          2. Аккаунт пользователя
        </h2>
        <p className="mt-2 text-sm leading-relaxed text-zinc-600 dark:text-zinc-300">
          Пользователь несет ответственность за безопасность доступа к аккаунту
          и за действия, выполненные под его учетной записью.
        </p>
      </section>

      <section>
        <h2 className="text-xl font-bold text-zinc-900 dark:text-zinc-100">
          3. Интеграции со сторонними сервисами
        </h2>
        <p className="mt-2 text-sm leading-relaxed text-zinc-600 dark:text-zinc-300">
          При подключении интеграций (например, Fitbit) пользователь разрешает
          приложению доступ к данным в рамках выбранных прав. Пользователь может
          отозвать доступ в любой момент на стороне приложения или провайдера.
        </p>
      </section>

      <section>
        <h2 className="text-xl font-bold text-zinc-900 dark:text-zinc-100">
          4. Допустимое использование
        </h2>
        <p className="mt-2 text-sm leading-relaxed text-zinc-600 dark:text-zinc-300">
          Запрещено использовать сервис для незаконной деятельности, попыток
          обхода ограничений безопасности, нарушения прав третьих лиц и
          автоматизированных атак на инфраструктуру.
        </p>
      </section>

      <section>
        <h2 className="text-xl font-bold text-zinc-900 dark:text-zinc-100">
          5. Медицинский дисклеймер
        </h2>
        <p className="mt-2 text-sm leading-relaxed text-zinc-600 dark:text-zinc-300">
          Информация в модуле здоровья не является медицинской рекомендацией,
          диагнозом или заменой профессиональной консультации врача.
        </p>
      </section>

      <section>
        <h2 className="text-xl font-bold text-zinc-900 dark:text-zinc-100">
          6. Ограничение ответственности
        </h2>
        <p className="mt-2 text-sm leading-relaxed text-zinc-600 dark:text-zinc-300">
          Мы прикладываем усилия для надежной работы сервиса, но не гарантируем
          отсутствие перерывов, ошибок или потери данных вследствие внешних
          факторов. Пользователь самостоятельно принимает решения на основе
          информации из приложения.
        </p>
      </section>

      <section>
        <h2 className="text-xl font-bold text-zinc-900 dark:text-zinc-100">
          7. Изменения сервиса и условий
        </h2>
        <p className="mt-2 text-sm leading-relaxed text-zinc-600 dark:text-zinc-300">
          Мы можем изменять функциональность сервиса и обновлять эти условия.
          Продолжение использования после обновления означает согласие с новой
          редакцией.
        </p>
      </section>

      <section>
        <h2 className="text-xl font-bold text-zinc-900 dark:text-zinc-100">
          8. Прекращение использования
        </h2>
        <p className="mt-2 text-sm leading-relaxed text-zinc-600 dark:text-zinc-300">
          Пользователь может прекратить использование сервиса в любой момент и
          удалить аккаунт через настройки. Мы оставляем право ограничить доступ
          в случае нарушений этих условий.
        </p>
      </section>

      <section>
        <h2 className="text-xl font-bold text-zinc-900 dark:text-zinc-100">
          9. Контакты
        </h2>
        <p className="mt-2 text-sm leading-relaxed text-zinc-600 dark:text-zinc-300">
          По вопросам использования сервиса:{" "}
          <a
            className="font-medium text-emerald-600 hover:underline dark:text-emerald-400"
            href="mailto:support@assistant.app"
          >
            support@assistant.app
          </a>
          .
        </p>
      </section>
    </LegalLayout>
  );
}
