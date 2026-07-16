const express = require("express");
const { requireAuth, getAuth } = require("@clerk/express");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const { v4: uuidv4 } = require("uuid");

const { asyncHandler } = require("../utils/helpers");

const router = express.Router();

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = "uploads/chat-images";
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    cb(null, `${uuidv4()}${path.extname(file.originalname)}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith("image/")) {
      cb(null, true);
      return;
    }

    cb(new Error("Only image files are allowed"), false);
  },
});

const currentUser = async (req) => {
  const { userId } = getAuth(req);
  return req.services.user.getUser(userId);
};

router.post(
  "/create",
  requireAuth(),
  asyncHandler(async (req, res) => {
    const user = await currentUser(req);
    const groupChat = await req.services.groupChat.createGroup(user.id, req.body);

    res.status(201).json({
      message: "Group chat created successfully",
      groupChat,
    });
  })
);

router.post(
  "/invite",
  requireAuth(),
  asyncHandler(async (req, res) => {
    const user = await currentUser(req);
    const invitedUser = await req.services.groupChat.inviteUser(
      req.body.groupChatId,
      req.body.userEmail,
      user.id
    );

    res.json({
      message: "User added to group successfully",
      user: invitedUser,
    });
  })
);

router.post(
  "/upload-image",
  requireAuth(),
  upload.single("image"),
  asyncHandler(async (req, res) => {
    try {
      const user = await currentUser(req);
      const chatMessage = await req.services.groupChat.createImageMessage(
        req.body.groupChatId,
        user.id,
        req.file
      );

      res.status(201).json({
        message: "Image uploaded successfully",
        chatMessage,
        imageUrl: chatMessage.metadata.imageUrl,
      });
    } catch (error) {
      if (req.file) {
        fs.unlink(req.file.path, () => {});
      }
      throw error;
    }
  })
);

router.get(
  "/my-groups",
  requireAuth(),
  asyncHandler(async (req, res) => {
    const user = await currentUser(req);
    const groups = await req.services.groupChat.getUserGroups(user.id);

    res.json({
      message: "Groups retrieved successfully",
      groups,
      userId: user.id,
    });
  })
);

router.get(
  "/admin/my-groups",
  requireAuth(),
  asyncHandler(async (req, res) => {
    const user = await currentUser(req);
    const groups = await req.services.groupChat.getAdminGroups(user.id);

    res.json({
      message: "Groups retrieved successfully",
      groups,
    });
  })
);

router.get(
  "/:id",
  requireAuth(),
  asyncHandler(async (req, res) => {
    const user = await currentUser(req);
    const groupChat = await req.services.groupChat.getGroup(user.id, req.params.id);

    res.json({
      message: "Group chat retrieved successfully",
      groupChat,
    });
  })
);

router.get(
  "/:id/messages",
  requireAuth(),
  asyncHandler(async (req, res) => {
    const user = await currentUser(req);
    const { messages, pagination } = await req.services.groupChat.getMessages(
      user.id,
      req.params.id,
      req.query.page,
      req.query.limit
    );

    res.json({
      message: "Messages retrieved successfully",
      messages,
      pagination,
    });
  })
);

router.put(
  "/:id/update",
  requireAuth(),
  asyncHandler(async (req, res) => {
    const user = await currentUser(req);
    const groupChat = await req.services.groupChat.updateGroup(user.id, req.params.id, req.body);

    res.json({
      message: "Group chat updated successfully",
      groupChat,
    });
  })
);

router.delete(
  "/:id/leave",
  requireAuth(),
  asyncHandler(async (req, res) => {
    const user = await currentUser(req);
    await req.services.groupChat.leaveGroup(req.params.id, user);

    res.json({ message: "Successfully left the group" });
  })
);

router.delete(
  "/:groupId/remove/:userId",
  requireAuth(),
  asyncHandler(async (req, res) => {
    const user = await currentUser(req);
    await req.services.groupChat.removeUser(req.params.groupId, req.params.userId, user.id);

    res.json({ message: "User removed from group successfully" });
  })
);

module.exports = router;
