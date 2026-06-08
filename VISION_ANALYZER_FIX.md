# Prompt Enhancer (Vision Analyzer) - Troubleshooting Guide

## Issue
The prompt enhancer/vision analyzer stopped working after updating OpenRouter API keys.

## Root Causes
The vision analyzer can fail for three main reasons:

1. **Invalid/Exhausted OpenRouter API Keys** - The new keys you entered are invalid, expired, or have exhausted credits
2. **Wrong Vision Model** - The selected vision model doesn't support image analysis
3. **Settings Not Properly Saved** - The app didn't persist your new keys to local storage

## Quick Diagnostics

### Step 1: Verify Your OpenRouter Keys
1. Go to **Settings → AI Provider** (bottom left gear icon)
2. Look at "OpenRouter API Key" section
3. Verify the keys are displayed correctly (should show all keys you entered)
4. Click **"Test all keys"** button
5. Check the table output:
   - ✅ **"Key works"** = This key is valid
   - ❌ **"Status 401"** = Invalid or expired key
   - ❌ **"Status 402"** = Key has exhausted credits
   - ❌ Other errors = Contact OpenRouter support

### Step 2: Test Vision Model
1. Still in Settings → AI Provider
2. Check the "Model" dropdown under OpenRouter section
3. Ensure it's set to a **vision-capable** model:
   - ✅ `google/gemini-2.0-flash`
   - ✅ `deepseek/deepseek-chat` (has vision support)
   - ✅ `meta-llama/llama-2-vision`
   - ❌ Do NOT use local model names like `minicpm-v` (those are for local Ollama only)

4. Go to **Settings → Models**
5. Verify **Vision Model** is set to the same as your OpenRouter model

### Step 3: Test Vision Capability
1. Back in Settings → AI Provider
2. Click **"Test Vision"** button
3. Look for response:
   - ✅ **"Vision test passed"** = Your setup is working
   - ❌ **"does not support images"** = This model can't analyze images. Choose a different model
   - ❌ **"insufficient credits"** = Your API key ran out of credits
   - ❌ Other errors = Contact OpenRouter support

## Solutions

### Solution A: Keys Invalid/Exhausted
1. **Get new valid API keys:**
   - Go to https://openrouter.ai
   - Sign in to your account
   - Navigate to API Keys section
   - Create new keys or verify existing ones have credits

2. **Update keys in Settings:**
   - Settings → AI Provider
   - Paste your valid key(s) in "OpenRouter API Key" field
   - Separate multiple keys with commas or newlines
   - Press Enter or click outside the field to save
   - You should see confirmation that settings were saved

3. **Test the new keys:**
   - Click "Test all keys" 
   - Verify at least one key shows "Key works"

### Solution B: Wrong Vision Model
1. Settings → AI Provider → Model dropdown
2. Choose a vision-capable OpenRouter model:
   - **Recommended:** `google/gemini-2.0-flash` (best for UI analysis)
   - **Alternative:** `deepseek/deepseek-chat`
   - **Alternative:** `meta-llama/llama-2-vision`

3. This will auto-update all models (coder, architect, planner, vision) to use the same OpenRouter model

4. Go to Settings → Models and verify Vision Model is updated

### Solution C: Settings Not Saved
1. **Force clear and reload:**
   - Settings → AI Provider
   - Change any setting (toggle provider, then back to openrouter)
   - This triggers a re-save to browser storage

2. **Check localStorage:**
   - Press `F12` to open DevTools
   - Go to Application → Local Storage
   - Find `dost-studio-settings` key
   - Verify it contains your new API keys in the `openRouterKeys` field

3. **Hard refresh the app:**
   - Press `Ctrl+Shift+R` (or `Cmd+Shift+R` on Mac)
   - This clears cache and reloads

## What Changed in This Update

### Enhanced Error Messages
- When vision analysis fails, you now see the actual error reason (e.g., "API key exhausted", "Model doesn't support images")
- Previously showed generic "Vision analysis unavailable" message

### Better Configuration Logging
- Browser console (F12 → Console) now shows debug info about which OpenRouter keys are loaded
- Look for messages like: `[Dost] OpenRouter configured: 2 key(s) available, using sk-or-v1...`

### Improved Vision Agent
- Added validation check for OpenRouter key status
- Added guidance when vision models don't support images
- Better fallback error handling

## Advanced Troubleshooting

### Check Browser Console Logs
1. Press `F12` to open DevTools
2. Go to **Console** tab
3. Look for messages starting with `[Dost]` or `Vision`:
   ```
   [Dost] OpenRouter configured: 2 key(s) available...  ← Shows loaded keys
   Vision generation error: ...  ← Shows the actual error
   ```

### Verify API Key Format
OpenRouter API keys should start with `sk-or-v1-`:
- ✅ Correct: `sk-or-v1-a3dc0b2156a9f8b8fa0634d1e7849d82ddd7b3536624c3fdfxxxxxxxxxxxxxxx`
- ❌ Wrong: `sk-abc123` or any other prefix

### Check Network Requests
1. DevTools → **Network** tab
2. Try to analyze an image
3. Look for `openrouter.ai/api/v1/chat/completions` request
4. Check the response:
   - **Status 200** = Success
   - **Status 401/402** = Key issue
   - **Status 429** = Rate limited

### Reset to Defaults
If all else fails:
1. Settings → (scroll to bottom)
2. Look for a "Reset Settings" button (if available)
3. Or clear browser storage:
   - DevTools → Application → Local Storage
   - Find and delete `dost-studio-settings`
   - Refresh page

## Next Steps

1. **Quick Test:** Go to Settings → AI Provider → Click "Test Vision"
2. **If it passes:** Vision analyzer should work now
3. **If it fails:** Note the exact error message and follow the corresponding solution above
4. **Try an image:** Upload an image in Chat or Project page and attempt analysis
5. **Still broken?** Share the exact error message from console or "Test Vision" output

## Key Points to Remember

- ✅ Vision models must be OpenRouter models (contain `/` in the name, e.g., `google/gemini-2.0-flash`)
- ✅ All OpenRouter API keys must be valid and have available credits
- ✅ Settings auto-save when you change them in the Settings UI
- ✅ Browser cache can prevent new settings from loading (use Ctrl+Shift+R to hard refresh)
- ❌ Don't mix local Ollama models with OpenRouter provider
- ❌ Don't use expired or invalid API keys

---

**Last Updated:** After implementing enhanced error handling and key validation
**Status:** Vision analyzer should now provide clear error messages when keys are invalid
