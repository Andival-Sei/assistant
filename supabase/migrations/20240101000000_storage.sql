-- Create a private bucket for receipts
insert into storage.buckets (id, name, public)
values ('receipts', 'receipts', false);

-- Policy to allow authenticated users to upload receipts
create policy "Users can upload their own receipts"
on storage.objects for insert
to authenticated
with check ( bucket_id = 'receipts' and auth.uid() = owner );

-- Policy to allow authenticated users to view their own receipts
create policy "Users can view their own receipts"
on storage.objects for select
to authenticated
using ( bucket_id = 'receipts' and auth.uid() = owner );
