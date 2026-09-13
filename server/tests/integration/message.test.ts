import request from "supertest";
import app from "../../src/app";
import Conversation from "../../src/models/conversation.model";
import Message from "../../src/models/message.model";

describe("Message Edit & Delete Integration Tests", () => {
  let counter = 0;

  const createTestUser = async () => {
    counter++;
    const username = `msguser_${counter}_${Date.now()}`;
    const email = `msg_${counter}_${Date.now()}@test.com`;
    const userData = {
      username,
      email,
      password: "password123",
    };

    await request(app).post("/api/auth/signup").send(userData);

    const loginResponse = await request(app).post("/api/auth/login").send({
      identifier: email,
      password: "password123",
    });

    return {
      token: loginResponse.body.token,
      user: loginResponse.body.user,
    };
  };

  const setupConversationAndMessage = async () => {
    const userA = await createTestUser();
    const userB = await createTestUser();
    const userAId = userA.user.id || userA.user._id;
    const userBId = userB.user.id || userB.user._id;

    // Create conversation directly between userA and userB
    const participantKey = [userAId.toString(), userBId.toString()].sort().join("_");
    const conversation = await Conversation.create({
      participants: [userAId, userBId],
      participantKey,
    });

    // Create a message in the conversation from userA
    const message = await Message.create({
      conversation: conversation._id,
      sender: userAId,
      content: "Initial message from user A",
    });

    // Update conversation lastMessage
    await Conversation.findByIdAndUpdate(conversation._id, {
      lastMessage: {
        content: message.content,
        sender: message.sender,
        createdAt: message.createdAt,
      },
    });

    return { userA, userB, conversation, message };
  };

  describe("PATCH /api/conversations/:conversationId/messages/:messageId", () => {
    it("should allow the message author to edit their message", async () => {
      const { userA, conversation, message } = await setupConversationAndMessage();

      const response = await request(app)
        .patch(`/api/conversations/${conversation._id}/messages/${message._id}`)
        .set("Authorization", `Bearer ${userA.token}`)
        .send({ content: "Edited message content!" });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.content).toBe("Edited message content!");
      expect(response.body.data.isEdited).toBe(true);
      expect(response.body.data).toHaveProperty("editedAt");

      // Verify DB update
      const dbMsg = await Message.findById(message._id);
      expect(dbMsg?.content).toBe("Edited message content!");
      expect(dbMsg?.isEdited).toBe(true);

      // Verify conversation lastMessage updated
      const updatedConv = await Conversation.findById(conversation._id);
      expect(updatedConv?.lastMessage?.content).toBe("Edited message content!");
    });

    it("should reject edit if content is empty", async () => {
      const { userA, conversation, message } = await setupConversationAndMessage();

      const response = await request(app)
        .patch(`/api/conversations/${conversation._id}/messages/${message._id}`)
        .set("Authorization", `Bearer ${userA.token}`)
        .send({ content: "   " });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });

    it("should prevent a non-author from editing someone else's message", async () => {
      const { userB, conversation, message } = await setupConversationAndMessage();

      const response = await request(app)
        .patch(`/api/conversations/${conversation._id}/messages/${message._id}`)
        .set("Authorization", `Bearer ${userB.token}`)
        .send({ content: "Hacked content!" });

      expect(response.status).toBe(403);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain("not authorized");
    });
  });

  describe("DELETE /api/conversations/:conversationId/messages/:messageId", () => {
    it("should allow the message author to delete their message and roll back conversation lastMessage", async () => {
      const { userA, conversation, message } = await setupConversationAndMessage();

      // Create a second message
      const msg2 = await Message.create({
        conversation: conversation._id,
        sender: userA.user.id || userA.user._id,
        content: "Second message to delete",
      });
      await Conversation.findByIdAndUpdate(conversation._id, {
        lastMessage: {
          content: msg2.content,
          sender: msg2.sender,
          createdAt: msg2.createdAt,
        },
      });

      // Delete the second message
      const response = await request(app)
        .delete(`/api/conversations/${conversation._id}/messages/${msg2._id}`)
        .set("Authorization", `Bearer ${userA.token}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.messageId).toBe(msg2._id.toString());

      // Verify msg2 is deleted from DB
      const dbMsg = await Message.findById(msg2._id);
      expect(dbMsg).toBeNull();

      // Verify conversation lastMessage rolled back to the first message
      const updatedConv = await Conversation.findById(conversation._id);
      expect(updatedConv?.lastMessage?.content).toBe(message.content);
    });

    it("should prevent a non-author from deleting someone else's message", async () => {
      const { userB, conversation, message } = await setupConversationAndMessage();

      const response = await request(app)
        .delete(`/api/conversations/${conversation._id}/messages/${message._id}`)
        .set("Authorization", `Bearer ${userB.token}`);

      expect(response.status).toBe(403);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain("not authorized");

      // Verify message is NOT deleted
      const dbMsg = await Message.findById(message._id);
      expect(dbMsg).not.toBeNull();
    });

    it("should allow a recipient to delete someone else's message 'for_me'", async () => {
      const { userA, userB, conversation, message } = await setupConversationAndMessage();
      const userBId = userB.user.id || userB.user._id;

      const response = await request(app)
        .delete(`/api/conversations/${conversation._id}/messages/${message._id}?mode=for_me`)
        .set("Authorization", `Bearer ${userB.token}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.mode).toBe("for_me");

      // Verify message is still in DB, but has userB in deletedFor
      const dbMsg = await Message.findById(message._id);
      expect(dbMsg).not.toBeNull();
      expect(dbMsg?.deletedFor.map((id) => id.toString())).toContain(userBId.toString());

      // Verify userB cannot see it in getMessages
      const userBMsgs = await request(app)
        .get(`/api/conversations/${conversation._id}/messages`)
        .set("Authorization", `Bearer ${userB.token}`);
      expect(userBMsgs.body.data.some((m: any) => m._id === message._id.toString())).toBe(false);

      // Verify userA STILL sees it in getMessages
      const userAMsgs = await request(app)
        .get(`/api/conversations/${conversation._id}/messages`)
        .set("Authorization", `Bearer ${userA.token}`);
      expect(userAMsgs.body.data.some((m: any) => m._id === message._id.toString())).toBe(true);
    });
  });

  describe("POST /api/conversations/:conversationId/messages/batch-delete", () => {
    it("should allow batch deletion 'for_everyone' for sender's own messages", async () => {
      const { userA, conversation } = await setupConversationAndMessage();
      const userAId = userA.user.id || userA.user._id;

      const msg1 = await Message.create({
        conversation: conversation._id,
        sender: userAId,
        content: "Batch msg 1",
      });
      const msg2 = await Message.create({
        conversation: conversation._id,
        sender: userAId,
        content: "Batch msg 2",
      });

      const response = await request(app)
        .post(`/api/conversations/${conversation._id}/messages/batch-delete`)
        .set("Authorization", `Bearer ${userA.token}`)
        .send({
          messageIds: [msg1._id.toString(), msg2._id.toString()],
          mode: "for_everyone",
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.messageIds).toHaveLength(2);

      const dbMsg1 = await Message.findById(msg1._id);
      const dbMsg2 = await Message.findById(msg2._id);
      expect(dbMsg1).toBeNull();
      expect(dbMsg2).toBeNull();
    });

    it("should allow batch deletion 'for_me' for any messages in the conversation", async () => {
      const { userA, userB, conversation, message } = await setupConversationAndMessage();
      const userBId = userB.user.id || userB.user._id;

      const msgFromB = await Message.create({
        conversation: conversation._id,
        sender: userBId,
        content: "From B",
      });

      const response = await request(app)
        .post(`/api/conversations/${conversation._id}/messages/batch-delete`)
        .set("Authorization", `Bearer ${userB.token}`)
        .send({
          messageIds: [message._id.toString(), msgFromB._id.toString()],
          mode: "for_me",
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.mode).toBe("for_me");

      const dbMsgA = await Message.findById(message._id);
      const dbMsgB = await Message.findById(msgFromB._id);
      expect(dbMsgA?.deletedFor.map((id) => id.toString())).toContain(userBId.toString());
      expect(dbMsgB?.deletedFor.map((id) => id.toString())).toContain(userBId.toString());
    });
  });
});
