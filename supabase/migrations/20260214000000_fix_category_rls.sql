-- Добавление недостающих политик RLS для категорий
-- Позволяет пользователям обновлять и удалять свои собственные категории

create policy "Users can update their own categories"
on public.categories for update
to authenticated
using ( auth.uid() = user_id );

create policy "Users can delete their own categories"
on public.categories for delete
to authenticated
using ( auth.uid() = user_id );
