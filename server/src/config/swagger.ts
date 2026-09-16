import { OpenAPIV3 } from "openapi-types";

export const swaggerSpec: OpenAPIV3.Document = {
    openapi: "3.0.0",

    info: {
        title: "Sotrix API",
        version: "1.0.0",
        description: "Backend REST API specification for Sotrix Social Engine",
    },

    servers: [
        {
            url: "/",
            description: "Current environment (relative / deployed)",
        },
        {
            url: "http://localhost:5000",
            description: "Local development server",
        },
    ],

    paths: {
        // ==========================================
        // 🔐 AUTHENTICATION
        // ==========================================
        "/api/auth/signup": {
            post: {
                tags: ["Authentication"],
                summary: "Create a new user",
                requestBody: {
                    required: true,
                    content: {
                        "application/json": {
                            schema: {
                                type: "object",
                                required: ["username", "email", "password"],
                                properties: {
                                    name: { type: "string", example: "Yugendhra" },
                                    username: { type: "string", example: "yugendhra" },
                                    email: { type: "string", format: "email", example: "user@example.com" },
                                    password: { type: "string", format: "password", example: "password123" },
                                },
                            },
                        },
                    },
                },
                responses: {
                    "201": { description: "User created successfully" },
                    "400": { description: "Invalid request (missing fields or validation error)" },
                    "409": { description: "Username or email already exists" },
                    "429": { description: "Too many signup attempts" },
                },
            },
        },
        "/api/auth/login": {
            post: {
                tags: ["Authentication"],
                summary: "User login",
                requestBody: {
                    required: true,
                    content: {
                        "application/json": {
                            schema: {
                                type: "object",
                                required: ["identifier", "password"],
                                properties: {
                                    identifier: { type: "string", example: "user@example.com", description: "Username or Email address" },
                                    password: { type: "string", format: "password", example: "password123" },
                                },
                            },
                        },
                    },
                },
                responses: {
                    "200": { description: "Logged in successfully, sets refreshToken cookie and returns JWT access token" },
                    "400": { description: "Missing login parameters" },
                    "401": { description: "Invalid password or user does not exist" },
                    "429": { description: "Too many login attempts" },
                },
            },
        },
        "/api/auth/me": {
            get: {
                tags: ["Authentication"],
                summary: "Get logged-in user",
                security: [{ bearerAuth: [] }],
                responses: {
                    "200": { description: "Current user returned successfully" },
                    "401": { description: "Unauthorized (invalid or missing JWT)" },
                    "404": { description: "User not found" },
                },
            },
        },
        "/api/auth/refresh": {
            post: {
                tags: ["Authentication"],
                summary: "Refresh access token",
                description: "Uses the HTTP-only refreshToken cookie to issue a new JWT access token and rotate the refresh token session",
                responses: {
                    "200": {
                        description: "Access token refreshed successfully",
                        content: {
                            "application/json": {
                                schema: {
                                    type: "object",
                                    properties: {
                                        success: { type: "boolean", example: true },
                                        token: { type: "string", example: "eyJhbGciOi..." },
                                    },
                                },
                            },
                        },
                    },
                    "401": { description: "Refresh token missing, invalid, or expired session" },
                    "429": { description: "Too many refresh attempts" },
                },
            },
        },
        "/api/auth/logout": {
            post: {
                tags: ["Authentication"],
                summary: "User logout",
                description: "Revokes refresh token in database and clears the HTTP-only refreshToken cookie",
                responses: {
                    "200": { description: "Logged out successfully" },
                },
            },
        },

        // ==========================================
        // 👤 USERS
        // ==========================================
        "/api/users/me": {
            patch: {
                tags: ["Users"],
                summary: "Update logged-in user's profile details",
                security: [{ bearerAuth: [] }],
                requestBody: {
                    required: true,
                    content: {
                        "multipart/form-data": {
                            schema: {
                                type: "object",
                                properties: {
                                    name: { type: "string", example: "Yugendhra" },
                                    username: { type: "string", example: "yugendhra" },
                                    bio: { type: "string", example: "Full stack developer" },
                                    profilePic: { type: "string", format: "binary", description: "Optional profile picture image file" },
                                },
                            },
                        },
                        "application/json": {
                            schema: {
                                type: "object",
                                properties: {
                                    name: { type: "string", example: "Yugendhra" },
                                    username: { type: "string", example: "yugendhra" },
                                    bio: { type: "string", example: "Full stack developer" },
                                    profilePicUrl: { type: "string", example: "https://res.cloudinary.com/..." },
                                },
                            },
                        },
                    },
                },
                responses: {
                    "200": { description: "Profile updated successfully" },
                    "400": { description: "Validation error" },
                    "401": { description: "Unauthorized" },
                    "404": { description: "User not found" },
                },
            },
        },
        "/api/users/search": {
            get: {
                tags: ["Users"],
                summary: "Search users by name/username",
                security: [{ bearerAuth: [] }],
                parameters: [
                    {
                        name: "q",
                        in: "query",
                        required: true,
                        schema: { type: "string" },
                        description: "Search query keyword",
                    },
                ],
                responses: {
                    "200": { description: "Users query matches returned successfully" },
                    "400": { description: "Search query is required" },
                    "401": { description: "Unauthorized" },
                },
            },
        },
        "/api/users/{id}": {
            get: {
                tags: ["Users"],
                summary: "Get specific user profile",
                security: [{ bearerAuth: [] }],
                parameters: [
                    {
                        name: "id",
                        in: "path",
                        required: true,
                        schema: { type: "string" },
                        description: "Target User ID",
                    },
                ],
                responses: {
                    "200": { description: "User details and follow statistics returned successfully" },
                    "400": { description: "Invalid User ID format" },
                    "401": { description: "Unauthorized" },
                    "404": { description: "User not found" },
                },
            },
        },
        "/api/users/{id}/follow": {
            post: {
                tags: ["Users"],
                summary: "Toggle follow/unfollow on target user",
                security: [{ bearerAuth: [] }],
                parameters: [
                    {
                        name: "id",
                        in: "path",
                        required: true,
                        schema: { type: "string" },
                        description: "User ID to follow/unfollow",
                    },
                ],
                responses: {
                    "200": { description: "Follow state toggled successfully" },
                    "400": { description: "Cannot follow yourself or invalid ID format" },
                    "401": { description: "Unauthorized" },
                    "404": { description: "User not found" },
                },
            },
        },
        "/api/users/{id}/followers": {
            get: {
                tags: ["Users"],
                summary: "Get list of followers for a user",
                security: [{ bearerAuth: [] }],
                parameters: [
                    {
                        name: "id",
                        in: "path",
                        required: true,
                        schema: { type: "string" },
                        description: "Target User ID",
                    },
                    {
                        name: "limit",
                        in: "query",
                        schema: { type: "integer", default: 10 },
                        description: "Number of users per page",
                    },
                    {
                        name: "cursor",
                        in: "query",
                        schema: { type: "string" },
                        description: "Pagination cursor",
                    },
                ],
                responses: {
                    "200": { description: "Followers list returned successfully with isFollowing status" },
                    "400": { description: "Invalid User ID format" },
                    "401": { description: "Unauthorized" },
                    "404": { description: "User not found" },
                },
            },
        },
        "/api/users/{id}/following": {
            get: {
                tags: ["Users"],
                summary: "Get list of users followed by target user",
                security: [{ bearerAuth: [] }],
                parameters: [
                    {
                        name: "id",
                        in: "path",
                        required: true,
                        schema: { type: "string" },
                        description: "Target User ID",
                    },
                    {
                        name: "limit",
                        in: "query",
                        schema: { type: "integer", default: 10 },
                        description: "Number of users per page",
                    },
                    {
                        name: "cursor",
                        in: "query",
                        schema: { type: "string" },
                        description: "Pagination cursor",
                    },
                ],
                responses: {
                    "200": { description: "Following list returned successfully with isFollowing status" },
                    "400": { description: "Invalid User ID format" },
                    "401": { description: "Unauthorized" },
                    "404": { description: "User not found" },
                },
            },
        },

        // ==========================================
        // 📝 POSTS
        // ==========================================
        "/api/posts": {
            post: {
                tags: ["Posts"],
                summary: "Create a new post with optional image upload",
                security: [{ bearerAuth: [] }],
                requestBody: {
                    required: true,
                    content: {
                        "multipart/form-data": {
                            schema: {
                                type: "object",
                                required: ["content"],
                                properties: {
                                    content: { type: "string", example: "Check out this image!" },
                                    image: { type: "string", format: "binary", description: "Image file to upload to Cloudinary" },
                                },
                            },
                        },
                    },
                },
                responses: {
                    "201": { description: "Post created successfully" },
                    "400": { description: "Missing post content body parameter" },
                    "401": { description: "Unauthorized" },
                    "429": { description: "Rate limit reached" },
                },
            },
            get: {
                tags: ["Posts"],
                summary: "Get feed posts (self and followings)",
                security: [{ bearerAuth: [] }],
                parameters: [
                    { name: "limit", in: "query", schema: { type: "integer", default: 10 } },
                    { name: "cursor", in: "query", schema: { type: "string" }, description: "Pagination cursor" },
                ],
                responses: {
                    "200": { description: "Posts returned successfully" },
                    "401": { description: "Unauthorized" },
                },
            },
        },
        "/api/posts/me": {
            get: {
                tags: ["Posts"],
                summary: "Get logged-in user's own posts list",
                security: [{ bearerAuth: [] }],
                parameters: [
                    { name: "limit", in: "query", schema: { type: "integer", default: 10 } },
                    { name: "cursor", in: "query", schema: { type: "string" } },
                ],
                responses: {
                    "200": { description: "Own posts returned successfully" },
                    "401": { description: "Unauthorized" },
                },
            },
        },
        "/api/posts/user/{userId}": {
            get: {
                tags: ["Posts"],
                summary: "Get posts created by a specific user",
                security: [{ bearerAuth: [] }],
                parameters: [
                    { name: "userId", in: "path", required: true, schema: { type: "string" }, description: "Target User ID" },
                    { name: "limit", in: "query", schema: { type: "integer", default: 10 } },
                    { name: "cursor", in: "query", schema: { type: "string" }, description: "Pagination cursor" },
                ],
                responses: {
                    "200": { description: "User's posts returned successfully" },
                    "400": { description: "Invalid User ID format" },
                    "401": { description: "Unauthorized" },
                },
            },
        },
        "/api/posts/search": {
            get: {
                tags: ["Posts"],
                summary: "Search posts using content text index",
                security: [{ bearerAuth: [] }],
                parameters: [
                    { name: "q", in: "query", required: true, schema: { type: "string" } },
                ],
                responses: {
                    "200": { description: "Matching posts returned successfully" },
                    "400": { description: "Query term is required" },
                    "401": { description: "Unauthorized" },
                },
            },
        },
        "/api/posts/{id}": {
            get: {
                tags: ["Posts"],
                summary: "Get single post by ID",
                security: [{ bearerAuth: [] }],
                parameters: [
                    { name: "id", in: "path", required: true, schema: { type: "string" } },
                ],
                responses: {
                    "200": { description: "Post data returned successfully" },
                    "401": { description: "Unauthorized" },
                    "404": { description: "Post not found" },
                },
            },
            patch: {
                tags: ["Posts"],
                summary: "Update own post content",
                security: [{ bearerAuth: [] }],
                parameters: [
                    { name: "id", in: "path", required: true, schema: { type: "string" } },
                ],
                requestBody: {
                    required: true,
                    content: {
                        "application/json": {
                            schema: {
                                type: "object",
                                required: ["content"],
                                properties: {
                                    content: { type: "string", example: "Updated content text details." },
                                },
                            },
                        },
                    },
                },
                responses: {
                    "200": { description: "Post updated successfully" },
                    "400": { description: "Validation error" },
                    "401": { description: "Unauthorized" },
                    "403": { description: "Forbidden (not post author)" },
                    "404": { description: "Post not found" },
                },
            },
            delete: {
                tags: ["Posts"],
                summary: "Delete own post and its cloud image",
                security: [{ bearerAuth: [] }],
                parameters: [
                    { name: "id", in: "path", required: true, schema: { type: "string" } },
                ],
                responses: {
                    "200": { description: "Post deleted successfully" },
                    "401": { description: "Unauthorized" },
                    "403": { description: "Forbidden (not post author)" },
                    "404": { description: "Post not found" },
                },
            },
        },

        // ==========================================
        // 📰 FEED & EXPLORE
        // ==========================================
        "/api/feed": {
            get: {
                tags: ["Feed & Explore"],
                summary: "Get home feed posts (followed users and self)",
                security: [{ bearerAuth: [] }],
                parameters: [
                    { name: "limit", in: "query", schema: { type: "integer", default: 10 } },
                    { name: "cursor", in: "query", schema: { type: "string" } },
                ],
                responses: {
                    "200": { description: "Feed posts list returned successfully" },
                    "401": { description: "Unauthorized" },
                },
            },
        },
        "/api/explore/posts": {
            get: {
                tags: ["Feed & Explore"],
                summary: "Get discovery posts (excluding followed and self)",
                security: [{ bearerAuth: [] }],
                parameters: [
                    { name: "limit", in: "query", schema: { type: "integer", default: 10 } },
                    { name: "cursor", in: "query", schema: { type: "string" } },
                ],
                responses: {
                    "200": { description: "Discovery feed posts list returned successfully" },
                    "401": { description: "Unauthorized" },
                },
            },
        },
        "/api/explore/users": {
            get: {
                tags: ["Feed & Explore"],
                summary: "Get follow recommendations (suggested users)",
                security: [{ bearerAuth: [] }],
                parameters: [
                    { name: "limit", in: "query", schema: { type: "integer", default: 10 } },
                    { name: "cursor", in: "query", schema: { type: "string" } },
                ],
                responses: {
                    "200": { description: "Suggested users recommendations list returned successfully" },
                    "401": { description: "Unauthorized" },
                },
            },
        },

        // ==========================================
        // 💬 COMMENTS
        // ==========================================
        "/api/posts/{postId}/comments": {
            post: {
                tags: ["Comments"],
                summary: "Create comment for a post",
                security: [{ bearerAuth: [] }],
                parameters: [
                    { name: "postId", in: "path", required: true, schema: { type: "string" } },
                ],
                requestBody: {
                    required: true,
                    content: {
                        "application/json": {
                            schema: {
                                type: "object",
                                required: ["content"],
                                properties: {
                                    content: { type: "string", example: "Great post!" },
                                },
                            },
                        },
                    },
                },
                responses: {
                    "201": { description: "Comment created successfully" },
                    "400": { description: "Invalid format parameters or empty comment content" },
                    "401": { description: "Unauthorized" },
                    "404": { description: "Post not found" },
                },
            },
            get: {
                tags: ["Comments"],
                summary: "Get comments of a post",
                parameters: [
                    { name: "postId", in: "path", required: true, schema: { type: "string" } },
                    { name: "limit", in: "query", schema: { type: "integer", default: 10 } },
                    { name: "cursor", in: "query", schema: { type: "string" } },
                ],
                responses: {
                    "200": { description: "Comments list returned successfully" },
                    "404": { description: "Post not found" },
                },
            },
        },
        "/api/comments/{id}": {
            patch: {
                tags: ["Comments"],
                summary: "Update own comment content",
                security: [{ bearerAuth: [] }],
                parameters: [
                    { name: "id", in: "path", required: true, schema: { type: "string" } },
                ],
                requestBody: {
                    required: true,
                    content: {
                        "application/json": {
                            schema: {
                                type: "object",
                                required: ["content"],
                                properties: {
                                    content: { type: "string", example: "Updated comment content." },
                                },
                            },
                        },
                    },
                },
                responses: {
                    "200": { description: "Comment updated successfully" },
                    "401": { description: "Unauthorized" },
                    "403": { description: "Forbidden (not comment author)" },
                    "404": { description: "Comment not found" },
                },
            },
            delete: {
                tags: ["Comments"],
                summary: "Delete own comment",
                security: [{ bearerAuth: [] }],
                parameters: [
                    { name: "id", in: "path", required: true, schema: { type: "string" } },
                ],
                responses: {
                    "200": { description: "Comment deleted successfully" },
                    "401": { description: "Unauthorized" },
                    "403": { description: "Forbidden (not comment author)" },
                    "404": { description: "Comment not found" },
                },
            },
        },

        // ==========================================
        // ❤️ LIKES
        // ==========================================
        "/api/posts/{postId}/like": {
            post: {
                tags: ["Likes"],
                summary: "Toggle post like status",
                security: [{ bearerAuth: [] }],
                parameters: [
                    { name: "postId", in: "path", required: true, schema: { type: "string" } },
                ],
                responses: {
                    "200": { description: "Like state toggled successfully" },
                    "400": { description: "Invalid post ID format" },
                    "401": { description: "Unauthorized" },
                    "404": { description: "Post not found" },
                },
            },
        },

        // ==========================================
        // 📤 UPLOAD & MEDIA
        // ==========================================
        "/api/upload": {
            post: {
                tags: ["Upload & Media"],
                summary: "Upload media file and queue for async processing",
                description: "Uploads an image file to local memory buffer and triggers BullMQ background job for optimization and Cloudinary upload. Also accessible via `/api/media`, `/api/media/upload`, and `/api/upload/media`.",
                security: [{ bearerAuth: [] }],
                requestBody: {
                    required: true,
                    content: {
                        "multipart/form-data": {
                            schema: {
                                type: "object",
                                required: ["image"],
                                properties: {
                                    image: {
                                        type: "string",
                                        format: "binary",
                                        description: "Image file to upload (JPEG, PNG, WebP, etc.)",
                                    },
                                },
                            },
                        },
                    },
                },
                responses: {
                    "201": {
                        description: "Media uploaded and queued for processing",
                        content: {
                            "application/json": {
                                schema: {
                                    type: "object",
                                    properties: {
                                        success: { type: "boolean", example: true },
                                        message: { type: "string", example: "Media uploaded and queued for processing" },
                                        data: {
                                            type: "object",
                                            properties: {
                                                id: { type: "string" },
                                                status: { type: "string", example: "pending" },
                                                type: { type: "string", example: "image" },
                                            },
                                        },
                                    },
                                },
                            },
                        },
                    },
                    "400": { description: "No file provided or unsupported format" },
                    "401": { description: "Unauthorized" },
                },
            },
        },
        "/api/media/{id}/status": {
            get: {
                tags: ["Upload & Media"],
                summary: "Get media processing status and uploaded URLs",
                description: "Check the status (pending, completed, failed) of an uploaded media asset. Also accessible via `/api/upload/media/{id}/status`.",
                security: [{ bearerAuth: [] }],
                parameters: [
                    {
                        name: "id",
                        in: "path",
                        required: true,
                        schema: { type: "string" },
                        description: "Media document ID",
                    },
                ],
                responses: {
                    "200": {
                        description: "Media status returned successfully",
                        content: {
                            "application/json": {
                                schema: {
                                    type: "object",
                                    properties: {
                                        success: { type: "boolean", example: true },
                                        data: {
                                            type: "object",
                                            properties: {
                                                id: { type: "string" },
                                                status: { type: "string", example: "completed" },
                                                url: { type: "string", example: "https://res.cloudinary.com/..." },
                                                optimizedUrl: { type: "string", example: "https://res.cloudinary.com/..." },
                                                type: { type: "string", example: "image" },
                                                createdAt: { type: "string", format: "date-time" },
                                                updatedAt: { type: "string", format: "date-time" },
                                            },
                                        },
                                    },
                                },
                            },
                        },
                    },
                    "401": { description: "Unauthorized" },
                    "404": { description: "Media not found" },
                },
            },
        },

        // ==========================================
        // 🔔 NOTIFICATIONS
        // ==========================================
        "/api/notifications": {
            get: {
                tags: ["Notifications"],
                summary: "Get notifications for logged-in user",
                security: [{ bearerAuth: [] }],
                parameters: [
                    { name: "limit", in: "query", schema: { type: "integer", default: 10 } },
                    { name: "cursor", in: "query", schema: { type: "string" }, description: "Pagination cursor" },
                ],
                responses: {
                    "200": { description: "Notifications list and unread count returned successfully" },
                    "401": { description: "Unauthorized" },
                },
            },
        },
        "/api/notifications/unread-count": {
            get: {
                tags: ["Notifications"],
                summary: "Get unread notification count",
                security: [{ bearerAuth: [] }],
                responses: {
                    "200": {
                        description: "Count returned successfully",
                        content: {
                            "application/json": {
                                schema: {
                                    type: "object",
                                    properties: {
                                        success: { type: "boolean", example: true },
                                        unreadCount: { type: "integer", example: 3 },
                                    },
                                },
                            },
                        },
                    },
                    "401": { description: "Unauthorized" },
                },
            },
        },
        "/api/notifications/read-all": {
            patch: {
                tags: ["Notifications"],
                summary: "Mark all notifications as read",
                security: [{ bearerAuth: [] }],
                responses: {
                    "200": { description: "All notifications marked as read successfully" },
                    "401": { description: "Unauthorized" },
                },
            },
        },
        "/api/notifications/{id}/read": {
            patch: {
                tags: ["Notifications"],
                summary: "Mark specific notification as read",
                security: [{ bearerAuth: [] }],
                parameters: [
                    {
                        name: "id",
                        in: "path",
                        required: true,
                        schema: { type: "string" },
                        description: "Notification ID",
                    },
                ],
                responses: {
                    "200": { description: "Notification marked as read successfully" },
                    "400": { description: "Invalid ID format" },
                    "401": { description: "Unauthorized" },
                    "404": { description: "Notification not found" },
                },
            },
        },

        // ==========================================
        // 💬 CONVERSATIONS & MESSAGING
        // ==========================================
        "/api/conversations": {
            post: {
                tags: ["Conversations"],
                summary: "Create or get 1-to-1 conversation",
                description: "Retrieves existing conversation with participant or creates a new one, broadcasting to active socket rooms",
                security: [{ bearerAuth: [] }],
                requestBody: {
                    required: true,
                    content: {
                        "application/json": {
                            schema: {
                                type: "object",
                                required: ["participantId"],
                                properties: {
                                    participantId: {
                                        type: "string",
                                        example: "60d0fe4f5311236168a109ca",
                                        description: "Target user ID (accepts participantId, userId, or recipientId)",
                                    },
                                },
                            },
                        },
                    },
                },
                responses: {
                    "200": { description: "Conversation retrieved or created successfully" },
                    "400": { description: "Participant user ID is required" },
                    "401": { description: "Unauthorized" },
                },
            },
            get: {
                tags: ["Conversations"],
                summary: "Get user's active conversations list (inbox)",
                security: [{ bearerAuth: [] }],
                responses: {
                    "200": { description: "Conversations list returned successfully" },
                    "401": { description: "Unauthorized" },
                },
            },
        },
        "/api/conversations/{id}": {
            get: {
                tags: ["Conversations"],
                summary: "Get a specific conversation by ID",
                security: [{ bearerAuth: [] }],
                parameters: [
                    {
                        name: "id",
                        in: "path",
                        required: true,
                        schema: { type: "string" },
                        description: "Conversation ID",
                    },
                ],
                responses: {
                    "200": { description: "Conversation details returned successfully" },
                    "401": { description: "Unauthorized" },
                    "404": { description: "Conversation not found" },
                },
            },
        },
        "/api/conversations/{id}/read": {
            patch: {
                tags: ["Conversations"],
                summary: "Mark all messages in conversation as read",
                security: [{ bearerAuth: [] }],
                parameters: [
                    {
                        name: "id",
                        in: "path",
                        required: true,
                        schema: { type: "string" },
                        description: "Conversation ID",
                    },
                ],
                responses: {
                    "200": { description: "Conversation messages marked as read successfully" },
                    "401": { description: "Unauthorized" },
                },
            },
        },
        "/api/conversations/{id}/messages": {
            get: {
                tags: ["Conversations"],
                summary: "Get cursor-paginated messages for a conversation",
                security: [{ bearerAuth: [] }],
                parameters: [
                    {
                        name: "id",
                        in: "path",
                        required: true,
                        schema: { type: "string" },
                        description: "Conversation ID",
                    },
                    {
                        name: "cursor",
                        in: "query",
                        schema: { type: "string" },
                        description: "Pagination cursor (message ID)",
                    },
                    {
                        name: "limit",
                        in: "query",
                        schema: { type: "integer", default: 20 },
                        description: "Number of messages to return",
                    },
                ],
                responses: {
                    "200": { description: "Messages list returned successfully" },
                    "401": { description: "Unauthorized" },
                },
            },
        },
        "/api/conversations/{conversationId}/messages/{messageId}": {
            patch: {
                tags: ["Conversations"],
                summary: "Edit a message",
                security: [{ bearerAuth: [] }],
                parameters: [
                    {
                        name: "conversationId",
                        in: "path",
                        required: true,
                        schema: { type: "string" },
                        description: "Conversation ID",
                    },
                    {
                        name: "messageId",
                        in: "path",
                        required: true,
                        schema: { type: "string" },
                        description: "Message ID",
                    },
                ],
                requestBody: {
                    required: true,
                    content: {
                        "application/json": {
                            schema: {
                                type: "object",
                                required: ["content"],
                                properties: {
                                    content: { type: "string", example: "Edited message text content" },
                                },
                            },
                        },
                    },
                },
                responses: {
                    "200": { description: "Message edited and broadcasted successfully" },
                    "400": { description: "Message content cannot be empty" },
                    "401": { description: "Unauthorized" },
                    "403": { description: "Not authorized to edit this message" },
                    "404": { description: "Message not found" },
                },
            },
            delete: {
                tags: ["Conversations"],
                summary: "Delete a message",
                security: [{ bearerAuth: [] }],
                parameters: [
                    {
                        name: "conversationId",
                        in: "path",
                        required: true,
                        schema: { type: "string" },
                        description: "Conversation ID",
                    },
                    {
                        name: "messageId",
                        in: "path",
                        required: true,
                        schema: { type: "string" },
                        description: "Message ID",
                    },
                    {
                        name: "mode",
                        in: "query",
                        schema: { type: "string", enum: ["for_me", "for_everyone"], default: "for_everyone" },
                        description: "Scope of message deletion",
                    },
                ],
                responses: {
                    "200": { description: "Message deleted successfully" },
                    "401": { description: "Unauthorized" },
                    "403": { description: "Not authorized to delete this message" },
                },
            },
        },
        "/api/conversations/{conversationId}/messages/batch-delete": {
            post: {
                tags: ["Conversations"],
                summary: "Batch delete messages in a conversation",
                security: [{ bearerAuth: [] }],
                parameters: [
                    {
                        name: "conversationId",
                        in: "path",
                        required: true,
                        schema: { type: "string" },
                        description: "Conversation ID",
                    },
                ],
                requestBody: {
                    required: true,
                    content: {
                        "application/json": {
                            schema: {
                                type: "object",
                                required: ["messageIds"],
                                properties: {
                                    messageIds: {
                                        type: "array",
                                        items: { type: "string" },
                                        example: ["60d0fe4f5311236168a109ca", "60d0fe4f5311236168a109cb"],
                                    },
                                    mode: {
                                        type: "string",
                                        enum: ["for_me", "for_everyone"],
                                        default: "for_everyone",
                                    },
                                },
                            },
                        },
                    },
                },
                responses: {
                    "200": { description: "Messages batch deleted successfully" },
                    "400": { description: "messageIds must be a non-empty array of IDs" },
                    "401": { description: "Unauthorized" },
                    "403": { description: "Not authorized to delete these messages" },
                },
            },
        },

        // ==========================================
        // ⚙️ SYSTEM & HEALTH
        // ==========================================
        "/health": {
            get: {
                tags: ["System"],
                summary: "Service health probe",
                description: "Returns service status and timestamp. Also accessible at `/api/health`.",
                responses: {
                    "200": {
                        description: "Service is running smoothly",
                        content: {
                            "application/json": {
                                schema: {
                                    type: "object",
                                    properties: {
                                        status: { type: "string", example: "success" },
                                        message: { type: "string", example: "Sotrix Backend is running smoothly" },
                                        timestamp: { type: "string", format: "date-time" },
                                    },
                                },
                            },
                        },
                    },
                },
            },
        },
        "/metrics": {
            get: {
                tags: ["System"],
                summary: "Prometheus metrics",
                description: "Exposes Prometheus metrics including HTTP request throughput, error rate, and response latencies",
                responses: {
                    "200": {
                        description: "Metrics exposition in Prometheus text format",
                    },
                },
            },
        },
    },

    components: {
        securitySchemes: {
            bearerAuth: {
                type: "http",
                scheme: "bearer",
                bearerFormat: "JWT",
            },
        },
    },
};
