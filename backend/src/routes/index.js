const productsRouter = require("./products");
const usersRouter = require("./users");
const recommendationsRouter = require("./recommendations");
const cartRouter = require("./cart");
const groupChatRouter = require("./groupChat");
const testRouter = require("./test");

const registerRoutes = (app) => {
  app.use("/api/products", productsRouter);
  app.use("/api/users", usersRouter);
  app.use("/api/recommendations", recommendationsRouter);
  app.use("/api/cart", cartRouter);
  app.use("/api/groups", groupChatRouter);
  app.use("/api/test", testRouter);
};

module.exports = registerRoutes;
