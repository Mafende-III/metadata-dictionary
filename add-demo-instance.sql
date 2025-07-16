-- Add a working demo DHIS2 instance
INSERT INTO dhis2_instances (
  name, 
  base_url, 
  username, 
  password_encrypted, 
  version, 
  status
) VALUES (
  'DHIS2 Demo Server',
  'https://play.im.dhis2.org/stable-2-40-8-1/',
  'admin',
  'ZGlzdHJpY3Q=', -- Base64 encoded 'district'
  '2.40.1',
  'connected'
) ON CONFLICT (base_url) DO NOTHING;

-- Check what instances we now have
SELECT id, name, base_url, username, status, created_at 
FROM dhis2_instances 
ORDER BY created_at DESC; 