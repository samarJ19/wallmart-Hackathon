const { getAuth, requireAuth } = require("@clerk/express");
const express = require("express");
const router = express.Router();
const axios = require("axios");
//GET /api/recommendations/getRec -Proxy requests to FastAPI service - Handle fallback if ML service is down
router.get("/getRec", requireAuth(), async (req, res) => {
  const { userId } = getAuth(req);
  try {
    //based on number of user interaction git recommend route or recommend cold start !
    const interactions = await axios.get(
      `http://localhost:3000/api/users/interactions/${userId}`
    );
    let response;
    if (interactions.length < 3) {
      response = await axios.get(
        `http://localhost:8000/recommend/${userId}/cold_start`
      );
    } else {
      response = await axios.get(`http://localhost:8000/recommend/${userId}`);
    }

    //check what kind of response object you get back from ML service
    console.log("recommendation from MAB: ", response.data);
    let recommendations = response.data.recommendations;
    res.json({ products: recommendations });
  } catch (err) {
    //ML service is down, return most popular products from database
    console.log("Got the error while hitting ML service: ", err);
    res.json({ error: "Error from ML service" });
  }
});

module.exports = router;
