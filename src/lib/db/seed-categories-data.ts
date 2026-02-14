/**
 * Дефолтные категории для нового пользователя.
 * Основано на референсе Pennora и практиках YNAB/Mint.
 * Порядок: корневые → подкатегории → под-подкатегории (parent = имя родителя).
 */
export interface SeedCategory {
  name: string;
  type: "income" | "expense";
  icon?: string;
  color?: string;
  /** Имя родительской категории (для подкатегорий) */
  parent?: string;
}

export const DEFAULT_SEED_CATEGORIES: SeedCategory[] = [
  // ========== ДОХОДЫ (корень) ==========
  { name: "Зарплата", type: "income", icon: "briefcase", color: "#10b981" },
  { name: "Премии", type: "income", icon: "gift", color: "#10b981" },
  { name: "Инвестиции", type: "income", icon: "trending-up", color: "#10b981" },
  {
    name: "Аренда недвижимости",
    type: "income",
    icon: "home",
    color: "#10b981",
  },
  { name: "Дивиденды", type: "income", icon: "dollar-sign", color: "#10b981" },
  { name: "Подарки", type: "income", icon: "gift", color: "#10b981" },
  { name: "Прочие доходы", type: "income", icon: "wallet", color: "#10b981" },

  // ========== РАСХОДЫ (корень) ==========
  { name: "Еда", type: "expense", icon: "utensils", color: "#ef4444" },
  { name: "Транспорт", type: "expense", icon: "car", color: "#3b82f6" },
  { name: "Жильё", type: "expense", icon: "home", color: "#a855f7" },
  { name: "Здоровье", type: "expense", icon: "heart", color: "#f43f5e" },
  { name: "Развлечения", type: "expense", icon: "film", color: "#ec4899" },
  { name: "Образование", type: "expense", icon: "book-open", color: "#6366f1" },
  { name: "Покупки", type: "expense", icon: "shopping-bag", color: "#8b5cf6" },
  { name: "Одежда и обувь", type: "expense", icon: "shirt", color: "#ec4899" },
  { name: "Связь", type: "expense", icon: "smartphone", color: "#06b6d4" },
  { name: "Финансы", type: "expense", icon: "credit-card", color: "#6366f1" },
  {
    name: "Красота и уход",
    type: "expense",
    icon: "sparkles",
    color: "#f472b6",
  },
  {
    name: "Спорт и фитнес",
    type: "expense",
    icon: "dumbbell",
    color: "#10b981",
  },
  { name: "Путешествия", type: "expense", icon: "plane", color: "#3b82f6" },
  { name: "Дети", type: "expense", icon: "baby", color: "#f97316" },
  { name: "Домашние животные", type: "expense", icon: "dog", color: "#f97316" },
  { name: "Бизнес", type: "expense", icon: "briefcase", color: "#6366f1" },
  { name: "Налоги", type: "expense", icon: "file-text", color: "#dc2626" },
  {
    name: "Подарки и благотворительность",
    type: "expense",
    icon: "gift",
    color: "#a855f7",
  },
  { name: "Прочие расходы", type: "expense", icon: "wallet", color: "#6b7280" },

  // ========== Еда: подкатегории ==========
  { name: "Продукты", type: "expense", icon: "shopping-cart", parent: "Еда" },
  {
    name: "Рестораны и кафе",
    type: "expense",
    icon: "utensils-crossed",
    parent: "Еда",
  },
  { name: "Доставка еды", type: "expense", icon: "package", parent: "Еда" },
  { name: "Алкоголь", type: "expense", icon: "wine", parent: "Еда" },

  // Продукты: под-подкатегории
  {
    name: "Мясо и птица",
    type: "expense",
    icon: "drumstick",
    parent: "Продукты",
  },
  {
    name: "Рыба и морепродукты",
    type: "expense",
    icon: "fish",
    parent: "Продукты",
  },
  {
    name: "Молочные продукты",
    type: "expense",
    icon: "milk",
    parent: "Продукты",
  },
  { name: "Овощи", type: "expense", icon: "carrot", parent: "Продукты" },
  {
    name: "Фрукты и ягоды",
    type: "expense",
    icon: "apple",
    parent: "Продукты",
  },
  {
    name: "Хлеб и выпечка",
    type: "expense",
    icon: "croissant",
    parent: "Продукты",
  },
  {
    name: "Крупы и макароны",
    type: "expense",
    icon: "wheat",
    parent: "Продукты",
  },
  { name: "Консервы", type: "expense", icon: "package", parent: "Продукты" },
  {
    name: "Напитки (безалкогольные)",
    type: "expense",
    icon: "coffee",
    parent: "Продукты",
  },
  {
    name: "Сладости и десерты",
    type: "expense",
    icon: "cake",
    parent: "Продукты",
  },
  {
    name: "Специи и приправы",
    type: "expense",
    icon: "leaf",
    parent: "Продукты",
  },
  {
    name: "Замороженные продукты",
    type: "expense",
    icon: "snowflake",
    parent: "Продукты",
  },
  {
    name: "Детское питание (продукты)",
    type: "expense",
    icon: "baby",
    parent: "Продукты",
  },
  {
    name: "Прочие продукты",
    type: "expense",
    icon: "shopping-cart",
    parent: "Продукты",
  },

  // ========== Транспорт ==========
  { name: "Топливо", type: "expense", icon: "fuel", parent: "Транспорт" },
  {
    name: "Общественный транспорт",
    type: "expense",
    icon: "bus",
    parent: "Транспорт",
  },
  {
    name: "Обслуживание автомобиля",
    type: "expense",
    icon: "wrench",
    parent: "Транспорт",
  },
  {
    name: "Страховка автомобиля",
    type: "expense",
    icon: "shield",
    parent: "Транспорт",
  },
  { name: "Парковка", type: "expense", icon: "map-pin", parent: "Транспорт" },
  { name: "Такси", type: "expense", icon: "car", parent: "Транспорт" },
  {
    name: "Каршеринг",
    type: "expense",
    icon: "car-front",
    parent: "Транспорт",
  },

  // ========== Жильё ==========
  { name: "Аренда/Ипотека", type: "expense", icon: "home", parent: "Жильё" },
  {
    name: "Коммунальные платежи",
    type: "expense",
    icon: "zap",
    parent: "Жильё",
  },
  {
    name: "Ремонт и обслуживание",
    type: "expense",
    icon: "hammer",
    parent: "Жильё",
  },
  { name: "Мебель и интерьер", type: "expense", icon: "sofa", parent: "Жильё" },
  {
    name: "Бытовая техника",
    type: "expense",
    icon: "refrigerator",
    parent: "Жильё",
  },
  {
    name: "Хозяйственные товары",
    type: "expense",
    icon: "spray-can",
    parent: "Жильё",
  },

  // ========== Здоровье ==========
  {
    name: "Медицинские услуги",
    type: "expense",
    icon: "stethoscope",
    parent: "Здоровье",
  },
  { name: "Лекарства", type: "expense", icon: "pill", parent: "Здоровье" },
  {
    name: "Медицинское страхование",
    type: "expense",
    icon: "shield",
    parent: "Здоровье",
  },
  { name: "Стоматология", type: "expense", icon: "smile", parent: "Здоровье" },
  {
    name: "Очки и контактные линзы",
    type: "expense",
    icon: "glasses",
    parent: "Здоровье",
  },

  // ========== Развлечения ==========
  {
    name: "Кино и театры",
    type: "expense",
    icon: "film",
    parent: "Развлечения",
  },
  {
    name: "Игры и развлечения",
    type: "expense",
    icon: "gamepad-2",
    parent: "Развлечения",
  },
  { name: "Хобби", type: "expense", icon: "palette", parent: "Развлечения" },
  {
    name: "Подписки (стриминг, игры)",
    type: "expense",
    icon: "tv",
    parent: "Развлечения",
  },
  {
    name: "Концерты и мероприятия",
    type: "expense",
    icon: "music",
    parent: "Развлечения",
  },

  // ========== Образование ==========
  {
    name: "Курсы и обучение",
    type: "expense",
    icon: "graduation-cap",
    parent: "Образование",
  },
  {
    name: "Онлайн-обучение",
    type: "expense",
    icon: "laptop",
    parent: "Образование",
  },
  {
    name: "Книги и учебные материалы",
    type: "expense",
    icon: "book",
    parent: "Образование",
  },

  // ========== Покупки ==========
  {
    name: "Электроника",
    type: "expense",
    icon: "smartphone",
    parent: "Покупки",
  },
  {
    name: "Книги и журналы",
    type: "expense",
    icon: "book-open",
    parent: "Покупки",
  },
  {
    name: "Подарки (покупки)",
    type: "expense",
    icon: "gift",
    parent: "Покупки",
  },

  // ========== Одежда и обувь ==========
  { name: "Одежда", type: "expense", icon: "shirt", parent: "Одежда и обувь" },
  {
    name: "Обувь",
    type: "expense",
    icon: "footprints",
    parent: "Одежда и обувь",
  },
  {
    name: "Аксессуары",
    type: "expense",
    icon: "watch",
    parent: "Одежда и обувь",
  },
  {
    name: "Химчистка и ремонт",
    type: "expense",
    icon: "scissors",
    parent: "Одежда и обувь",
  },

  // ========== Связь ==========
  {
    name: "Мобильная связь",
    type: "expense",
    icon: "smartphone",
    parent: "Связь",
  },
  { name: "Интернет", type: "expense", icon: "wifi", parent: "Связь" },
  { name: "Телевидение", type: "expense", icon: "tv", parent: "Связь" },
  { name: "Почтовые услуги", type: "expense", icon: "mail", parent: "Связь" },

  // ========== Финансы ==========
  { name: "Кредиты", type: "expense", icon: "credit-card", parent: "Финансы" },
  {
    name: "Проценты по кредитам",
    type: "expense",
    icon: "percent",
    parent: "Финансы",
  },
  {
    name: "Банковские комиссии",
    type: "expense",
    icon: "wallet",
    parent: "Финансы",
  },
  { name: "Страхование", type: "expense", icon: "shield", parent: "Финансы" },
  {
    name: "Инвестиции (расход)",
    type: "expense",
    icon: "trending-up",
    parent: "Финансы",
  },
  {
    name: "Сбережения",
    type: "expense",
    icon: "piggy-bank",
    parent: "Финансы",
  },

  // ========== Красота и уход ==========
  {
    name: "Косметика",
    type: "expense",
    icon: "sparkles",
    parent: "Красота и уход",
  },
  {
    name: "Парикмахерская",
    type: "expense",
    icon: "scissors",
    parent: "Красота и уход",
  },
  {
    name: "Спа и массаж",
    type: "expense",
    icon: "spa",
    parent: "Красота и уход",
  },
  {
    name: "Косметология",
    type: "expense",
    icon: "sparkles",
    parent: "Красота и уход",
  },

  // ========== Спорт и фитнес ==========
  {
    name: "Спортивный зал",
    type: "expense",
    icon: "dumbbell",
    parent: "Спорт и фитнес",
  },
  {
    name: "Спортивная одежда",
    type: "expense",
    icon: "shirt",
    parent: "Спорт и фитнес",
  },
  {
    name: "Спортивное питание",
    type: "expense",
    icon: "flame",
    parent: "Спорт и фитнес",
  },
  { name: "Тренер", type: "expense", icon: "user", parent: "Спорт и фитнес" },

  // ========== Путешествия ==========
  { name: "Авиабилеты", type: "expense", icon: "plane", parent: "Путешествия" },
  { name: "Отели", type: "expense", icon: "building", parent: "Путешествия" },
  {
    name: "Питание в поездках",
    type: "expense",
    icon: "utensils-crossed",
    parent: "Путешествия",
  },
  {
    name: "Экскурсии и развлечения",
    type: "expense",
    icon: "camera",
    parent: "Путешествия",
  },
  { name: "Сувениры", type: "expense", icon: "gift", parent: "Путешествия" },
  {
    name: "Виза и документы",
    type: "expense",
    icon: "file-text",
    parent: "Путешествия",
  },

  // ========== Дети ==========
  { name: "Детская одежда", type: "expense", icon: "shirt", parent: "Дети" },
  { name: "Детское питание", type: "expense", icon: "baby", parent: "Дети" },
  { name: "Игрушки", type: "expense", icon: "gamepad-2", parent: "Дети" },
  {
    name: "Образование детей",
    type: "expense",
    icon: "graduation-cap",
    parent: "Дети",
  },
  { name: "Кружки и секции", type: "expense", icon: "trophy", parent: "Дети" },
  { name: "Детское здоровье", type: "expense", icon: "heart", parent: "Дети" },

  // ========== Домашние животные ==========
  {
    name: "Корм для животных",
    type: "expense",
    icon: "package",
    parent: "Домашние животные",
  },
  {
    name: "Ветеринарные услуги",
    type: "expense",
    icon: "stethoscope",
    parent: "Домашние животные",
  },
  {
    name: "Аксессуары для животных",
    type: "expense",
    icon: "bone",
    parent: "Домашние животные",
  },
  {
    name: "Стрижка животных",
    type: "expense",
    icon: "scissors",
    parent: "Домашние животные",
  },

  // ========== Налоги ==========
  {
    name: "Подоходный налог",
    type: "expense",
    icon: "file-text",
    parent: "Налоги",
  },
  {
    name: "Имущественный налог",
    type: "expense",
    icon: "home",
    parent: "Налоги",
  },
  {
    name: "Транспортный налог",
    type: "expense",
    icon: "car",
    parent: "Налоги",
  },

  // ========== Бизнес ==========
  { name: "Офис", type: "expense", icon: "building", parent: "Бизнес" },
  {
    name: "Реклама и маркетинг",
    type: "expense",
    icon: "megaphone",
    parent: "Бизнес",
  },
  { name: "Оборудование", type: "expense", icon: "monitor", parent: "Бизнес" },
];
