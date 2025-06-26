import { useAuth } from "@clerk/clerk-react";
import axios from "axios";
import { useEffect, useState } from "react";

export const useRecommendation = () => {
  const [productIds, setProductIds] = useState([]);
  const { userId } = useAuth();
  useEffect(() => {
    async function getRecommendation() {
      try {
        const response = await axios.get(
          `http://localhost:8000/recommend/${userId}`
        );
        setProductIds(response.data);
      } catch (err) {
        console.error(
          "Got error while getting recommendation from recommendation system: " +
            err
        );
      }
    }
    getRecommendation();
  }, []);
  return productIds;
};
