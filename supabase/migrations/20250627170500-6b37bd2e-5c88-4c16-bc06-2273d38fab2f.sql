
-- Migration to update sight_words table structure
-- This will handle the conversion from string arrays to object arrays with active status

-- First, let's create a function to migrate existing data
CREATE OR REPLACE FUNCTION migrate_sight_words_to_objects()
RETURNS void
LANGUAGE plpgsql
AS $$
DECLARE
    rec RECORD;
    new_words JSONB[];
    word_text TEXT;
BEGIN
    -- Loop through all existing sight_words records
    FOR rec IN SELECT user_id, words FROM sight_words WHERE words IS NOT NULL LOOP
        -- Reset the array for each record
        new_words := ARRAY[]::JSONB[];
        
        -- Convert each word string to an object with active: true
        FOREACH word_text IN ARRAY rec.words LOOP
            new_words := array_append(new_words, jsonb_build_object('word', word_text, 'active', true));
        END LOOP;
        
        -- Update the record with the new structure
        UPDATE sight_words 
        SET words_objects = new_words
        WHERE user_id = rec.user_id;
    END LOOP;
END;
$$;

-- Add new column for the enhanced structure
ALTER TABLE sight_words ADD COLUMN IF NOT EXISTS words_objects JSONB[] DEFAULT ARRAY[]::JSONB[];

-- Run the migration
SELECT migrate_sight_words_to_objects();

-- Drop the migration function as it's no longer needed
DROP FUNCTION migrate_sight_words_to_objects();
