-- Add some sample tee times for the next 7 days
DO $$
DECLARE
  course_record RECORD;
  current_date DATE;
  time_slot TIME;
BEGIN
  -- Loop through each course
  FOR course_record IN SELECT id FROM public.courses LOOP
    -- Loop through next 7 days
    FOR i IN 0..6 LOOP
      current_date := CURRENT_DATE + i;
      
      -- Add tee times from 7 AM to 5 PM (every 15 minutes)
      FOR hour IN 7..16 LOOP
        FOR minute IN 0..45 BY 15 LOOP
          time_slot := (hour || ':' || LPAD(minute::TEXT, 2, '0'))::TIME;
          
          INSERT INTO public.tee_times (course_id, date, time, available_spots, price)
          VALUES (
            course_record.id,
            current_date,
            time_slot,
            4, -- 4 spots available per tee time
            CASE 
              WHEN hour < 12 THEN 45.00 + (RANDOM() * 20)::NUMERIC(10,2)  -- Morning rates
              WHEN hour >= 12 AND hour < 15 THEN 65.00 + (RANDOM() * 25)::NUMERIC(10,2)  -- Peak rates
              ELSE 40.00 + (RANDOM() * 15)::NUMERIC(10,2)  -- Twilight rates
            END
          )
          ON CONFLICT DO NOTHING;
        END LOOP;
      END LOOP;
    END LOOP;
  END LOOP;
END $$;
