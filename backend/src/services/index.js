const UserService = require("./UserService");
const ProductService = require("./ProductService");
const CartService = require("./CartService");
const RecommendationService = require("./RecommendationService");
const GroupChatService = require("./GroupChatService");
const SocketService = require("./socketService");

const createServices = ({ prisma, io }) => {
  const services = {
    user: new UserService(prisma),
    product: new ProductService(prisma),
    cart: new CartService(prisma),
    recommendation: new RecommendationService(prisma),
    groupChat: new GroupChatService(prisma),
  };

  if (io) {
    services.socket = new SocketService(io, prisma);
  }

  return services;
};

module.exports = {
  createServices,
};
