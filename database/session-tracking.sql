-- Session Tracking Schema for Login Limits
-- Mỗi user chỉ được login 1 mobile + 1 desktop cùng lúc

-- Create user sessions table
CREATE TABLE IF NOT EXISTS user_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_email TEXT NOT NULL,
  device_type TEXT NOT NULL CHECK (device_type IN ('mobile', 'desktop')),
  device_info TEXT, -- User agent, IP, etc.
  session_token TEXT UNIQUE NOT NULL,
  last_active_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_user_sessions_email ON user_sessions(user_email);
CREATE INDEX IF NOT EXISTS idx_user_sessions_token ON user_sessions(session_token);
CREATE INDEX IF NOT EXISTS idx_user_sessions_last_active ON user_sessions(last_active_at);

-- Function to validate session limit
CREATE OR REPLACE FUNCTION validate_session_limit(
  p_user_email TEXT,
  p_device_type TEXT,
  p_session_token TEXT,
  p_device_info TEXT DEFAULT NULL
)
RETURNS JSON AS $$
DECLARE
  existing_session RECORD;
  result JSON;
BEGIN
  -- Check if there's an existing session for this device type
  SELECT * INTO existing_session
  FROM user_sessions
  WHERE user_email = p_user_email
    AND device_type = p_device_type
    AND session_token != p_session_token
    AND last_active_at > NOW() - INTERVAL '24 hours';

  IF FOUND THEN
    -- There's an active session on another device of same type
    RETURN json_build_object(
      'success', false,
      'message', format('Bạn đã đăng nhập trên %s khác', 
        CASE p_device_type 
          WHEN 'mobile' THEN 'thiết bị di động'
          ELSE 'máy tính'
        END),
      'existing_session', json_build_object(
        'device_info', existing_session.device_info,
        'last_active', existing_session.last_active_at
      )
    );
  END IF;

  -- Clean up old sessions (inactive for more than 24 hours)
  DELETE FROM user_sessions 
  WHERE user_email = p_user_email 
    AND last_active_at < NOW() - INTERVAL '24 hours';

  -- Update or create session
  INSERT INTO user_sessions (user_email, device_type, session_token, device_info)
  VALUES (p_user_email, p_device_type, p_session_token, p_device_info)
  ON CONFLICT (session_token) 
  DO UPDATE SET 
    last_active_at = NOW(),
    device_info = COALESCE(p_device_info, user_sessions.device_info);

  RETURN json_build_object(
    'success', true,
    'message', 'Session validated successfully'
  );
END;
$$ LANGUAGE plpgsql;

-- Function to force login on new device
CREATE OR REPLACE FUNCTION force_new_session(
  p_user_email TEXT,
  p_device_type TEXT,
  p_session_token TEXT,
  p_device_info TEXT DEFAULT NULL
)
RETURNS JSON AS $$
BEGIN
  -- Delete existing sessions of same device type
  DELETE FROM user_sessions
  WHERE user_email = p_user_email
    AND device_type = p_device_type
    AND session_token != p_session_token;

  -- Create new session
  INSERT INTO user_sessions (user_email, device_type, session_token, device_info)
  VALUES (p_user_email, p_device_type, p_session_token, p_device_info)
  ON CONFLICT (session_token) 
  DO UPDATE SET 
    last_active_at = NOW(),
    device_info = COALESCE(p_device_info, user_sessions.device_info);

  RETURN json_build_object(
    'success', true,
    'message', 'Đã chuyển sang thiết bị mới'
  );
END;
$$ LANGUAGE plpgsql;

-- Function to update session activity
CREATE OR REPLACE FUNCTION update_session_activity(p_session_token TEXT)
RETURNS VOID AS $$
BEGIN
  UPDATE user_sessions 
  SET last_active_at = NOW()
  WHERE session_token = p_session_token;
END;
$$ LANGUAGE plpgsql;

-- Clean up old sessions automatically
CREATE OR REPLACE FUNCTION cleanup_old_sessions()
RETURNS void AS $$
BEGIN
  DELETE FROM user_sessions 
  WHERE last_active_at < NOW() - INTERVAL '7 days';
END;
$$ LANGUAGE plpgsql;

-- Enable Row Level Security
ALTER TABLE user_sessions ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Users can only see their own sessions
CREATE POLICY "users_see_own_sessions" ON user_sessions
FOR SELECT USING (user_email = current_setting('app.current_user_email', true));

-- Admin can see all sessions
CREATE POLICY "admin_see_all_sessions" ON user_sessions
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM users
    WHERE email = current_setting('app.current_user_email', true)
      AND role = 'admin'
  )
);
