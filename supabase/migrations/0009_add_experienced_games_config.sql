-- Initialize experienced dealer required games count configuration
INSERT INTO config (key, value) 
VALUES ('EXPERIENCED_DEALER_REQUIRED_GAMES', '2')
ON CONFLICT (key) DO NOTHING;