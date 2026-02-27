-- Add encrypted HuggingFace token column to profiles
-- Used for downloading gated models (Llama, Gemma, etc.)
ALTER TABLE profiles ADD COLUMN hf_token_encrypted TEXT;
