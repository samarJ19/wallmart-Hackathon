
const { getAuth } = require('@clerk/express');
const express = require("express");
const router = express.Router();
const axios = require("axios");
//GET /api/recommendations/getRec -Proxy requests to FastAPI service - Handle fallback if ML service is down
router.get('/getRec', async (req,res)=>{
    const { userId } = getAuth();
    try{
        const response = await axios.get(
          `http://localhost:8000/recommend/${userId}`
        );
        //check what kind of response object you get back from ML service 
        res.json({products:response.data});
    }catch(err){
        //ML service is down, return most popular products from database
    }
})

module.exports = router;
