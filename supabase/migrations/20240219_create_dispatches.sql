-- Create dispatches table
create table if not exists dispatches (
  id uuid default gen_random_uuid() primary key,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  created_by uuid references users(id),
  sap_exit_id text not null,
  type text check (type in ('BOX', 'PALLET')) not null,
  pallet_id text,
  notes text
);

-- Add dispatch_id to boxes table
alter table boxes 
add column if not exists dispatch_id uuid references dispatches(id);

-- Enable RLS on dispatches
alter table dispatches enable row level security;

-- Policies for dispatches (Simplified for now, similar to other tables)
create policy "Enable read access for authenticated users"
on dispatches for select
to authenticated
using (true);

create policy "Enable insert for authenticated users"
on dispatches for insert
to authenticated
with check (true);

-- (Optional) Policy for boxes update is already likely covered or needs update to allow setting dispatch_id
-- We assume existing policy allows update if user is creator or admin, 
-- but we might need to ensure 'dispatching' is allowed. 
-- For now, standard RLS on boxes should suffice if user has update rights.
