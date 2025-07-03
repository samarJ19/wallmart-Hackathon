const clerkId = "user_2zBPXqMvvYE3Bl0mT7yPz0Nu7oB"
const userId = "cmcchvzg60000uktg3g16d3rg"

const product = await prisma.product.findUnique({
    where:{
        id
    },
    include:{
        _count:{
            interaction:true,
            cartItems:true,
            orderItems:true
        },
        interaction:{
            select:{
                action:true,
                user:{
                    include:{
                        name:true,
                        avatar:true,
                    }
                }
            }
        }
    }
});
const count = await prisma.product._count
if(!product){
    console.log("No product found");
}
if(userId){
    //find user
}
    userInteraction = await prisma.userInteraction.findMany({
        where:{
            userId:user.id,
            productId:id
        }
    });
