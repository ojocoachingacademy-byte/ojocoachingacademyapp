-- Referral System Integration: Supabase Schema
-- Run this in your Supabase SQL Editor to set up tables for website ↔ app integration

-- Create referrals table (stores referral codes generated on website)
CREATE TABLE IF NOT EXISTS referrals (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  referral_code TEXT UNIQUE NOT NULL,
  referrer_first_name TEXT NOT NULL,
  referrer_last_name TEXT NOT NULL,
  referrer_email TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create bookings table (stores all bookings from website, including referral codes)
CREATE TABLE IF NOT EXISTS bookings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  booking_reference TEXT UNIQUE NOT NULL,
  customer_first_name TEXT NOT NULL,
  customer_last_name TEXT NOT NULL,
  customer_email TEXT NOT NULL,
  customer_phone TEXT,
  package_name TEXT NOT NULL,
  package_type TEXT NOT NULL,
  price DECIMAL(10,2) NOT NULL,
  referral_code TEXT,
  payment_intent_id TEXT UNIQUE,
  stripe_customer_id TEXT,
  experience_level TEXT,
  goals TEXT,
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create referral_redemptions table (tracks who used which referral code)
CREATE TABLE IF NOT EXISTS referral_redemptions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  referral_code TEXT NOT NULL,
  booking_id UUID REFERENCES bookings(id) ON DELETE CASCADE,
  redeemed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  reward_status TEXT DEFAULT 'pending', -- pending, awarded, completed
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for faster lookups
CREATE INDEX IF NOT EXISTS idx_bookings_referral_code ON bookings(referral_code);
CREATE INDEX IF NOT EXISTS idx_bookings_customer_email ON bookings(customer_email);
CREATE INDEX IF NOT EXISTS idx_referral_redemptions_code ON referral_redemptions(referral_code);
CREATE INDEX IF NOT EXISTS idx_referral_redemptions_booking ON referral_redemptions(booking_id);
CREATE INDEX IF NOT EXISTS idx_referrals_code ON referrals(referral_code);

-- Enable Row Level Security (RLS)
ALTER TABLE referrals ENABLE ROW LEVEL SECURITY;
ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE referral_redemptions ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for referrals table
-- Allow service role (Netlify functions) to insert/read
CREATE POLICY "Service role can manage referrals" ON referrals
  FOR ALL USING (auth.role() = 'service_role');

-- Allow authenticated users (coaches) to read referrals
CREATE POLICY "Authenticated users can read referrals" ON referrals
  FOR SELECT USING (auth.role() = 'authenticated');

-- Create RLS policies for bookings table
-- Allow service role (Netlify functions) to insert/update/read
CREATE POLICY "Service role can manage bookings" ON bookings
  FOR ALL USING (auth.role() = 'service_role');

-- Allow authenticated users (coaches) to read all bookings
CREATE POLICY "Authenticated users can read bookings" ON bookings
  FOR SELECT USING (auth.role() = 'authenticated');

-- Create RLS policies for referral_redemptions table
-- Allow service role (Netlify functions) to insert/update/read
CREATE POLICY "Service role can manage referral_redemptions" ON referral_redemptions
  FOR ALL USING (auth.role() = 'service_role');

-- Allow authenticated users (coaches) to read all referral_redemptions
CREATE POLICY "Authenticated users can read referral_redemptions" ON referral_redemptions
  FOR SELECT USING (auth.role() = 'authenticated');

-- Create function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for referrals table
DROP TRIGGER IF EXISTS update_referrals_updated_at ON referrals;
CREATE TRIGGER update_referrals_updated_at
  BEFORE UPDATE ON referrals
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

