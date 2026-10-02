-- TCC FacilityTrack
-- Schema: facilities, dimensions, assessments, conditions, concerns + RLS + views + RPCs
create extension if not exists pgcrypto;

do $$
begin
  if not exists (select 1 from pg_type where typname = 'concern_severity') then
    create type concern_severity as enum ('Low','Moderate','High');
  end if;
  if not exists (select 1 from pg_type where typname = 'concern_status') then
    create type concern_status as enum ('Reported','Under Review','For Repair','In Progress','Resolved');
  end if;
  if not exists (select 1 from pg_type where typname = 'facility_category') then
    create type facility_category as enum ('Classroom','Laboratory','Technology','Library','Sanitation','Furniture');
  end if;
end$$;

create table if not exists facilities (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  name text not null,
  category facility_category not null,
  location text,
  description text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists dimensions (
  key text primary key,
  label text not null,
  sort_order int not null,
  category facility_category,
  description text,
  is_active boolean not null default true
);

create table if not exists facility_conditions (
  id uuid primary key default gen_random_uuid(),
  facility_id uuid not null references facilities(id) on delete cascade,
  metric_key text not null,
  value text,
  numeric_value numeric(10,2),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (facility_id, metric_key)
);

create table if not exists assessments (
  id uuid primary key default gen_random_uuid(),
  facility_id uuid not null references facilities(id) on delete cascade,
  respondent_name text,
  respondent_year text,
  overall_rating int check (overall_rating between 1 and 5),
  comment text,
  created_at timestamptz not null default now()
);

create table if not exists assessment_ratings (
  assessment_id uuid not null references assessments(id) on delete cascade,
  dimension_key text not null references dimensions(key) on delete cascade,
  score int not null check (score between 1 and 5),
  primary key (assessment_id, dimension_key)
);

create table if not exists concerns (
  id uuid primary key default gen_random_uuid(),
  facility_id uuid not null references facilities(id) on delete cascade,
  category text,
  severity concern_severity not null default 'Moderate',
  description text not null,
  status concern_status not null default 'Reported',
  resolution_note text,
  created_by text,
  updated_by text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists concern_events (
  id uuid primary key default gen_random_uuid(),
  concern_id uuid not null references concerns(id) on delete cascade,
  from_status concern_status,
  to_status concern_status not null,
  note text,
  actor text,
  created_at timestamptz not null default now()
);

create index if not exists idx_assessments_facility_created on assessments(facility_id, created_at);
create index if not exists idx_ratings_facility on assessment_ratings(assessment_id);
create index if not exists idx_conditions_facility on facility_conditions(facility_id);
create index if not exists idx_concerns_facility_status on concerns(facility_id, status);
create index if not exists idx_concern_events_concern on concern_events(concern_id);
create index if not exists idx_dimensions_sort on dimensions(sort_order);

create or replace function set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end$$ language plpgsql;

create trigger trg_facilities_updated_at before update on facilities for each row execute function set_updated_at();
create trigger trg_facility_conditions_updated_at before update on facility_conditions for each row execute function set_updated_at();
create trigger trg_concerns_updated_at before update on concerns for each row execute function set_updated_at();

create or replace function log_concern_status_change()
returns trigger as $$
begin
  if tg_op = 'INSERT' then
    insert into concern_events (concern_id, from_status, to_status, note, actor)
    values (new.id, null, new.status, 'Concern reported', coalesce(new.created_by,'system'));
    return new;
  elsif tg_op = 'UPDATE' then
    if new.status is distinct from old.status then
      insert into concern_events (concern_id, from_status, to_status, note, actor)
      values (new.id, old.status, new.status, coalesce(new.resolution_note,'Status changed'), coalesce(new.updated_by,'system'));
    end if;
    return new;
  end if;
  return null;
end$$ language plpgsql;

create trigger trg_concerns_log_event after insert or update on concerns for each row execute function log_concern_status_change();

-- VIEWS
create or replace view v_facility_scores as
select
  f.id as facility_id,
  f.code,
  f.name,
  f.category,
  f.location,
  count(distinct a.id) as response_count,
  round(avg(a.overall_rating)::numeric,2) as avg_overall_rating,
  round((avg(a.overall_rating)::numeric/5.0)*100,2) as satisfaction_pct
from facilities f
left join assessments a on a.facility_id = f.id
group by f.id,f.code,f.name,f.category,f.location
order by f.name;

create or replace view v_dimension_scores as
select
  f.id as facility_id,
  f.name as facility_name,
  r.dimension_key,
  d.label,
  d.sort_order,
  count(r.*) as rating_count,
  round(avg(r.score)::numeric,2) as avg_score
from facilities f
left join assessments a on a.facility_id = f.id
left join assessment_ratings r on r.assessment_id = a.id
left join dimensions d on d.key = r.dimension_key
group by f.id,f.name,r.dimension_key,d.label,d.sort_order
order by f.name,d.sort_order;

create or replace view v_concern_summary as
select
  f.id as facility_id,
  f.name,
  count(c.id) as total_concerns,
  count(*) filter (where c.status in ('Reported','Under Review','For Repair','In Progress')) as open_concerns,
  count(*) filter (where c.severity='High' and c.status in ('Reported','Under Review','For Repair','In Progress')) as high_open_concerns,
  count(*) filter (where c.status='Resolved') as resolved_concerns,
  max(c.created_at) as latest_concern_at
from facilities f
left join concerns c on c.facility_id = f.id
group by f.id,f.name
order by open_concerns desc, high_open_concerns desc;

create or replace view v_facility_priority as
select
  s.facility_id,
  s.name,
  s.category,
  s.avg_overall_rating,
  s.response_count,
  coalesce(cs.open_concerns,0) as open_concerns,
  coalesce(cs.high_open_concerns,0) as high_open_concerns,
  case
    when coalesce(cs.high_open_concerns,0) >= 1 then 'High'
    when s.avg_overall_rating is not null and s.avg_overall_rating < 3.0 then 'High'
    when coalesce(cs.open_concerns,0) >= 1 then 'Moderate'
    when s.avg_overall_rating is not null and s.avg_overall_rating < 4.0 then 'Moderate'
    else 'Low'
  end as priority,
  case
    when coalesce(cs.high_open_concerns,0)>=1 then 'Open high-severity concern(s)'
    when s.avg_overall_rating is not null and s.avg_overall_rating < 3.0 then 'Low average rating (< 3.0)'
    when coalesce(cs.open_concerns,0)>=1 then 'Open concern(s)'
    when s.avg_overall_rating is not null and s.avg_overall_rating < 4.0 then 'Below satisfactory (< 4.0)'
    else 'Satisfactory'
  end as rationale
from v_facility_scores s
left join v_concern_summary cs on cs.facility_id = s.facility_id
order by
  (case when (coalesce(cs.high_open_concerns,0)>=1 or (s.avg_overall_rating is not null and s.avg_overall_rating<3.0)) then 3
        when (coalesce(cs.open_concerns,0)>=1 or (s.avg_overall_rating is not null and s.avg_overall_rating<4.0)) then 2
        else 1 end) desc,
  s.avg_overall_rating asc nulls last,
  open_concerns desc;

-- RLS
alter table facilities enable row level security;
alter table dimensions enable row level security;
alter table facility_conditions enable row level security;
alter table assessments enable row level security;
alter table assessment_ratings enable row level security;
alter table concerns enable row level security;
alter table concern_events enable row level security;

-- Public (anon) can read reference + conditions + aggregates-derived data; insert feedback/concerns
drop policy if exists "facilities_read_public" on facilities;
create policy "facilities_read_public" on facilities for select using (true);

drop policy if exists "dimensions_read_public" on dimensions;
create policy "dimensions_read_public" on dimensions for select using (true);

drop policy if exists "conditions_read_public" on facility_conditions;
create policy "conditions_read_public" on facility_conditions for select using (true);
drop policy if exists "conditions_write_public" on facility_conditions;
create policy "conditions_write_public" on facility_conditions for insert with check (true);
drop policy if exists "conditions_update_public" on facility_conditions;
create policy "conditions_update_public" on facility_conditions for update using (true) with check (true);

drop policy if exists "assessments_read_public" on assessments;
create policy "assessments_read_public" on assessments for select using (true);
drop policy if exists "assessments_insert_public" on assessments;
create policy "assessments_insert_public" on assessments for insert with check (true);

drop policy if exists "ratings_read_public" on assessment_ratings;
create policy "ratings_read_public" on assessment_ratings for select using (true);
drop policy if exists "ratings_insert_public" on assessment_ratings;
create policy "ratings_insert_public" on assessment_ratings for insert with check (true);

drop policy if exists "concerns_read_public" on concerns;
create policy "concerns_read_public" on concerns for select using (true);
drop policy if exists "concerns_insert_public" on concerns;
create policy "concerns_insert_public" on concerns for insert with check (true);
drop policy if exists "concerns_update_public" on concerns;
create policy "concerns_update_public" on concerns for update using (true) with check (true);

drop policy if exists "concern_events_read_public" on concern_events;
create policy "concern_events_read_public" on concern_events for select using (true);
drop policy if exists "concern_events_insert_public" on concern_events;
create policy "concern_events_insert_public" on concern_events for insert with check (true);

-- Views: read-only
grant select on v_facility_scores to anon, authenticated;
grant select on v_dimension_scores to anon, authenticated;
grant select on v_concern_summary to anon, authenticated;
grant select on v_facility_priority to anon, authenticated;

-- Admin passphrase-gated RPCs (no login UI). Default passphrase: change-me-in-rpc
create or replace function set_concern_status(
  _concern_id uuid,
  _to_status concern_status,
  _admin_passphrase text,
  _note text default null,
  _actor text default 'Admin'
)
returns concerns
language plpgsql
security definer
set search_path = public
as $$
declare
  target concerns;
  stored_hash text := 'FOWkqrP3Be/scO28K+70JQZE1KJqMFlhJBHvBQ8KbO4='; -- change-me-in-rpc (SHA256)
begin
  if _admin_passphrase is null or _admin_passphrase = '' then
    raise exception 'Admin passphrase required';
  end if;
  if encode(digest(_admin_passphrase, 'sha256'), 'base64') <> stored_hash then
    raise exception 'Invalid admin passphrase';
  end if;
  update concerns
     set status = _to_status,
         resolution_note = coalesce(_note, resolution_note),
         updated_by = _actor,
         updated_at = now()
   where id = _concern_id
   returning * into target;
  if target is null then
    raise exception 'Concern not found';
  end if;
  return target;
end$$;

create or replace function update_facility_condition(
  _facility_id uuid,
  _metric_key text,
  _numeric_value numeric,
  _value text,
  _admin_passphrase text,
  _actor text default 'Admin'
)
returns facility_conditions
language plpgsql
security definer
set search_path = public
as $$
declare
  stored_hash text := 'FOWkqrP3Be/scO28K+70JQZE1KJqMFlhJBHvBQ8KbO4=';
  rec facility_conditions;
begin
  if _admin_passphrase is null or _admin_passphrase = '' then
    raise exception 'Admin passphrase required';
  end if;
  if encode(digest(_admin_passphrase, 'sha256'), 'base64') <> stored_hash then
    raise exception 'Invalid admin passphrase';
  end if;
  insert into facility_conditions (facility_id, metric_key, numeric_value, value, updated_at)
  values (_facility_id, _metric_key, _numeric_value, _value, now())
  on conflict (facility_id, metric_key)
  do update set numeric_value = excluded.numeric_value,
                value = excluded.value,
                updated_at = now()
  returning * into rec;
  return rec;
end$$;

grant execute on function set_concern_status(uuid, concern_status, text, text, text) to anon;
grant execute on function update_facility_condition(uuid, text, numeric, text, text, text) to anon;
