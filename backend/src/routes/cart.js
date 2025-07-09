const express = require("express");
const router = express.Router();
const { requireAuth, getAuth } = require("@clerk/express");

//Get route for fetching cart data /api/cart/cartproducts
router.get("/cartproducts", requireAuth(), async (req, res) => {
  try {
    const { userId } = getAuth(req);
    const { prisma } = req;
    const user = await prisma.user.findUnique({
      where: {
        clerkId: userId,
      },
    });
    if (!user) {
      res.status(403).json({
        message:
          "Backend: User not found, check if you are correctly signed in ",
      });
    }
    const cartData = await prisma.cartItem.findMany({
      where: {
        userId: user.id,
      },
      include: {
        product: {
          select: {
            id: true,
            name: true,
            imageUrl: true,
            price: true,
            category: true,
            description: true,
            brand: true,
          },
        },
      },
    });
    res.json({ cartData });
  } catch (err) {
    console.log("Backend:Got error while fetching data from DB");
    res.status(403).json({ message: err });
  }
});
//Post route for putting the product into the cart
router.post("/addproduct/:productId", requireAuth(), async (req, res) => {
  try {
    const { userId } = getAuth(req);
    const { prisma } = req;
    const { quantity } = req.body;
    const { productId } = req.params
    console.log("Prod. id: ",productId)
    const user = await prisma.user.findUnique({
      where: {
        clerkId: userId,
      },
    });
    if (!user) {
      res.status(403).json({
        message:
          "Backend: User not found, check if you are correctly signed in ",
      });
    }
    const cartItem = await prisma.cartItem.upsert({
      where: {
        userId_productId: {
          userId: user.id,
          productId,
        },
      },
      update: {
        quantity: {
          increment: quantity,
        },
      },
      create: {
        userId: user.id,
        productId,
        quantity,
      },
    });
    res.json({ message: "Added/updated cart Item", cartItem });
  } catch (err) {
    console.log("Got the following error: ",err)
    console.log("Backend:Got error while putting data into DB");
    res.status(403).json({ message: err });
  }
});

//put route for quantity of product
router.put("/updatequantity/:productId", requireAuth(), async (req, res) => {
  try {
    const { userId } = getAuth(req);
    const { productId } = req.params.productId;
    const { prisma } = req;
    const { quant } = req.body;
    const user = await prisma.user.findUnique({
      where: {
        clerkId: userId,
      },
    });
    if (!user) {
      res
        .status(403)
        .json({ error: "User not found, check if you are signed-in" });
    }
    const requiredCartItem = await prisma.cartItem.findUnique({
      where: {
        userId_productId: {
          userId: user.id,
          productId,
        },
      },
    });
    let updateItem;
    if (requiredCartItem.quantity - quant <= 0) {
      updateItem = await prisma.cartItem.delete({
        where: {
          userId_productId: {
            userId: user.id,
            productId,
          },
        },
      });
    } else {
      updateItem = await prisma.cartItem.update({
        where: {
          userId_productId: {
            userId: user.id,
            productId,
          },
        },
        update:{
            quantity:{
                decrement:quant
            }
        }
      });
    }
    res.json({
        message:"Update successful"
    });
  } catch (err) {}
});
//delete route for product deletion
router.delete("/deleteItem/:productId", requireAuth(), async (req, res) => {
  try {
    const { userId } = getAuth(req);
    const { productId } = req.params.productId;
    const { prisma } = req;
    const user = await prisma.user.findUnique({
      where: {
        clerkId: userId,
      },
    });
    if (!user) {
      res
        .status(403)
        .json({ error: "User not found, check if you are signed-in" });
    }
    const deleteItem = await prisma.cartItem.delete({
      where: {
        userId_productId: {
          userId: user.id,
          productId,
        },
      },
    });
    if (!deleteItem) {
      res.status(403).json({ err: "No item found for deletion" });
    }
    res.json({ message: "Product deleted successfully" });
  } catch (err) {
    console.log("Backend:Got error while deleting data from DB");
    res.status(403).json({ message: err });
  }
});

module.exports = router;
