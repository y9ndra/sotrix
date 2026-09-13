import mongoose, { ClientSession } from "mongoose";
import Message, { IMessage } from "../models/message.model";

export interface IMessageRepository {
  create(
    data: {
      conversation: string | mongoose.Types.ObjectId;
      sender: string | mongoose.Types.ObjectId;
      content: string;
      replyTo?: string | mongoose.Types.ObjectId | null;
    },
    session?: ClientSession
  ): Promise<IMessage>;
  findById(
    id: string | mongoose.Types.ObjectId,
    session?: ClientSession
  ): Promise<IMessage | null>;
  updateContent(
    id: string | mongoose.Types.ObjectId,
    content: string,
    session?: ClientSession
  ): Promise<IMessage | null>;
  deleteById(
    id: string | mongoose.Types.ObjectId,
    session?: ClientSession
  ): Promise<IMessage | null>;
  deleteForUser(
    id: string | mongoose.Types.ObjectId,
    userId: string | mongoose.Types.ObjectId,
    session?: ClientSession
  ): Promise<IMessage | null>;
  deleteManyByIds(
    ids: (string | mongoose.Types.ObjectId)[],
    session?: ClientSession
  ): Promise<any>;
  deleteManyForUser(
    ids: (string | mongoose.Types.ObjectId)[],
    userId: string | mongoose.Types.ObjectId,
    session?: ClientSession
  ): Promise<any>;
  findLatestInConversation(
    conversationId: string | mongoose.Types.ObjectId,
    session?: ClientSession
  ): Promise<IMessage | null>;
  findMessages(
    query: Record<string, any>,
    limit: number,
    session?: ClientSession
  ): Promise<IMessage[]>;
}

export class MongoMessageRepository implements IMessageRepository {
  async create(
    data: {
      conversation: string | mongoose.Types.ObjectId;
      sender: string | mongoose.Types.ObjectId;
      content: string;
      replyTo?: string | mongoose.Types.ObjectId | null;
    },
    session?: ClientSession
  ): Promise<IMessage> {
    if (session) {
      const docs = await Message.create([data], { session });
      return docs[0];
    }
    return Message.create(data);
  }

  async findById(
    id: string | mongoose.Types.ObjectId,
    session?: ClientSession
  ): Promise<IMessage | null> {
    const query = Message.findById(id);
    if (session) query.session(session);
    return query.exec();
  }

  async updateContent(
    id: string | mongoose.Types.ObjectId,
    content: string,
    session?: ClientSession
  ): Promise<IMessage | null> {
    const query = Message.findByIdAndUpdate(
      id,
      {
        $set: {
          content,
          isEdited: true,
          editedAt: new Date(),
        },
      },
      { returnDocument: "after" }
    );
    if (session) query.session(session);
    return query.exec();
  }

  async deleteById(
    id: string | mongoose.Types.ObjectId,
    session?: ClientSession
  ): Promise<IMessage | null> {
    const query = Message.findByIdAndDelete(id);
    if (session) query.session(session);
    return query.exec();
  }

  async deleteForUser(
    id: string | mongoose.Types.ObjectId,
    userId: string | mongoose.Types.ObjectId,
    session?: ClientSession
  ): Promise<IMessage | null> {
    const query = Message.findByIdAndUpdate(
      id,
      { $addToSet: { deletedFor: userId } },
      { returnDocument: "after" }
    );
    if (session) query.session(session);
    return query.exec();
  }

  async deleteManyByIds(
    ids: (string | mongoose.Types.ObjectId)[],
    session?: ClientSession
  ): Promise<any> {
    const query = Message.deleteMany({ _id: { $in: ids } });
    if (session) query.session(session);
    return query.exec();
  }

  async deleteManyForUser(
    ids: (string | mongoose.Types.ObjectId)[],
    userId: string | mongoose.Types.ObjectId,
    session?: ClientSession
  ): Promise<any> {
    const query = Message.updateMany(
      { _id: { $in: ids } },
      { $addToSet: { deletedFor: userId } }
    );
    if (session) query.session(session);
    return query.exec();
  }

  async findLatestInConversation(
    conversationId: string | mongoose.Types.ObjectId,
    session?: ClientSession
  ): Promise<IMessage | null> {
    const query = Message.findOne({ conversation: conversationId }).sort({
      createdAt: -1,
      _id: -1,
    });
    if (session) query.session(session);
    return query.exec();
  }

  async findMessages(
    query: Record<string, any>,
    limit: number,
    session?: ClientSession
  ): Promise<IMessage[]> {
    const dbQuery = Message.find(query)
      .populate("sender", "name username profilePicUrl")
      .populate({
        path: "replyTo",
        select: "content sender createdAt isEdited deletedFor",
        populate: {
          path: "sender",
          select: "name username profilePicUrl",
        },
      })
      .sort({
        createdAt: -1,
        _id: -1,
      })
      .limit(limit);
    if (session) dbQuery.session(session);
    return dbQuery.exec();
  }
}

export const messageRepository = new MongoMessageRepository();
