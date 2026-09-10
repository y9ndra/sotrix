import { OpenAPIV3 } from "openapi-types";

export const swaggerSpec: OpenAPIV3.Document = {
    openapi: "3.0.0",

    info: {
        title: "Sotrix API",
        version: "1.0.0",
        description: "Backend API for Sotrix Social Engine",
    },

    servers: [
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
                    "400": { description: "Invalid request (missing fields)" },
                    "409": { description: "Username or email already exists" },
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
                    "200": { description: "Logged in successfully, returns JWT access token" },
                    "400": { description: "Missing login parameters" },
                    "401": { description: "Invalid password or user does not exist" },
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
                        "application/json": {
                            schema: {
                                type: "object",
                                properties: {
                                    name: { type: "string", example: "Yugendhra" },
                                    bio: { type: "string", example: "Full stack developer" },
                                },
                            },
                        },
                    },
                },
                responses: {
                    "200": { description: "Profile updated successfully" },
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
                summary: "Get home feed posts (followed users only)",
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
