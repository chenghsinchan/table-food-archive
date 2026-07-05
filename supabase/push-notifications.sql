-- =============================================================================
-- TABLE — Push notifications: store each device's push subscription.
--
-- Additive + safe: creates one new table and its security rules. Deletes
-- nothing. Run the whole file in the Supabase SQL Editor.
-- =============================================================================

create table if not exists public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index if not exists push_subscriptions_user_idx on public.push_subscriptions(user_id);

-- Helper (SECURITY DEFINER avoids RLS recursion): do I share any group with
-- another user? Used so the notification sender can read co-members' devices.
create or replace function public.shares_group_with(p_other uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1
    from public.group_members a
    join public.group_members b on a.group_id = b.group_id
    where a.user_id = auth.uid()
      and b.user_id = p_other
  );
$$;

alter table public.push_subscriptions enable row level security;

-- Read your own device rows, plus co-members' rows (needed to send to them).
drop policy if exists "Read own or co-member subscriptions" on public.push_subscriptions;
create policy "Read own or co-member subscriptions"
on public.push_subscriptions for select
to authenticated
using (user_id = auth.uid() or public.shares_group_with(user_id));

-- Only add a subscription for yourself.
drop policy if exists "Insert own subscription" on public.push_subscriptions;
create policy "Insert own subscription"
on public.push_subscriptions for insert
to authenticated
with check (user_id = auth.uid());

-- Update only your own device rows.
drop policy if exists "Update own subscription" on public.push_subscriptions;
create policy "Update own subscription"
on public.push_subscriptions for update
to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

-- Delete your own, or clean up a co-member's expired subscription during send.
drop policy if exists "Delete own or co-member subscription" on public.push_subscriptions;
create policy "Delete own or co-member subscription"
on public.push_subscriptions for delete
to authenticated
using (user_id = auth.uid() or public.shares_group_with(user_id));
