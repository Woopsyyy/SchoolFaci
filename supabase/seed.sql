-- Seed data
set seed = 0.123456;

insert into facilities (code,name,category,location,description) values
('CL-101','Classroom 101','Classroom','Building A, 1st Floor','General lecture room'),
('CL-102','Classroom 102','Classroom','Building A, 1st Floor','General lecture room'),
('CL-201','Classroom 201','Classroom','Building A, 2nd Floor','General lecture room'),
('CL-204','Classroom 204','Classroom','Building A, 2nd Floor','General lecture room'),
('LAB-01','Computer Laboratory 1','Laboratory','ICT Building, Ground Floor','IT laboratory'),
('LAB-02','Computer Laboratory 2','Laboratory','ICT Building, Ground Floor','IT laboratory'),
('LIB-01','Library','Library','Learning Resource Center','Main library'),
('NET-01','Internet / Wi-Fi','Technology','Campus-wide','Campus internet connectivity'),
('CR-M','Male Comfort Room','Sanitation','Building A','Restroom facilities'),
('CR-F','Female Comfort Room','Sanitation','Building A','Restroom facilities'),
('FURN-01','General Furniture','Furniture','Campus-wide','Chairs, desks, tables'),
('CL-301','Classroom 301','Classroom','Building A, 3rd Floor','General lecture room')
on conflict (code) do nothing;

-- Dimensions (per-category, but many shared; key set matches research indicators)
insert into dimensions (key,label,sort_order,category) values
('classroom','Classrooms',1,'Classroom'),
('laboratory','Laboratory Facilities',2,'Laboratory'),
('computers','Computers/Workstations',3,'Laboratory'),
('internet','Internet/Wi-Fi Connectivity',4,'Technology'),
('library','Library Facilities',5,'Library'),
('comfort_room','Comfort Rooms',6,'Sanitation'),
('furniture','Furniture (Chairs/Desks)',7,'Furniture'),
('lighting','Lighting',8,null),
('ventilation','Ventilation/Air Quality',9,null)
on conflict (key) do update set label=excluded.label, sort_order=excluded.sort_order, category=excluded.category;

-- Facility conditions
insert into facility_conditions (facility_id, metric_key, numeric_value, value)
select id,'functional_computers', case when category='Laboratory' then 20+(floor(random()*5)-2) else null end,
       case when category='Laboratory' then (20+(floor(random()*5)-2))::text||' units' else null end
from facilities
on conflict do nothing;

insert into facility_conditions (facility_id, metric_key, numeric_value, value)
select id,'defective_computers', case when category='Laboratory' then greatest(0,2+floor(random()*4)) else null end,
       case when category='Laboratory' then greatest(0,2+floor(random()*4))::text||' units' else null end
from facilities
on conflict do nothing;

insert into facility_conditions (facility_id, metric_key, numeric_value, value)
select id,'internet_availability', case when code='NET-01' or category in ('Laboratory','Library') then round((0.5 + random()*0.5)::numeric,2) else round((0.6 + random()*0.4)::numeric,2) end,
       case when code='NET-01' or category in ('Laboratory','Library') then (round((0.5+random()*0.5)::numeric,2)*100)::int||'%' else (round((0.6+random()*0.4)::numeric,2)*100)::int||'%' end
from facilities
on conflict do nothing;

insert into facility_conditions (facility_id, metric_key, numeric_value, value)
select id,'ventilation', round((2.5 + random()*2.5)::numeric,1), (round((2.5+random()*2.5)::numeric,1))::text||' / 5' from facilities on conflict do nothing;
insert into facility_conditions (facility_id, metric_key, numeric_value, value)
select id,'lighting', round((2.8 + random()*2.2)::numeric,1), (round((2.8+random()*2.2)::numeric,1))::text||' / 5' from facilities on conflict do nothing;
insert into facility_conditions (facility_id, metric_key, numeric_value, value)
select id,'cleanliness', round((3.0 + random()*2.0)::numeric,1), (round((3.0+random()*2.0)::numeric,1))::text||' / 5' from facilities on conflict do nothing;

-- Demo assessments (deterministic-ish random, for dashboard charts on defense day)
insert into assessments (facility_id, respondent_name, respondent_year, overall_rating, comment, created_at)
select
  f.id,
  (array['Anon Student','Student A','Student B','Student C'])[1+floor(random()*4)],
  (array['1st Year','2nd Year','3rd Year','4th Year'])[1+floor(random()*4)],
  greatest(1, least(5, round(2.5 + random()*2.5)::int)),
  null,
  now() - (random() * interval '60 days')
from facilities f, generate_series(1, 24);

-- Demo per-dimension ratings (weighted so charts vary)
insert into assessment_ratings (assessment_id, dimension_key, score)
select
  a.id,
  d.key,
  greatest(1, least(5, round(1.8 + random()*3.4)::int))
from assessments a
cross join dimensions d
where d.key in (
  'classroom','laboratory','computers','internet','library','comfort_room','furniture','lighting','ventilation'
)
on conflict do nothing;

-- Demo concerns
insert into concerns (facility_id, category, severity, description, status, resolution_note, created_by, created_at)
select
  (select id from facilities where code='LAB-01'),
  'Computers',
  'High',
  '15 computers in Computer Laboratory 1 are not functioning.',
  'For Repair',
  'Technician scheduled. Replacement units requested from IT Department.',
  'Student (BSIT)',
  now() - interval '6 days';

insert into concerns (facility_id, category, severity, description, status, resolution_note, created_by, created_at)
select
  (select id from facilities where code='NET-01'),
  'Internet',
  'High',
  'Wi-Fi connection is unstable and drops repeatedly during online class hours.',
  'In Progress',
  null,
  'Student (BSIT)',
  now() - interval '4 days';

insert into concerns (facility_id, category, severity, description, status, resolution_note, created_by, created_at)
select
  (select id from facilities where code='CL-204'),
  'Furniture',
  'Moderate',
  'Several chairs and desks in Classroom 204 are broken and unusable.',
  'Under Review',
  null,
  'Student (BSED)',
  now() - interval '3 days';

insert into concerns (facility_id, category, severity, description, status, resolution_note, created_by, created_at)
select
  (select id from facilities where code='CR-F'),
  'Comfort Room',
  'Low',
  'Female comfort room is missing a working soap dispenser and has no ventilation fan.',
  'Resolved',
  'Soap dispenser replaced and fan cleaned.',
  'Student (BSIT)',
  now() - interval '12 days';

insert into concerns (facility_id, category, severity, description, status, resolution_note, created_by, created_at)
select
  (select id from facilities where code='LIB-01'),
  'Library',
  'Moderate',
  'Library lighting is dim and one section has flickering fluorescent tubes.',
  'For Repair',
  null,
  'Student (BSED)',
  now() - interval '2 days';
