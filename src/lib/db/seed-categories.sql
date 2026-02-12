DO $$
DECLARE
    cat_food UUID;
    cat_transport UUID;
    cat_shopping UUID;
    cat_housing UUID;
    cat_health UUID;
    cat_entertainment UUID;
    cat_income UUID;
BEGIN
    -- Insert System Categories (user_id IS NULL)

    -- 1. Food
    INSERT INTO categories (user_id, name, type, icon, color, is_default) VALUES (NULL, 'Продукты', 'expense', 'shopping-cart', '#10b981', true) RETURNING id INTO cat_food;
    INSERT INTO categories (user_id, name, type, parent_id, is_default) VALUES 
        (NULL, 'Супермаркеты', 'expense', cat_food, true),
        (NULL, 'Кафе и рестораны', 'expense', cat_food, true),
        (NULL, 'Доставка еды', 'expense', cat_food, true),
        (NULL, 'Алкоголь', 'expense', cat_food, true);

    -- 2. Transport
    INSERT INTO categories (user_id, name, type, icon, color, is_default) VALUES (NULL, 'Транспорт', 'expense', 'car', '#3b82f6', true) RETURNING id INTO cat_transport;
    INSERT INTO categories (user_id, name, type, parent_id, is_default) VALUES 
        (NULL, 'Такси', 'expense', cat_transport, true),
        (NULL, 'Общественный транспорт', 'expense', cat_transport, true),
        (NULL, 'Топливо', 'expense', cat_transport, true),
        (NULL, 'Обслуживание', 'expense', cat_transport, true),
        (NULL, 'Каршеринг', 'expense', cat_transport, true);

    -- 3. Shopping
    INSERT INTO categories (user_id, name, type, icon, color, is_default) VALUES (NULL, 'Шопинг', 'expense', 'shopping-bag', '#8b5cf6', true) RETURNING id INTO cat_shopping;
    INSERT INTO categories (user_id, name, type, parent_id, is_default) VALUES 
        (NULL, 'Одежда и обувь', 'expense', cat_shopping, true),
        (NULL, 'Электроника', 'expense', cat_shopping, true),
        (NULL, 'Дом и ремонт', 'expense', cat_shopping, true),
        (NULL, 'Красота и косметика', 'expense', cat_shopping, true),
        (NULL, 'Маркетплейсы (Ozon/WB)', 'expense', cat_shopping, true);

    -- 4. Housing
    INSERT INTO categories (user_id, name, type, icon, color, is_default) VALUES (NULL, 'Жилье', 'expense', 'home', '#f59e0b', true) RETURNING id INTO cat_housing;
    INSERT INTO categories (user_id, name, type, parent_id, is_default) VALUES 
        (NULL, 'Аренда', 'expense', cat_housing, true),
        (NULL, 'ЖКУ', 'expense', cat_housing, true),
        (NULL, 'Интернет и связь', 'expense', cat_housing, true),
        (NULL, 'Сервисы и подписки', 'expense', cat_housing, true);

    -- 5. Income
    INSERT INTO categories (user_id, name, type, icon, color, is_default) VALUES (NULL, 'Доходы', 'income', 'wallet', '#10b981', true) RETURNING id INTO cat_income;
     INSERT INTO categories (user_id, name, type, parent_id, is_default) VALUES 
        (NULL, 'Зарплата', 'income', cat_income, true),
        (NULL, 'Фриланс', 'income', cat_income, true),
        (NULL, 'Кэшбэк', 'income', cat_income, true),
        (NULL, 'Подарки', 'income', cat_income, true);

END $$;
