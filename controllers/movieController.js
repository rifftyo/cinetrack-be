const tmdbService = require('../services/tmdb_service');
const supabase = require('../supabase/client');

const TMDB_IMAGE_BASE_URL = 'https://image.tmdb.org/t/p/w500';

const getNowPlayingMovies = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;

    const data = await tmdbService.getNowPlayingMovies(page);

    const movies = data.results.map((movie) => ({
      id: movie.id,
      title: movie.title,
      poster_path: movie.poster_path
        ? `${TMDB_IMAGE_BASE_URL}${movie.poster_path}`
        : null,
      rating: Number((movie.vote_average / 2).toFixed(1)), // 0–5
    }));

    res.status(200).json({
      message: 'Now playing movies fetched successfully',
      page: data.page,
      total_pages: data.total_pages,
      results: movies,
    });
  } catch (error) {
    res.status(500).json({
      message: 'Failed to fetch now playing movies',
      error: error.message,
    });
  }
};

const getTopRatedMovies = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;

    const data = await tmdbService.getTopRatedMovies(page);

    const movies = data.results.map((movie) => ({
      id: movie.id,
      title: movie.title,
      poster_path: movie.poster_path
        ? `${TMDB_IMAGE_BASE_URL}${movie.poster_path}`
        : null,
      rating: Number((movie.vote_average / 2).toFixed(1)), // 0–5
    }));

    res.status(200).json({
      message: 'Top rated movies fetched successfully',
      page: data.page,
      total_pages: data.total_pages,
      results: movies,
    });
  } catch (error) {
    res.status(500).json({
      message: 'Failed to fetch top rated movies',
      error: error.message,
    });
  }
};

const getMovieDetail = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    // 🔥 Ambil detail dari TMDB
    const movie = await tmdbService.getMovieDetail(id);

    // 🔍 Cek apakah sudah ditonton
    const { data: watchedMovie } = await supabase
      .from('watched_movies')
      .select('user_rating, review, watched_at')
      .eq('user_id', userId)
      .eq('tmdb_id', id)
      .single();

    const result = {
      id: movie.id,
      title: movie.title,
      overview: movie.overview,
      poster_path: movie.poster_path
        ? `${TMDB_IMAGE_BASE_URL}${movie.poster_path}`
        : null,
      backdrop_path: movie.backdrop_path
        ? `${TMDB_IMAGE_BASE_URL}${movie.backdrop_path}`
        : null,
      rating: Number((movie.vote_average / 2).toFixed(1)), // TMDB rating (0–5)
      runtime: movie.runtime,
      release_date: movie.release_date,
      genres: movie.genres.map((g) => g.name),
      production: movie.production_companies.map((p) => p.name),

      // ⭐ STATUS WATCHED
      is_watched: !!watchedMovie,
      watched_data: watchedMovie || null,
    };

    res.status(200).json({
      message: 'Movie detail fetched successfully',
      result,
    });
  } catch (error) {
    res.status(500).json({
      message: 'Failed to fetch movie detail',
      error: error.message,
    });
  }
};

const searchMovies = async (req, res) => {
  try {
    const {
      page = 1,
      genre,
      min_rating,
      max_rating,
      sort_by,
      query,
    } = req.query;

    let data;
    let movies = [];

    // 🔥 SEARCH BY TITLE
    if (query) {
      data = await tmdbService.searchMoviesByTitle(query, page);
      movies = data.results;

      // ✅ OPTIONAL rating filter (AMAN)
      if (min_rating) {
        movies = movies.filter(
          (m) => m.vote_average > 0 && m.vote_average / 2 >= Number(min_rating)
        );
      }
    } else {
      // 🔥 DISCOVER (FILTER MODE)
      data = await tmdbService.searchMovies({
        page,
        genre,
        minRating: min_rating,
        maxRating: max_rating,
        sortBy: sort_by,
      });

      movies = data.results;
    }

    const results = movies.map((movie) => ({
      id: movie.id,
      title: movie.title,
      poster_path: movie.poster_path
        ? `${TMDB_IMAGE_BASE_URL}${movie.poster_path}`
        : null,
      rating: Number((movie.vote_average / 2).toFixed(1)),
    }));

    res.status(200).json({
      message: 'Movies fetched successfully',
      page: data.page,
      total_pages: data.total_pages,
      results,
    });
  } catch (error) {
    res.status(500).json({
      message: 'Failed to search movies',
      error: error.message,
    });
  }
};

module.exports = {
  getNowPlayingMovies,
  getTopRatedMovies,
  getMovieDetail,
  searchMovies,
};
