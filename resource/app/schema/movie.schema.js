const MovieSchema = {
  BodyMovieSchema: {
    title: "Jurassic World Dominion",
    synopsis:
      "Empat tahun setelah kehancuran Pulau Nublar, dinosaurus sekarang hidup dan berburu bersama manusia di seluruh dunia. Keseimbangan yang rapuh ini akan menentukan apakah manusia tetap menjadi predator puncak.",
    type: "Movie",
    is_adult: false,
    continent: "North America",
    country: "United States",
    code: "JWD-2022",
    release_date: "2022-06-10",
    thumbnail_id: "66310f8e9a2b4c5d6e7f8g01",
    cover_id: "66310f8e9a2b4c5d6e7f8g02",

    // Field helper untuk pencarian teks cepat
    genres_name: "Action, Adventure, Dinosaur Era",
    authors_name: "Michael Crichton, Emily Carmichael",
    actors_name: "Chris Pratt, Bryce Dallas Howard, DeWanda Wise",
    studio_name: "Universal Pictures, Amblin Entertainment",

    // Array of Objects dengan logika is_new
    genres: [
      { _id: "66310f8e9a2b4c5d6e7f8g03", name: "Action", is_new: false },
      { _id: "66310f8e9a2b4c5d6e7f8g04", name: "Adventure", is_new: false },
      { _id: "", name: "Dinosaur Era", is_new: true }, // Genre baru
    ],

    authors: [
      {
        _id: "66310f8e9a2b4c5d6e7f8g05",
        name: "Michael Crichton",
        is_new: false,
      },
      { _id: "", name: "Emily Carmichael", is_new: true },
    ],

    actors: [
      { _id: "66310f8e9a2b4c5d6e7f8g06", name: "Chris Pratt", is_new: false },
      {
        _id: "66310f8e9a2b4c5d6e7f8g07",
        name: "Bryce Dallas Howard",
        is_new: false,
      },
      { _id: "", name: "Chris Pratt", is_new: true },
    ],

    studios: [
      {
        _id: "66310f8e9a2b4c5d6e7f8g08",
        name: "Universal Pictures",
        is_new: false,
      },
      { _id: "", name: "Amblin Entertainment", is_new: true },
    ],
  },
};

module.exports = MovieSchema;
