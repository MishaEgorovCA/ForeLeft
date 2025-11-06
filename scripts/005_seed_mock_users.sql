-- Seed mock user profiles for testing and demonstration
-- Note: These are profile-only entries without auth credentials
-- They will appear in the matches/discovery section but cannot log in

-- Disable RLS temporarily to ensure mock profiles can be inserted
ALTER TABLE public.profiles DISABLE ROW LEVEL SECURITY;

-- Drop foreign key constraint temporarily to allow mock profiles
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_id_fkey;

-- Delete existing mock users to allow re-running the script
DELETE FROM public.profiles WHERE email LIKE '%@example.com';

INSERT INTO public.profiles (
  id,
  email,
  full_name,
  display_name,
  avatar_url,
  bio,
  skill_level,
  average_handicap,
  interests,
  trust_score,
  total_rounds,
  completed_rounds,
  created_at,
  updated_at
) VALUES
  -- Sarah Chen - Competitive Advanced
  (
    '11111111-1111-1111-1111-111111111111'::uuid,
    'sarah.chen@example.com',
    'Sarah Chen',
    'Sarah C.',
    '/placeholder.svg?height=200&width=200',
    'Competitive golfer looking to improve my game. Love early morning rounds and challenging courses. Always up for a friendly match!',
    'advanced',
    8.5,
    ARRAY['competitive', 'fitness', 'learning'],
    95,
    45,
    42,
    now(),
    now()
  ),
  -- Mike Johnson - Social Intermediate
  (
    '22222222-2222-2222-2222-222222222222'::uuid,
    'mike.johnson@example.com',
    'Mike Johnson',
    'Mike J.',
    '/placeholder.svg?height=200&width=200',
    'Golf is my favorite way to unwind and meet new people. More about the experience than the score. Let''s have fun out there!',
    'intermediate',
    15.2,
    ARRAY['social', 'casual', 'networking'],
    100,
    32,
    30,
    now(),
    now()
  ),
  -- Emily Rodriguez - Casual Beginner
  (
    '33333333-3333-3333-3333-333333333333'::uuid,
    'emily.rodriguez@example.com',
    'Emily Rodriguez',
    'Emily R.',
    '/placeholder.svg?height=200&width=200',
    'New to golf and loving it! Looking for patient partners who don''t mind a few extra swings. Always eager to learn.',
    'beginner',
    28.0,
    ARRAY['learning', 'social', 'casual'],
    100,
    12,
    12,
    now(),
    now()
  ),
  -- David Kim - Expert Competitive
  (
    '44444444-4444-4444-4444-444444444444'::uuid,
    'david.kim@example.com',
    'David Kim',
    'David K.',
    '/placeholder.svg?height=200&width=200',
    'Single-digit handicap player. Play in local tournaments and always looking to sharpen my skills. Serious about the game but friendly on the course.',
    'expert',
    4.2,
    ARRAY['competitive', 'learning'],
    98,
    120,
    115,
    now(),
    now()
  ),
  -- Jessica Taylor - Fitness Intermediate
  (
    '55555555-5555-5555-5555-555555555555'::uuid,
    'jessica.taylor@example.com',
    'Jessica Taylor',
    'Jess T.',
    '/placeholder.svg?height=200&width=200',
    'Golf is my cardio! Love walking the course and staying active. Looking for partners who enjoy a brisk pace and healthy lifestyle.',
    'intermediate',
    16.8,
    ARRAY['fitness', 'social', 'casual'],
    100,
    38,
    36,
    now(),
    now()
  ),
  -- Alex Patel - Networking Professional
  (
    '66666666-6666-6666-6666-666666666666'::uuid,
    'alex.patel@example.com',
    'Alex Patel',
    'Alex P.',
    '/placeholder.svg?height=200&width=200',
    'Business development professional who loves golf for networking and building relationships. Great conversations, good golf, better connections.',
    'intermediate',
    14.5,
    ARRAY['networking', 'social', 'casual'],
    100,
    55,
    52,
    now(),
    now()
  ),
  -- Rachel Wong - Learning Beginner
  (
    '77777777-7777-7777-7777-777777777777'::uuid,
    'rachel.wong@example.com',
    'Rachel Wong',
    'Rachel W.',
    '/placeholder.svg?height=200&width=200',
    'Just started playing this year and absolutely hooked! Taking lessons and practicing regularly. Would love to play with others who are learning too.',
    'beginner',
    32.0,
    ARRAY['learning', 'casual', 'social'],
    100,
    8,
    8,
    now(),
    now()
  ),
  -- James Anderson - Social Advanced
  (
    '88888888-8888-8888-8888-888888888888'::uuid,
    'james.anderson@example.com',
    'James Anderson',
    'James A.',
    '/placeholder.svg?height=200&width=200',
    'Been playing for 20+ years. Love the social aspect of golf and meeting new people. Happy to share tips with newer players!',
    'advanced',
    9.8,
    ARRAY['social', 'casual', 'learning'],
    100,
    200,
    190,
    now(),
    now()
  ),
  -- Maria Garcia - Casual Intermediate
  (
    '99999999-9999-9999-9999-999999999999'::uuid,
    'maria.garcia@example.com',
    'Maria Garcia',
    'Maria G.',
    '/placeholder.svg?height=200&width=200',
    'Weekend warrior who plays for fun and relaxation. Not too serious about scores, just enjoy being outdoors and good company.',
    'intermediate',
    18.5,
    ARRAY['casual', 'social', 'fitness'],
    100,
    28,
    26,
    now(),
    now()
  ),
  -- Tom Wilson - Competitive Intermediate
  (
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'::uuid,
    'tom.wilson@example.com',
    'Tom Wilson',
    'Tom W.',
    '/placeholder.svg?height=200&width=200',
    'Working hard to break into single digits. Play in club tournaments and always looking for competitive rounds. Let''s push each other!',
    'intermediate',
    12.3,
    ARRAY['competitive', 'learning', 'fitness'],
    95,
    65,
    60,
    now(),
    now()
  ),
  -- Lisa Brown - Social Beginner
  (
    'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb'::uuid,
    'lisa.brown@example.com',
    'Lisa Brown',
    'Lisa B.',
    '/placeholder.svg?height=200&width=200',
    'Golf newbie looking for friendly faces to play with! More interested in laughs than birdies. Patient partners welcome!',
    'beginner',
    30.0,
    ARRAY['social', 'casual', 'learning'],
    100,
    10,
    10,
    now(),
    now()
  ),
  -- Kevin Lee - Advanced Fitness
  (
    'cccccccc-cccc-cccc-cccc-cccccccccccc'::uuid,
    'kevin.lee@example.com',
    'Kevin Lee',
    'Kevin L.',
    '/placeholder.svg?height=200&width=200',
    'Fitness enthusiast who discovered golf. Love the mental and physical challenge. Always walk the course and keep a good pace.',
    'advanced',
    7.9,
    ARRAY['fitness', 'competitive', 'learning'],
    100,
    85,
    80,
    now(),
    now()
  ),
  -- Amanda Martinez - Learning Intermediate
  (
    'dddddddd-dddd-dddd-dddd-dddddddddddd'::uuid,
    'amanda.martinez@example.com',
    'Amanda Martinez',
    'Amanda M.',
    '/placeholder.svg?height=200&width=200',
    'Improving steadily and loving the journey. Take lessons regularly and practice often. Looking for partners who enjoy working on their game.',
    'intermediate',
    17.2,
    ARRAY['learning', 'social', 'fitness'],
    100,
    42,
    40,
    now(),
    now()
  ),
  -- Ryan Thompson - Networking Advanced
  (
    'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee'::uuid,
    'ryan.thompson@example.com',
    'Ryan Thompson',
    'Ryan T.',
    '/placeholder.svg?height=200&width=200',
    'Tech entrepreneur who uses golf for business and pleasure. Great conversations, strategic thinking, and building lasting relationships.',
    'advanced',
    8.1,
    ARRAY['networking', 'competitive', 'social'],
    100,
    95,
    90,
    now(),
    now()
  ),
  -- Sophie Davis - Casual Expert
  (
    'ffffffff-ffff-ffff-ffff-ffffffffffff'::uuid,
    'sophie.davis@example.com',
    'Sophie Davis',
    'Sophie D.',
    '/placeholder.svg?height=200&width=200',
    'Low handicap player who plays for the love of the game. Not into tournaments, just pure enjoyment. Happy to play with anyone who loves golf!',
    'expert',
    5.5,
    ARRAY['casual', 'social', 'learning'],
    100,
    150,
    145,
    now(),
    now()
  )
ON CONFLICT (id) DO NOTHING;

-- Recreate foreign key constraint with NOT VALID to allow existing mock profiles
ALTER TABLE public.profiles 
  ADD CONSTRAINT profiles_id_fkey 
  FOREIGN KEY (id) REFERENCES auth.users(id) 
  ON DELETE CASCADE 
  NOT VALID;

-- Re-enable RLS after inserting mock profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Note: New profiles created through the app will still be validated against auth.users
-- Only these pre-existing mock profiles are exempt from the constraint check
