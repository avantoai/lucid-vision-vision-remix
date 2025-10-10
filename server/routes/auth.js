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

    const redirectUrl = process.env.REDIRECT_URL || 'lucidvision://auth/callback';
    console.log('🔐 Calling Supabase signInWithOtp with redirect:', redirectUrl);
    
    const { data, error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: redirectUrl
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

router.get('/me', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Missing or invalid authorization header' });
    }

    const token = authHeader.substring(7);
    const { data: { user }, error } = await supabase.auth.getUser(token);

    if (error || !user) {
      return res.status(401).json({ error: 'Invalid or expired token' });
    }

    let { data: dbUser } = await supabaseAdmin
      .from('users')
      .select('*')
      .eq('id', user.id)
      .single();

    if (!dbUser) {
      const { data: newUser, error: insertError } = await supabaseAdmin
        .from('users')
        .insert({
          id: user.id,
          full_name: user.user_metadata?.full_name || '',
          subscription_tier: 'basic',
          trial_ends_at: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString()
        })
        .select()
        .single();

      if (insertError) {
        console.error('Failed to create user record:', insertError);
      } else {
        dbUser = newUser;
      }
    }

    res.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        full_name: user.user_metadata?.full_name || dbUser?.full_name || null,
        subscription_tier: dbUser?.subscription_tier || 'basic',
        trial_ends_at: dbUser?.trial_ends_at || null,
      },
      isNewUser: !user.user_metadata?.full_name && !dbUser?.full_name
    });
  } catch (error) {
    console.error('Get user info error:', error);
    res.status(500).json({ error: 'Failed to get user info' });
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

    // Fetch the complete user record to return
    const { data: dbUser } = await supabaseAdmin
      .from('users')
      .select('*')
      .eq('id', userId)
      .single();

    res.json({ 
      success: true, 
      user: {
        id: data.user.id,
        email: data.user.email,
        full_name: fullName,
        subscription_tier: dbUser?.subscription_tier || 'basic',
        trial_ends_at: dbUser?.trial_ends_at || null,
      }
    });
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({ error: 'Failed to update profile' });
  }
});

router.get('/callback', async (req, res) => {
  try {
    console.log('🔗 Auth callback hit - Query params:', req.query);
    console.log('🔗 Auth callback hit - Full URL:', req.originalUrl);
    
    const expoDevUrl = process.env.EXPO_DEV_URL || 'exp://192.168.1.203:8081';
    
    const urlParts = req.originalUrl.split('#');
    let params = { ...req.query };
    
    if (urlParts.length > 1) {
      const hashParams = new URLSearchParams(urlParts[1]);
      hashParams.forEach((value, key) => {
        params[key] = value;
      });
    }
    
    const queryString = new URLSearchParams(params).toString();
    const deepLink = `${expoDevUrl}/--/auth/callback?${queryString}`;
    
    console.log('📱 Redirecting to Expo:', deepLink);
    
    res.send(`
      <!DOCTYPE html>
      <html>
        <head>
          <meta http-equiv="refresh" content="0; url=${deepLink}">
          <title>Redirecting to Lucid Vision...</title>
        </head>
        <body>
          <h2>Opening Lucid Vision...</h2>
          <p>If the app doesn't open automatically, <a href="${deepLink}">click here</a>.</p>
          <script>
            window.location.href = "${deepLink}";
          </script>
        </body>
      </html>
    `);
  } catch (error) {
    console.error('❌ Auth callback error:', error);
    res.status(500).send('Authentication callback failed');
  }
});

module.exports = router;
