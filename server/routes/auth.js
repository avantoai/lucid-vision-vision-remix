const express = require('express');
const router = express.Router();
const { supabase, supabaseAdmin } = require('../config/supabase');

router.post('/send-magic-link', async (req, res) => {
  try {
    const { email } = req.body;
    console.log('📧 Magic link request for email:', email);

    if (!email) {
      console.log('❌ No email provided');
      return res.status(400).json({ error: 'Email is required' });
    }

    console.log('🔐 Calling Supabase signInWithOtp...');
    const { data, error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: process.env.REDIRECT_URL || 'lucidvision://auth/callback'
      }
    });

    if (error) {
      console.error('❌ Supabase error:', error);
      return res.status(400).json({ error: error.message });
    }

    console.log('✅ Magic link sent successfully');
    res.json({ success: true, message: 'Magic link sent to email' });
  } catch (error) {
    console.error('❌ Send magic link error:', error);
    res.status(500).json({ error: 'Failed to send magic link' });
  }
});

router.post('/verify-otp', async (req, res) => {
  try {
    const { email, token } = req.body;

    const { data, error } = await supabase.auth.verifyOtp({
      email,
      token,
      type: 'email'
    });

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    res.json({ 
      success: true, 
      session: data.session,
      user: data.user,
      isNewUser: !data.user.user_metadata?.full_name
    });
  } catch (error) {
    console.error('Verify OTP error:', error);
    res.status(500).json({ error: 'Failed to verify OTP' });
  }
});

router.post('/update-profile', async (req, res) => {
  try {
    const { userId, fullName } = req.body;

    const { data, error } = await supabaseAdmin.auth.admin.updateUserById(
      userId,
      { user_metadata: { full_name: fullName } }
    );

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    const { error: profileError } = await supabaseAdmin
      .from('users')
      .upsert({
        id: userId,
        full_name: fullName,
        created_at: new Date().toISOString()
      });

    if (profileError) {
      console.error('Profile update error:', profileError);
    }

    res.json({ success: true, user: data.user });
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({ error: 'Failed to update profile' });
  }
});

module.exports = router;
