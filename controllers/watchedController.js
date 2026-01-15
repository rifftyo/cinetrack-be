const tmdbService = require('../services/tmdb_service');
const supabase = require('../supabase/client');

const TMDB_IMAGE_BASE_URL = 'https://image.tmdb.org/t/p/w500';

const addWatchedMovie = async (req, res) => {
  try {
    const userId = req.user.id;
    const { tmdb_id, user_rating, review, watched_at } = req.body;

    if (!tmdb_id || !user_rating || !watched_at) {
      return res.status(400).json({ message: 'Missing required fields' });
    }

    // 🔥 Ambil detail dari TMDB
    const movie = await tmdbService.getMovieDetail(tmdb_id);

    const watchedMovie = {
      user_id: userId,
      tmdb_id: movie.id,

      title: movie.title,
      poster_path: movie.poster_path
        ? `${TMDB_IMAGE_BASE_URL}${movie.poster_path}`
        : null,
      backdrop_path: movie.backdrop_path
        ? `${TMDB_IMAGE_BASE_URL}${movie.backdrop_path}`
        : null,

      release_date: movie.release_date,
      runtime: movie.runtime,
      genres: movie.genres.map((g) => g.name),
      tmdb_rating: Number((movie.vote_average / 2).toFixed(1)),

      user_rating,
      review,
      watched_at,
    };

    const { error } = await supabase
      .from('watched_movies')
      .insert([watchedMovie]);

    if (error) throw error;

    res.status(201).json({
      message: 'Movie added to watched list',
      result: watchedMovie,
    });
  } catch (error) {
    res.status(500).json({
      message: 'Failed to add watched movie',
      error: error.message,
    });
  }
};

const getWatchedMovies = async (req, res) => {
  try {
    const userId = req.user.id;

    const { data, error, count } = await supabase
      .from('watched_movies')
      .select(
        `
        id,
        tmdb_id,
        title,
        poster_path,
        tmdb_rating,
        user_rating,
        review,
        watched_at,
        created_at
        `,
        { count: 'exact' }
      )
      .eq('user_id', userId)
      .order('watched_at', { ascending: false });

    if (error) throw error;

    res.status(200).json({
      message: 'Watched movies fetched successfully',
      count,
      results: data,
    });
  } catch (error) {
    res.status(500).json({
      message: 'Failed to fetch watched movies',
      error: error.message,
    });
  }
};

const updateWatchedMovie = async (req, res) => {
  try {
    const userId = req.user.id;
    const tmdbId = Number(req.params.tmdb_id);

    // ❗ VALIDASI PALING PENTING
    if (!tmdbId || isNaN(tmdbId)) {
      return res.status(400).json({
        message: 'Invalid tmdb_id',
      });
    }

    const { user_rating, review, watched_at } = req.body;

    const updates = {};

    if (user_rating !== undefined) updates.user_rating = user_rating;
    if (review !== undefined) updates.review = review;
    if (watched_at !== undefined) updates.watched_at = watched_at;

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({
        message: 'No fields to update',
      });
    }

    const { data, error } = await supabase
      .from('watched_movies')
      .update(updates)
      .eq('user_id', userId)
      .eq('tmdb_id', tmdbId)
      .select()
      .maybeSingle();

    if (error) throw error;

    if (!data) {
      return res.status(404).json({
        message: 'Watched movie not found',
      });
    }

    res.status(200).json({
      message: 'Watched movie updated successfully',
      result: data,
    });
  } catch (error) {
    res.status(500).json({
      message: 'Failed to update watched movie',
      error: error.message,
    });
  }
};

module.exports = {
  addWatchedMovie,
  getWatchedMovies,
  updateWatchedMovie,
};
