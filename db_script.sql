-- ==========================================
-- 1. TẠO CÁC BẢNG DANH MỤC (DIMENSION TABLES)
-- ==========================================
CREATE TABLE public.dim_heroes (
  hero_id SERIAL PRIMARY KEY,
  hero_name TEXT NOT NULL UNIQUE,
  primary_role TEXT NOT NULL -- Ví dụ: 'Tank', 'Warrior', 'Assassin', 'Mage', 'Marksman', 'Support'
);

CREATE TABLE public.dim_items (
  item_id SERIAL PRIMARY KEY,
  item_name TEXT NOT NULL UNIQUE,
  tier INT DEFAULT 3
);

-- ==========================================
-- 2. TẠO BẢNG PROFILES & GAME_PROFILES
-- ==========================================
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT DEFAULT 'player' CHECK (role IN ('player', 'organizer', 'admin')),
  display_name TEXT,
  avatar_url TEXT,
  bio TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE public.game_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID UNIQUE NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  ingame_name TEXT NOT NULL,
  game_uid TEXT,
  current_tier TEXT,
  current_rank TEXT,
  main_roles TEXT[] DEFAULT '{}', -- Lưu mảng vị trí sở trường: ['Jungle', 'Top']
  system_mmr INT DEFAULT 1000,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==========================================
-- 3. TẠO BẢNG MATCHES & MATCH_DETAILS
-- ==========================================
CREATE TABLE public.matches (
  match_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organizer_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  match_type TEXT DEFAULT 'casual' CHECK (match_type IN ('casual', 'competitive', 'tournament')),
  duration_sec INT,
  blue_team_score INT DEFAULT 0,
  red_team_score INT DEFAULT 0,
  winner_team TEXT CHECK (winner_team IN ('blue', 'red')),
  played_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE public.match_details (
  detail_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  match_id UUID NOT NULL REFERENCES public.matches(match_id) ON DELETE CASCADE,
  game_profile_id UUID REFERENCES public.game_profiles(id) ON DELETE SET NULL, -- NULLABLE cho khách vãng lai chưa có tài khoản
  hero_id INT REFERENCES public.dim_heroes(hero_id) ON DELETE SET NULL,
  team_side TEXT NOT NULL CHECK (team_side IN ('blue', 'red')),
  lane TEXT, -- 'Top', 'Jungle', 'Mid', 'Dragon', 'Support'
  match_score NUMERIC(4,2),
  is_mvp BOOLEAN DEFAULT FALSE,
  kills INT DEFAULT 0,
  deaths INT DEFAULT 0,
  assists INT DEFAULT 0,
  gold_earned INT DEFAULT 0,
  dmg_dealt INT DEFAULT 0,
  dmg_dealt_pct NUMERIC(5,2),
  dmg_taken INT DEFAULT 0,
  dmg_taken_pct NUMERIC(5,2),
  combat_join_pct NUMERIC(5,2),
  items_build JSONB DEFAULT '[]'::jsonb -- Lưu danh sách ID trang bị dạng mảng JSON: [101, 102, 105]
);

-- ==========================================
-- 4. TRIGGER TỰ ĐỘNG TẠO PROFILE KHI SIGN UP
-- ==========================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  -- Tự động tạo dòng trong bảng profiles
  INSERT INTO public.profiles (id, display_name, avatar_url)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(NEW.email, '@', 1)),
    NEW.raw_user_meta_data->>'avatar_url'
  );

  -- Tự động tạo dòng trong bảng game_profiles
  INSERT INTO public.game_profiles (user_id, ingame_name, current_rank)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'ingame_name', COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(NEW.email, '@', 1))),
    COALESCE(NEW.raw_user_meta_data->>'current_rank', 'Unranked')
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- ==========================================
-- 5. BẬT ROW LEVEL SECURITY (RLS) & POLICIES CƠ BẢN
-- ==========================================
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.game_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.matches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.match_details ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dim_heroes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dim_items ENABLE ROW LEVEL SECURITY;

-- Cho phép mọi người xem dữ liệu (Public Read)
CREATE POLICY "Public Read Profiles" ON public.profiles FOR SELECT USING (true);
CREATE POLICY "Public Read Game Profiles" ON public.game_profiles FOR SELECT USING (true);
CREATE POLICY "Public Read Matches" ON public.matches FOR SELECT USING (true);
CREATE POLICY "Public Read Match Details" ON public.match_details FOR SELECT USING (true);
CREATE POLICY "Public Read Heroes" ON public.dim_heroes FOR SELECT USING (true);
CREATE POLICY "Public Read Items" ON public.dim_items FOR SELECT USING (true);

-- Cho phép User tự cập nhật hồ sơ của chính mình
CREATE POLICY "Users Update Own Profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Users Update Own Game Profile" ON public.game_profiles FOR UPDATE USING (auth.uid() = user_id);

-- Cho phép người dùng đã đăng nhập tạo và cập nhật trận đấu do mình tổ chức
CREATE POLICY "Auth Users Insert Matches" ON public.matches FOR INSERT WITH CHECK (auth.uid() = organizer_id);
CREATE POLICY "Organizer Update Matches" ON public.matches FOR UPDATE USING (auth.uid() = organizer_id);
CREATE POLICY "Auth Users Insert Match Details" ON public.match_details FOR INSERT WITH CHECK (auth.role() = 'authenticated');