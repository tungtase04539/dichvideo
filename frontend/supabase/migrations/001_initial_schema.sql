-- DichVideo Database Schema
-- Run this in Supabase SQL Editor

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Project status enum
CREATE TYPE project_status AS ENUM (
  'pending',
  'uploading',
  'diarizing',
  'transcribing',
  'translating',
  'voice_mapping',
  'dubbing',
  'mixing',
  'rendering',
  'completed',
  'failed'
);

-- Projects table
CREATE TABLE projects (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(255) NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Video URLs (Supabase Storage)
  original_video_url TEXT,
  output_video_url TEXT,
  
  -- Languages
  original_language VARCHAR(10) DEFAULT 'en',
  target_language VARCHAR(10) DEFAULT 'vi',
  
  -- Speaker info
  num_speakers INTEGER DEFAULT 0,
  voice_mapping JSONB,
  
  -- Processing status
  status project_status DEFAULT 'pending',
  progress FLOAT DEFAULT 0,
  error_message TEXT,
  processing_server_task_id VARCHAR(100),
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

-- Speakers table
CREATE TABLE speakers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  
  speaker_label VARCHAR(20) NOT NULL, -- spk0, spk1, etc.
  name VARCHAR(100),
  
  -- ElevenLabs voice assignment
  elevenlabs_voice_id VARCHAR(100),
  elevenlabs_voice_name VARCHAR(100),
  
  -- Stats
  total_duration_ms INTEGER DEFAULT 0,
  segment_count INTEGER DEFAULT 0,
  sample_audio_url TEXT,
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Segments table (speech segments)
CREATE TABLE segments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  speaker_id UUID REFERENCES speakers(id) ON DELETE SET NULL,
  
  -- Timing
  start_ms INTEGER NOT NULL,
  end_ms INTEGER NOT NULL,
  
  -- Text content
  original_text TEXT,
  translated_text TEXT,
  
  -- Audio
  dubbed_audio_url TEXT,
  
  -- Order
  sequence INTEGER NOT NULL,
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_projects_user_id ON projects(user_id);
CREATE INDEX idx_projects_status ON projects(status);
CREATE INDEX idx_projects_created_at ON projects(created_at DESC);
CREATE INDEX idx_speakers_project_id ON speakers(project_id);
CREATE INDEX idx_segments_project_id ON segments(project_id);
CREATE INDEX idx_segments_speaker_id ON segments(speaker_id);

-- Updated at trigger
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER projects_updated_at
  BEFORE UPDATE ON projects
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

-- Row Level Security (RLS)
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE speakers ENABLE ROW LEVEL SECURITY;
ALTER TABLE segments ENABLE ROW LEVEL SECURITY;

-- Policies for projects (public for now, add auth later)
CREATE POLICY "Allow all access to projects"
  ON projects FOR ALL
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow all access to speakers"
  ON speakers FOR ALL
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow all access to segments"
  ON segments FOR ALL
  USING (true)
  WITH CHECK (true);

-- Enable realtime for projects table
ALTER PUBLICATION supabase_realtime ADD TABLE projects;

