import { LegalLayout } from "@/components/legal/legal-layout";

export function PrivacyPage() {
  return (
    <LegalLayout
      title="Политика конфиденциальности"
      subtitle="Этот документ объясняет, какие данные мы собираем в приложении «Ассистент», для чего используем, как храним и как вы можете управлять своими данными."
      effectiveDate="14 февраля 2026"
    >
      <section>
        <h2 className="text-xl font-bold text-zinc-900 dark:text-zinc-100">
          1. Какие данные мы собираем
        </h2>
        <p className="mt-2 text-sm leading-relaxed text-zinc-600 dark:text-zinc-300">
          Мы собираем только данные, необходимые для работы модулей приложения:
          учетная запись, финансовые записи, метрики здоровья и настройки
          интеграций.
        </p>
      </section>

      <section>
        <h2 className="text-xl font-bold text-zinc-900 dark:text-zinc-100">
          2. Данные аккаунта
        </h2>
        <p className="mt-2 text-sm leading-relaxed text-zinc-600 dark:text-zinc-300">
          При регистрации мы обрабатываем email и технические идентификаторы
          пользователя. Эти данные используются для аутентификации, безопасности
          и восстановления доступа.
        </p>
      </section>

      <section>
        <h2 className="text-xl font-bold text-zinc-900 dark:text-zinc-100">
          3. Финансовые и health-данные
        </h2>
        <p className="mt-2 text-sm leading-relaxed text-zinc-600 dark:text-zinc-300">
          Данные о расходах, доходах, категориях, а также о шагах, сне, пульсе,
          весе и других метриках хранятся в вашей базе проекта и используются
          для отображения аналитики и персональных инсайтов.
        </p>
      </section>

      <section>
        <h2 className="text-xl font-bold text-zinc-900 dark:text-zinc-100">
          4. Интеграции и OAuth
        </h2>
        <p className="mt-2 text-sm leading-relaxed text-zinc-600 dark:text-zinc-300">
          При подключении внешних сервисов (например, Fitbit) мы используем
          OAuth 2.0. Это означает, что логин и пароль от внешнего сервиса
          вводятся на стороне провайдера, а приложение получает только токены
          доступа.
        </p>
      </section>

      <section>
        <h2 className="text-xl font-bold text-zinc-900 dark:text-zinc-100">
          5. Где и как хранятся данные
        </h2>
        <p className="mt-2 text-sm leading-relaxed text-zinc-600 dark:text-zinc-300">
          Данные хранятся в инфраструктуре Supabase. Доступ ограничен
          авторизацией и политиками безопасности (RLS). Мы используем
          организационные и технические меры защиты, включая ограничение прав
          доступа и разделение пользовательских данных.
        </p>
      </section>

      <section>
        <h2 className="text-xl font-bold text-zinc-900 dark:text-zinc-100">
          6. Передача данных третьим лицам
        </h2>
        <p className="mt-2 text-sm leading-relaxed text-zinc-600 dark:text-zinc-300">
          Мы не продаем персональные данные. Данные могут передаваться только
          сервисам, которые технически необходимы для работы функций приложения
          (например, авторизация, хостинг, обработка интеграций).
        </p>
      </section>

      <section>
        <h2 className="text-xl font-bold text-zinc-900 dark:text-zinc-100">
          7. Ваши права
        </h2>
        <p className="mt-2 text-sm leading-relaxed text-zinc-600 dark:text-zinc-300">
          Вы можете обновлять данные в приложении, отзывать интеграции, а также
          удалить аккаунт и связанные с ним данные через настройки.
        </p>
      </section>

      <section>
        <h2 className="text-xl font-bold text-zinc-900 dark:text-zinc-100">
          8. Изменения политики
        </h2>
        <p className="mt-2 text-sm leading-relaxed text-zinc-600 dark:text-zinc-300">
          Мы можем обновлять эту политику при изменении функциональности
          приложения или требований законодательства. Актуальная дата вступления
          всегда указывается в начале документа.
        </p>
      </section>

      <section>
        <h2 className="text-xl font-bold text-zinc-900 dark:text-zinc-100">
          9. Контакты
        </h2>
        <p className="mt-2 text-sm leading-relaxed text-zinc-600 dark:text-zinc-300">
          По вопросам конфиденциальности:{" "}
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
