const bcrypt = require('bcrypt');
const nodemailer = require('nodemailer');
const supabase = require('../supabase/client');
const jwt = require('jsonwebtoken');

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

// =================== REGISTER ===================
const register = async (req, res) => {
  const { email, password, username, fullname } = req.body;

  try {
    // Full name validation
    if (!fullname || fullname.trim().length < 3) {
      return res.status(400).json({
        message: 'Full name must be at least 3 characters long',
      });
    }

    // Username validation
    if (!username || username.trim().length < 3) {
      return res.status(400).json({
        message: 'Username must be at least 3 characters long',
      });
    }

    // Password validation
    const passwordRegex = /^(?=.*\d).{8,}$/;
    if (!passwordRegex.test(password)) {
      return res.status(400).json({
        message: 'Password must be at least 8 characters and contain a number',
      });
    }

    // 🔎 Check username uniqueness
    const { data: existingUsername } = await supabase
      .from('users')
      .select('id')
      .eq('username', username)
      .maybeSingle();

    if (existingUsername) {
      return res.status(400).json({
        message: 'Username is already taken',
      });
    }

    // 🔎 Check email
    const { data: existingUser } = await supabase
      .from('users')
      .select('*')
      .eq('email', email)
      .maybeSingle();

    if (existingUser) {
      if (existingUser.is_verified) {
        return res.status(400).json({
          message: 'Email is already registered and verified',
        });
      } else {
        // Delete old OTP if user not verified
        await supabase.from('otp_codes').delete().eq('email', email);
      }
    } else {
      const hashedPassword = await bcrypt.hash(password, 10);

      const { error: insertUserError } = await supabase.from('users').insert([
        {
          email,
          username,
          fullname,
          password: hashedPassword,
          is_verified: false,
          created_at: new Date(),
        },
      ]);

      if (insertUserError) throw insertUserError;
    }

    // Generate OTP
    const otpCode = Math.floor(1000 + Math.random() * 9000).toString();
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000).toISOString();

    await supabase
      .from('otp_codes')
      .insert([{ email, code: otpCode, expires_at: expiresAt }]);

    // Send OTP email
    await transporter.sendMail({
      from: `"CineTrack 🎬" <${process.env.EMAIL_USER}>`,
      to: email,
      subject: '🎬 Verify Your CineTrack Account',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; border: 1px solid #eee; border-radius: 10px; overflow: hidden;">
          <div style="background-color: #111827; padding: 20px; text-align: center; color: white;">
            <h1>CineTrack 🎬</h1>
            <p style="margin: 0; font-size: 14px;">Track. Rate. Review.</p>
          </div>

          <div style="padding: 20px;">
            <h2>Hello ${fullname} 👋,</h2>
            <p>
              Thank you for joining <b>CineTrack</b>.
              Please use the OTP code below to verify your account:
            </p>

            <div style="text-align: center; margin: 30px 0;">
              <h1 style="color: #111827; font-size: 36px; letter-spacing: 5px;">
                ${otpCode}
              </h1>
            </div>

            <p>
              This code is valid for <b>5 minutes</b>.
              Please do not share this code with anyone.
            </p>
          </div>

          <div style="background-color: #f3f4f6; padding: 15px; text-align: center; font-size: 12px; color: #6b7280;">
            <p>© ${new Date().getFullYear()} CineTrack. All rights reserved.</p>
          </div>
        </div>
      `,
    });

    res.status(200).json({
      message:
        'OTP has been sent to your email. Please verify your account (valid for 5 minutes).',
    });
  } catch (error) {
    res.status(500).json({
      message: 'An error occurred',
      error: error.message,
    });
  }
};

// =================== VERIFY OTP ===================
const verifyOtp = async (req, res) => {
  const { email, code } = req.body;

  try {
    const { data: otpData } = await supabase
      .from('otp_codes')
      .select('*')
      .eq('email', email)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!otpData) {
      return res.status(400).json({
        message: 'OTP code not found',
      });
    }

    if (new Date(otpData.expires_at) < new Date()) {
      return res.status(400).json({
        message: 'OTP code has expired. Please request a new one.',
      });
    }

    if (otpData.code !== code) {
      return res.status(400).json({
        message: 'Invalid OTP code',
      });
    }

    await supabase
      .from('users')
      .update({ is_verified: true })
      .eq('email', email);

    await supabase.from('otp_codes').delete().eq('email', email);

    const { data: user } = await supabase
      .from('users')
      .select('id, email, username, is_verified')
      .eq('email', email)
      .maybeSingle();

    const token = jwt.sign(
      { id: user.id, email: user.email },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    console.log(user.id, user.email);

    res.status(200).json({
      message: 'Verification successful. Your account is now active!',
      token,
      user,
    });
  } catch (error) {
    res.status(500).json({
      message: 'An error occurred',
      error: error.message,
    });
  }
};

// =================== LOGIN ===================
const login = async (req, res) => {
  const { email, password } = req.body;

  try {
    const { data: user } = await supabase
      .from('users')
      .select('*')
      .eq('email', email)
      .maybeSingle();

    if (!user) {
      return res.status(400).json({
        message: 'Email not found',
      });
    }

    if (!user.is_verified) {
      return res.status(400).json({
        message: 'Account is not verified. Please check your email.',
      });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({
        message: 'Incorrect password',
      });
    }

    const token = jwt.sign(
      { id: user.id, email: user.email },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.status(200).json({
      message: 'Login successful!',
      token,
      user: {
        id: user.id,
        email: user.email,
        is_verified: user.is_verified,
      },
    });
  } catch (error) {
    res.status(500).json({
      message: 'An error occurred',
      error: error.message,
    });
  }
};

// =================== REQUEST PASSWORD RESET ===================
const requestPasswordReset = async (req, res) => {
  const { email } = req.body;

  try {
    const { data: user } = await supabase
      .from('users')
      .select('*')
      .eq('email', email)
      .maybeSingle();

    if (!user) {
      return res.status(400).json({
        message: 'Email not found',
      });
    }

    await supabase.from('otp_codes').delete().eq('email', email);

    const otpCode = Math.floor(1000 + Math.random() * 9000).toString();
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000);

    await supabase
      .from('otp_codes')
      .insert([{ email, code: otpCode, expires_at: expiresAt }]);

    await transporter.sendMail({
      from: `"CineTrack 🎬" <${process.env.EMAIL_USER}>`,
      to: email,
      subject: '🎬 Reset Your CineTrack Password',
      html: `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; border: 1px solid #eee; border-radius: 10px; overflow: hidden;">
      
      <div style="background-color: #111827; padding: 20px; text-align: center; color: white;">
        <h1>CineTrack 🎬</h1>
        <p style="margin: 0; font-size: 14px;">Track. Rate. Review.</p>
      </div>

      <div style="padding: 20px;">
        <h2>Password Reset Request 🔐</h2>
        <p>
          We received a request to reset your <b>CineTrack</b> account password.
          Please use the OTP code below to proceed:
        </p>

        <div style="text-align: center; margin: 30px 0;">
          <h1 style="color: #111827; font-size: 36px; letter-spacing: 5px;">
            ${otpCode}
          </h1>
        </div>

        <p>
          This code is valid for <b>5 minutes</b>.
          If you did not request a password reset, please ignore this email.
        </p>
      </div>

      <div style="background-color: #f3f4f6; padding: 15px; text-align: center; font-size: 12px; color: #6b7280;">
        <p>© ${new Date().getFullYear()} CineTrack. All rights reserved.</p>
      </div>

    </div>
  `,
    });

    res.status(200).json({
      message: 'Password reset OTP has been sent to your email.',
    });
  } catch (error) {
    res.status(500).json({
      message: 'An error occurred',
      error: error.message,
    });
  }
};

// =================== VERIFY RESET OTP ===================
const verifyResetOtp = async (req, res) => {
  const { email, code } = req.body;

  try {
    const { data: otpData } = await supabase
      .from('otp_codes')
      .select('*')
      .eq('email', email)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!otpData) {
      return res.status(400).json({
        message: 'OTP code not found',
      });
    }

    if (new Date(otpData.expires_at) < new Date()) {
      return res.status(400).json({
        message: 'OTP code has expired',
      });
    }

    if (otpData.code !== code) {
      return res.status(400).json({
        message: 'Invalid OTP code',
      });
    }

    res.status(200).json({
      message: 'OTP verified. Please enter your new password.',
    });
  } catch (error) {
    res.status(500).json({
      message: 'An error occurred',
      error: error.message,
    });
  }
};

// =================== RESET PASSWORD ===================
const resetPassword = async (req, res) => {
  const { email, code, newPassword } = req.body;

  try {
    const { data: otpData } = await supabase
      .from('otp_codes')
      .select('*')
      .eq('email', email)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!otpData) {
      return res.status(400).json({
        message: 'OTP code not found',
      });
    }

    if (new Date(otpData.expires_at) < new Date()) {
      return res.status(400).json({
        message: 'OTP code has expired',
      });
    }

    if (otpData.code !== code) {
      return res.status(400).json({
        message: 'Invalid OTP code',
      });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);

    await supabase
      .from('users')
      .update({ password: hashedPassword })
      .eq('email', email);

    await supabase.from('otp_codes').delete().eq('email', email);

    res.status(200).json({
      message: 'Password has been reset successfully. Please login again.',
    });
  } catch (error) {
    res.status(500).json({
      message: 'An error occurred',
      error: error.message,
    });
  }
};

module.exports = {
  register,
  verifyOtp,
  login,
  requestPasswordReset,
  verifyResetOtp,
  resetPassword,
};
