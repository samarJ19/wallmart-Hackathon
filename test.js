const express = require('express');
const { PrismaClient } = require("@prisma/client");
const { prisma } = require('./backend/src/server');

require('dotenv').config();

const app = express();

app.get("/health", async (req,res)=>{
  res.json({
    status:"OK",
    timestamp:new Date().toISOString(),
    uptime: process.uptime()
  })
})

const server = createServer(app);
const io = new Server(server, {
  cors: {
    origin: process.env.FRONTEND_URL || "http://localhost:5173",
    methods: ["GET", "POST"]
  }
});
function getRewardForAction(action) {
  const rewardMap = {
    'view': 0.1,
    'tick': 1,
    'cross': -1,
    'cart_add': 2,
    'purchase': 5,
    'ar_view': 1.5
  };
  return rewardMap[action] || 0;
}

io.on("connection",(socket)=>{
  
  socket.on("join-user-room",(userId)=>{
    socket.join(`user-${userId}`)
    console.log("Joined User: ")
  })
  socket.on("user-interaction", async (data)=>{
    try{
      const {userId, action, context} = data
      await prisma.userInteraction.create({
        reward:getRewardForAction(action)
      })
      socket.to('ml-services').emit('new interaction',{
        action
      })
    }catch(err){

    }
  })
})