const supabase = require('../supabase/client');
const { v4: uuidv4 } = require('uuid');

const MONTH_NAMES = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

const getProfile = async (req, res) => {
  try {
    const userId = req.user.id;

    /** =============================
     * 1️⃣ Ambil data user
     ============================== */
    const { data: user, error: userError } = await supabase
      .from('users')
      .select(
        `
        fullname,
        username,
        avatar_url,
        created_at
      `
      )
      .eq('id', userId)
      .maybeSingle(); // ✅ FIX DI SINI

    if (userError) throw userError;

    console.log('JWT USER:', req.user);
    if (!user) {
      return res.status(404).json({
        message: 'User profile not found',
      });
    }

    /** =============================
     * 2️⃣ Ambil watched movies
     ============================== */
    const { data: movies, error: moviesError } = await supabase
      .from('watched_movies')
      .select(`user_rating, genres`)
      .eq('user_id', userId);

    if (moviesError) throw moviesError;

    const moviesWatched = movies.length;

    /** =============================
     * 3️⃣ Average rating
     ============================== */
    const averageRating =
      moviesWatched === 0
        ? 0
        : movies.reduce((sum, m) => sum + Number(m.user_rating), 0) /
          moviesWatched;

    /** =============================
     * 4️⃣ Favorite genre
     ============================== */
    let favoriteGenre = null;

    if (moviesWatched > 0) {
      const genreMap = {};

      movies.forEach((m) => {
        m.genres?.forEach((g) => {
          genreMap[g] = (genreMap[g] || 0) + 1;
        });
      });

      favoriteGenre = Object.entries(genreMap).sort(
        (a, b) => b[1] - a[1]
      )[0]?.[0];
    }

    /** =============================
     * 5️⃣ Joined date
     ============================== */
    const joinedDate = new Date(user.created_at);
    const joined = `${
      MONTH_NAMES[joinedDate.getMonth()]
    } ${joinedDate.getFullYear()}`;

    /** =============================
     * RESPONSE
     ============================== */
    res.status(200).json({
      message: 'Profile fetched successfully',
      data: {
        profile_photo: user.avatar_url,
        fullname: user.fullname,
        username: user.username,
        joined,
        movies_watched: moviesWatched,
        average_rating: Number(averageRating.toFixed(2)),
        favorite_genre: favoriteGenre,
      },
    });
  } catch (error) {
    res.status(500).json({
      message: 'Failed to fetch profile',
      error: error.message,
    });
  }
};

const updateProfile = async (req, res) => {
  try {
    const userId = req.user.id;
    const { fullname, username } = req.body;
    const file = req.file; // avatar image

    /** =============================
     * 1️⃣ Validasi input
     ============================== */
    if (fullname && fullname.trim().length < 3) {
      return res.status(400).json({
        message: 'Full name must be at least 3 characters long',
      });
    }

    if (username && username.trim().length < 3) {
      return res.status(400).json({
        message: 'Username must be at least 3 characters long',
      });
    }

    /** =============================
     * 2️⃣ Ambil user saat ini
     ============================== */
    const { data: currentUser, error } = await supabase
      .from('users')
      .select('id, username, avatar_url')
      .eq('id', userId)
      .maybeSingle();

    if (error) throw error;

    if (!currentUser) {
      return res.status(404).json({ message: 'User not found' });
    }

    /** =============================
     * 3️⃣ Cek username unik
     ============================== */
    if (username && username !== currentUser.username) {
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
    }

    /** =============================
     * 4️⃣ Upload avatar ke Supabase Storage
     ============================== */
    let avatarUrl = currentUser.avatar_url;

    if (file) {
      const fileExt = file.originalname.split('.').pop();
      const fileName = `avatars/${userId}-${uuidv4()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(fileName, file.buffer, {
          contentType: file.mimetype,
          upsert: true,
        });

      if (uploadError) throw uploadError;

      const { data: publicUrlData } = supabase.storage
        .from('avatars')
        .getPublicUrl(fileName);

      avatarUrl = publicUrlData.publicUrl;
    }

    /** =============================
     * 5️⃣ Update data user
     ============================== */
    const updateData = {};
    if (fullname) updateData.fullname = fullname;
    if (username) updateData.username = username;
    if (avatarUrl) updateData.avatar_url = avatarUrl;

    updateData.updated_at = new Date().toISOString();

    const { error: updateError } = await supabase
      .from('users')
      .update(updateData)
      .eq('id', userId);

    if (updateError) throw updateError;

    /** =============================
     * RESPONSE
     ============================== */
    res.status(200).json({
      message: 'Profile updated successfully',
      data: {
        fullname: updateData.fullname ?? currentUser.fullname,
        username: updateData.username ?? currentUser.username,
        avatar_url: avatarUrl,
      },
    });
  } catch (error) {
    res.status(500).json({
      message: 'Failed to update profile',
      error: error.message,
    });
  }
};

module.exports = {
  getProfile,
  updateProfile,
};
