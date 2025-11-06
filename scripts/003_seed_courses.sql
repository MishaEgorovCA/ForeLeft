-- Seed some popular BC golf courses
insert into public.courses (name, location, city, province, description, holes, par, image_url, amenities) values
  ('Furry Creek Golf & Country Club', '150 Country Club Rd, Furry Creek', 'Furry Creek', 'BC', 'Spectacular mountain and ocean views along the Sea to Sky Highway', 18, 72, '/placeholder.svg?height=400&width=600', ARRAY['Pro Shop', 'Restaurant', 'Driving Range']),
  ('Whistler Golf Club', '4010 Whistler Way, Whistler', 'Whistler', 'BC', 'Championship course designed by Arnold Palmer in the heart of Whistler', 18, 72, '/placeholder.svg?height=400&width=600', ARRAY['Pro Shop', 'Restaurant', 'Club Rentals', 'Lessons']),
  ('Mayfair Lakes Golf & Country Club', '5460 No. 7 Rd, Richmond', 'Richmond', 'BC', 'Challenging layout with water features and mature trees', 18, 71, '/placeholder.svg?height=400&width=600', ARRAY['Pro Shop', 'Restaurant', 'Driving Range', 'Practice Greens']),
  ('University Golf Club', '5185 University Blvd, Vancouver', 'Vancouver', 'BC', 'Historic course near UBC with tree-lined fairways', 18, 71, '/placeholder.svg?height=400&width=600', ARRAY['Pro Shop', 'Restaurant', 'Lessons']),
  ('Northlands Golf Course', '3400 Anne MacDonald Way, North Vancouver', 'North Vancouver', 'BC', 'Scenic mountain course with challenging elevation changes', 18, 71, '/placeholder.svg?height=400&width=600', ARRAY['Pro Shop', 'Restaurant', 'Driving Range', 'Club Rentals'])
on conflict (chronogolf_id) do nothing;
