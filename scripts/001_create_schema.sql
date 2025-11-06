-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- Profiles table (extends auth.users)
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  full_name text,
  display_name text,
  avatar_url text,
  bio text,
  skill_level text check (skill_level in ('beginner', 'intermediate', 'advanced', 'expert')),
  average_handicap numeric(4,1),
  interests text[], -- array of interests like 'competitive', 'casual', 'social', 'networking'
  trust_score integer default 100,
  total_rounds integer default 0,
  completed_rounds integer default 0,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Courses table
create table if not exists public.courses (
  id uuid primary key default uuid_generate_v4(),
  chronogolf_id text unique,
  name text not null,
  location text not null,
  city text not null,
  province text default 'BC',
  description text,
  image_url text,
  holes integer default 18,
  par integer,
  rating numeric(4,1),
  slope integer,
  price_range text,
  amenities text[],
  latitude numeric(10,7),
  longitude numeric(10,7),
  active_members integer default 0, -- count of app users who've played here
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Tee times table
create table if not exists public.tee_times (
  id uuid primary key default uuid_generate_v4(),
  course_id uuid references public.courses(id) on delete cascade,
  chronogolf_teetime_id text,
  date date not null,
  time time not null,
  available_spots integer not null,
  price numeric(10,2),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Bookings table
create table if not exists public.bookings (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references public.profiles(id) on delete cascade,
  tee_time_id uuid references public.tee_times(id) on delete cascade,
  course_id uuid references public.courses(id) on delete cascade,
  booking_date timestamptz not null,
  num_players integer not null,
  status text check (status in ('pending', 'confirmed', 'cancelled', 'completed')) default 'pending',
  total_price numeric(10,2),
  chronogolf_booking_id text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- User handicaps (track per course)
create table if not exists public.user_handicaps (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references public.profiles(id) on delete cascade,
  course_id uuid references public.courses(id) on delete cascade,
  handicap numeric(4,1) not null,
  rounds_played integer default 1,
  last_played_at timestamptz default now(),
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique(user_id, course_id)
);

-- Matches table (player matchmaking)
create table if not exists public.matches (
  id uuid primary key default uuid_generate_v4(),
  requester_id uuid references public.profiles(id) on delete cascade,
  matched_user_id uuid references public.profiles(id) on delete cascade,
  course_id uuid references public.courses(id) on delete set null,
  tee_time_id uuid references public.tee_times(id) on delete set null,
  status text check (status in ('pending', 'accepted', 'declined', 'completed')) default 'pending',
  match_date timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Groups table
create table if not exists public.groups (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  description text,
  image_url text,
  creator_id uuid references public.profiles(id) on delete cascade,
  interests text[],
  skill_levels text[],
  member_count integer default 1,
  is_private boolean default false,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Group members table
create table if not exists public.group_members (
  id uuid primary key default uuid_generate_v4(),
  group_id uuid references public.groups(id) on delete cascade,
  user_id uuid references public.profiles(id) on delete cascade,
  role text check (role in ('admin', 'member')) default 'member',
  joined_at timestamptz default now(),
  unique(group_id, user_id)
);

-- Messages table
create table if not exists public.messages (
  id uuid primary key default uuid_generate_v4(),
  sender_id uuid references public.profiles(id) on delete cascade,
  recipient_id uuid references public.profiles(id) on delete cascade,
  match_id uuid references public.matches(id) on delete set null,
  content text not null,
  read boolean default false,
  created_at timestamptz default now()
);

-- Enable Row Level Security
alter table public.profiles enable row level security;
alter table public.courses enable row level security;
alter table public.tee_times enable row level security;
alter table public.bookings enable row level security;
alter table public.user_handicaps enable row level security;
alter table public.matches enable row level security;
alter table public.groups enable row level security;
alter table public.group_members enable row level security;
alter table public.messages enable row level security;

-- RLS Policies for profiles
create policy "Users can view all profiles"
  on public.profiles for select
  using (true);

create policy "Users can update own profile"
  on public.profiles for update
  using (auth.uid() = id);

create policy "Users can insert own profile"
  on public.profiles for insert
  with check (auth.uid() = id);

-- RLS Policies for courses (public read)
create policy "Anyone can view courses"
  on public.courses for select
  using (true);

-- RLS Policies for tee_times (public read)
create policy "Anyone can view tee times"
  on public.tee_times for select
  using (true);

-- RLS Policies for bookings
create policy "Users can view own bookings"
  on public.bookings for select
  using (auth.uid() = user_id);

create policy "Users can create own bookings"
  on public.bookings for insert
  with check (auth.uid() = user_id);

create policy "Users can update own bookings"
  on public.bookings for update
  using (auth.uid() = user_id);

-- RLS Policies for user_handicaps
create policy "Users can view all handicaps"
  on public.user_handicaps for select
  using (true);

create policy "Users can manage own handicaps"
  on public.user_handicaps for all
  using (auth.uid() = user_id);

-- RLS Policies for matches
create policy "Users can view their matches"
  on public.matches for select
  using (auth.uid() = requester_id or auth.uid() = matched_user_id);

create policy "Users can create matches"
  on public.matches for insert
  with check (auth.uid() = requester_id);

create policy "Users can update their matches"
  on public.matches for update
  using (auth.uid() = requester_id or auth.uid() = matched_user_id);

-- RLS Policies for groups
create policy "Anyone can view public groups"
  on public.groups for select
  using (not is_private or creator_id = auth.uid());

create policy "Users can create groups"
  on public.groups for insert
  with check (auth.uid() = creator_id);

create policy "Creators can update their groups"
  on public.groups for update
  using (auth.uid() = creator_id);

-- RLS Policies for group_members
create policy "Users can view group members"
  on public.group_members for select
  using (true);

create policy "Users can join groups"
  on public.group_members for insert
  with check (auth.uid() = user_id);

create policy "Users can leave groups"
  on public.group_members for delete
  using (auth.uid() = user_id);

-- RLS Policies for messages
create policy "Users can view their messages"
  on public.messages for select
  using (auth.uid() = sender_id or auth.uid() = recipient_id);

create policy "Users can send messages"
  on public.messages for insert
  with check (auth.uid() = sender_id);

create policy "Recipients can update message read status"
  on public.messages for update
  using (auth.uid() = recipient_id);

-- Create indexes for performance
create index idx_profiles_skill_level on public.profiles(skill_level);
create index idx_courses_city on public.courses(city);
create index idx_tee_times_date on public.tee_times(date);
create index idx_tee_times_course on public.tee_times(course_id);
create index idx_bookings_user on public.bookings(user_id);
create index idx_bookings_teetime on public.bookings(tee_time_id);
create index idx_matches_users on public.matches(requester_id, matched_user_id);
create index idx_messages_recipient on public.messages(recipient_id);
create index idx_group_members_group on public.group_members(group_id);
