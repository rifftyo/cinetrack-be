const axios = require('axios');

const tmdb = axios.create({
  baseURL: process.env.TMDB_BASE_URL,
  headers: {
    Authorization: `Bearer ${process.env.TMDB_BEARER_TOKEN}`,
    accept: 'application/json',
  },
  params: {
    language: 'en-US',
  },
});

const getNowPlayingMovies = async (page = 1) => {
  const response = await tmdb.get('/movie/now_playing', {
    params: { page },
  });

  return response.data;
};

const getTopRatedMovies = async (page = 1) => {
  const response = await tmdb.get('/movie/top_rated', {
    params: { page },
  });

  return response.data;
};

const getMovieDetail = async (movieId) => {
  const response = await tmdb.get(`/movie/${movieId}`);
  return response.data;
};

const searchMovies = async ({
  page = 1,
  genre,
  minRating,
  maxRating,
  sortBy = 'popularity.desc',
}) => {
  const response = await tmdb.get('/discover/movie', {
    params: {
      page,
      sort_by: sortBy,
      with_genres: genre,
      'vote_average.gte': minRating,
      'vote_average.lte': maxRating,
    },
  });

  return response.data;
};

const searchMoviesByTitle = async (query, page = 1) => {
  const response = await tmdb.get('/search/movie', {
    params: {
      query,
      page,
      include_adult: false,
    },
  });

  return response.data;
};

module.exports = {
  getNowPlayingMovies,
  getTopRatedMovies,
  getMovieDetail,
  searchMovies,
  searchMoviesByTitle,
};
