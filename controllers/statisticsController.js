const supabase = require('../supabase/client');

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

const getStatistics = async (req, res) => {
  try {
    const userId = req.user.id;
    const currentYear = new Date().getFullYear();

    /** =============================
     * QUERY PARAM: YEAR (OPTIONAL)
     ============================== */
    const requestedYear = req.query.year ? Number(req.query.year) : null;

    if (req.query.year && isNaN(requestedYear)) {
      return res.status(400).json({
        message: 'Invalid year parameter',
      });
    }

    /** =============================
     * FETCH DATA
     ============================== */
    let query = supabase
      .from('watched_movies')
      .select(`user_rating, watched_at, genres`)
      .eq('user_id', userId)
      .order('watched_at', { ascending: true });

    // Optimasi: filter langsung di DB kalau year dikirim
    if (requestedYear) {
      query = query
        .gte('watched_at', `${requestedYear}-01-01`)
        .lte('watched_at', `${requestedYear}-12-31`);
    }

    const { data: movies, error } = await query;
    if (error) throw error;

    if (!movies || movies.length === 0) {
      return res.status(200).json({
        message: 'No watched movies yet',
        data: {},
      });
    }

    /** =============================
     * GROUP BY YEAR
     ============================== */
    const moviesByYear = {};
    movies.forEach((m) => {
      const year = new Date(m.watched_at).getFullYear();
      if (!moviesByYear[year]) moviesByYear[year] = [];
      moviesByYear[year].push(m);
    });

    /** =============================
     * BUILD STATISTICS
     ============================== */
    const statistics = {};

    for (const year in moviesByYear) {
      const yearMovies = moviesByYear[year];
      const totalWatched = yearMovies.length;

      /** Average rating */
      const avgRating =
        yearMovies.reduce((sum, m) => sum + Number(m.user_rating), 0) /
        totalWatched;

      /** Watched this month (only current year) */
      const now = new Date();
      const thisMonthCount =
        Number(year) === currentYear
          ? yearMovies.filter((m) => {
              const d = new Date(m.watched_at);
              return (
                d.getMonth() === now.getMonth() &&
                d.getFullYear() === now.getFullYear()
              );
            }).length
          : 0;

      /** Day streak */
      const uniqueDays = [
        ...new Set(
          yearMovies.map((m) => new Date(m.watched_at).toDateString()),
        ),
      ];

      let streak = 1;
      let maxStreak = uniqueDays.length > 0 ? 1 : 0;

      for (let i = 1; i < uniqueDays.length; i++) {
        const prev = new Date(uniqueDays[i - 1]);
        const curr = new Date(uniqueDays[i]);
        const diff = (curr - prev) / (1000 * 60 * 60 * 24);

        if (diff === 1) {
          streak++;
          maxStreak = Math.max(maxStreak, streak);
        } else {
          streak = 1;
        }
      }

      /** Monthly stats */
      const monthly = MONTH_NAMES.map((name) => ({
        month: name,
        count: 0,
      }));

      yearMovies.forEach((m) => {
        const monthIndex = new Date(m.watched_at).getMonth();
        monthly[monthIndex].count++;
      });

      /** Favorite genres */
      const genreMap = {};
      yearMovies.forEach((m) => {
        m.genres?.forEach((g) => {
          genreMap[g] = (genreMap[g] || 0) + 1;
        });
      });

      const favoriteGenres = Object.entries(genreMap)
        .map(([genre, count]) => ({
          genre,
          count,
          percentage: Number(((count / totalWatched) * 100).toFixed(1)),
        }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 6);

      /** Rating distribution */
      const ratingMap = {};
      yearMovies.forEach((m) => {
        const rating = Number(m.user_rating).toFixed(1);
        ratingMap[rating] = (ratingMap[rating] || 0) + 1;
      });

      const ratingDistribution = Object.entries(ratingMap)
        .map(([rating, count]) => ({
          rating: Number(rating),
          count,
        }))
        .sort((a, b) => a.rating - b.rating);

      statistics[year] = {
        total_watched: totalWatched,
        avg_rating: Number(avgRating.toFixed(2)),
        this_month: thisMonthCount,
        day_streak: maxStreak,
        monthly,
        favorite_genres: favoriteGenres,
        rating_distribution: ratingDistribution,
      };
    }

    return res.status(200).json({
      message: 'Statistics fetched successfully',
      data: statistics,
    });
  } catch (error) {
    return res.status(500).json({
      message: 'Failed to fetch statistics',
      error: error.message,
    });
  }
};

/** =============================
 * DETERMINISTIC RANDOM
 ============================== */
function seededRandom(seed) {
  let x = Math.sin(seed) * 10000;
  return x - Math.floor(x);
}

function shuffleWithSeed(array, seed) {
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(seededRandom(seed + i) * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

/** =============================
 * INSIGHT TEMPLATES (20)
 ============================== */
const INSIGHT_TEMPLATES = [
  (s) =>
    `You’ve watched ${s.total_watched} movies this year. Keep the streak going! 🎬`,
  (s) => `Your average rating is ${s.avg_rating}. You know what you like! ⭐`,
  (s) =>
    `You watched ${s.this_month} movies this month. Productivity level: movie buff.`,
  (s) =>
    `Your longest watching streak is ${s.day_streak} days straight. Impressive! 🔥`,
  (s) => `January was your busiest month with ${s.monthly[0].count} movies.`,
  (s) =>
    `Your favorite genre dominates ${
      s.favorite_genres[0]?.percentage || 0
    }% of your watches.`,
  (s) =>
    `You seem to enjoy ${
      s.favorite_genres[0]?.genre || 'various genres'
    } the most.`,
  (s) =>
    `Balanced taste! You explored ${s.favorite_genres.length} different genres.`,
  (s) =>
    `Most of your movies are rated ${
      s.rating_distribution.at(-1)?.rating || 0
    } stars.`,
  (s) => `You rarely give low ratings. Quality matters to you.`,
  (s) => `Your watch habit shows consistency over time.`,
  (s) => `Movies are clearly part of your routine this year.`,
  (s) => `You tend to rate movies fairly rather than extremely.`,
  (s) => `Your highest-rated movies define your taste clearly.`,
  (s) => `Your watch history shows great genre diversity.`,
  (s) => `You prefer quality over quantity when watching movies.`,
  (s) => `Your recent activity shows strong engagement.`,
  (s) => `You are building an impressive personal movie archive.`,
  (s) => `Your movie journey this year is worth tracking.`,
  (s) => `Every movie you watch shapes your unique taste.`,
];

/** =============================
 * CONTROLLER
 ============================== */
const getInsights = async (req, res) => {
  try {
    const userId = req.user.id;
    const today = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
    const seed = Number(today.replace(/-/g, '') + String(userId).length);

    /** Ambil statistik */
    const { data: movies, error } = await supabase
      .from('watched_movies')
      .select(`user_rating, watched_at, genres`)
      .eq('user_id', userId);

    if (error) throw error;

    if (!movies || movies.length === 0) {
      return res.status(200).json({
        message: 'No insights available',
        data: [],
      });
    }

    /** Hitung statistik singkat (tahun sekarang saja) */
    const currentYear = new Date().getFullYear();
    const yearMovies = movies.filter(
      (m) => new Date(m.watched_at).getFullYear() === currentYear,
    );

    if (yearMovies.length === 0) {
      return res.status(200).json({
        message: 'No insights for this year',
        data: [],
      });
    }

    /** REUSE LOGIC STATISTIK */
    const totalWatched = yearMovies.length;
    const avgRating =
      yearMovies.reduce((s, m) => s + Number(m.user_rating), 0) / totalWatched;

    const monthly = Array.from({ length: 12 }, (_, i) => ({
      month: i,
      count: 0,
    }));

    const genreMap = {};
    const ratingMap = {};

    yearMovies.forEach((m) => {
      const d = new Date(m.watched_at);
      monthly[d.getMonth()].count++;

      m.genres?.forEach((g) => {
        genreMap[g] = (genreMap[g] || 0) + 1;
      });

      const r = Number(m.user_rating).toFixed(1);
      ratingMap[r] = (ratingMap[r] || 0) + 1;
    });

    const favoriteGenres = Object.entries(genreMap)
      .map(([genre, count]) => ({
        genre,
        count,
        percentage: (count / totalWatched) * 100,
      }))
      .sort((a, b) => b.count - a.count);

    const ratingDistribution = Object.entries(ratingMap)
      .map(([rating, count]) => ({
        rating: Number(rating),
        count,
      }))
      .sort((a, b) => a.rating - b.rating);

    const stats = {
      total_watched: totalWatched,
      avg_rating: Number(avgRating.toFixed(2)),
      this_month: monthly[new Date().getMonth()].count,
      day_streak: yearMovies.length, // simplified
      monthly,
      favorite_genres: favoriteGenres,
      rating_distribution: ratingDistribution,
    };

    /** Generate insights */
    const generatedInsights = INSIGHT_TEMPLATES.map((fn) => fn(stats));

    const shuffled = shuffleWithSeed(generatedInsights, seed);
    const dailyInsights = shuffled.slice(0, 3);

    res.status(200).json({
      message: 'Insights fetched successfully',
      date: today,
      data: dailyInsights,
    });
  } catch (error) {
    res.status(500).json({
      message: 'Failed to fetch insights',
      error: error.message,
    });
  }
};

module.exports = {
  getStatistics,
  getInsights,
};
