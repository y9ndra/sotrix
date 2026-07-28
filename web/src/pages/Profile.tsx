import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import api from "../services/api";
import Navbar from "../components/Navbar";

const Profile = () => {
  const { id } = useParams();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>("");

  // Edit Profile State
  const [isEditing, setIsEditing] = useState<boolean>(false);
  const [editForm, setEditForm] = useState({ name: "", username: "", bio: "" });
  const [saving, setSaving] = useState<boolean>(false);
  const [editError, setEditError] = useState<string>("");

  useEffect(() => {
    const fetchUser = async () => {
      if (!id) return;
      setLoading(true);
      setError("");
      try {
        const response = await api.get(`/users/${id}`);
        setUser(response.data.data);
      } catch (err: any) {
        console.error(err);
        setError(err.response?.data?.message || "Failed to load user profile");
      } finally {
        setLoading(false);
      }
    };

    fetchUser();
  }, [id]);

  const handleStartEdit = () => {
    setEditForm({
      name: user?.name || "",
      username: user?.username || "",
      bio: user?.bio || "",
    });
    setEditError("");
    setIsEditing(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setEditError("");
    try {
      const response = await api.patch("/users/me", editForm);
      setUser(response.data.data);
      setIsEditing(false);
    } catch (err: any) {
      console.error(err);
      setEditError(err.response?.data?.message || "Failed to update profile");
    } finally {
      setSaving(false);
    }
  };

  const getInitial = (name?: string, username?: string) => {
    if (name && name.trim().length > 0) return name.trim().charAt(0).toUpperCase();
    if (username && username.trim().length > 0) return username.trim().charAt(0).toUpperCase();
    return "U";
  };

  return (
    <div style={{ minHeight: "100vh", backgroundColor: "#f9fafb" }}>
      <Navbar isAuthenticated={true} onLogout={() => {}} />

      <div style={{ maxWidth: "700px", margin: "40px auto", padding: "0 20px" }}>
        <Link
          to="/"
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "8px",
            color: "#4f46e5",
            textDecoration: "none",
            fontWeight: 600,
            fontSize: "14px",
            marginBottom: "20px",
          }}
        >
          &larr; Back to Home
        </Link>

        <div
          style={{
            background: "#ffffff",
            borderRadius: "20px",
            boxShadow:
              "0 10px 25px -5px rgba(0, 0, 0, 0.05), 0 8px 10px -6px rgba(0, 0, 0, 0.05)",
            border: "1px solid #e5e7eb",
            overflow: "hidden",
          }}
        >
          {/* Header Banner */}
          <div
            style={{
              height: "140px",
              background: "linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)",
              position: "relative",
            }}
          />

          <div style={{ padding: "0 32px 32px", position: "relative" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
              {/* Avatar */}
              <div
                style={{
                  width: "96px",
                  height: "96px",
                  borderRadius: "50%",
                  background: "linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)",
                  border: "4px solid #ffffff",
                  color: "#ffffff",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "36px",
                  fontWeight: 700,
                  marginTop: "-48px",
                  boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
                }}
              >
                {user ? getInitial(user.name, user.username) : "?"}
              </div>

              {/* Edit Profile Button */}
              {user && !isEditing && (
                <button
                  onClick={handleStartEdit}
                  style={{
                    padding: "8px 16px",
                    borderRadius: "10px",
                    border: "1px solid #d1d5db",
                    backgroundColor: "#ffffff",
                    color: "#374151",
                    fontWeight: 600,
                    fontSize: "14px",
                    cursor: "pointer",
                    transition: "all 0.2s ease",
                    display: "flex",
                    alignItems: "center",
                    gap: "6px",
                  }}
                >
                  <svg style={{ width: "16px", height: "16px", stroke: "#4b5563" }} fill="none" viewBox="0 0 24 24" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                  </svg>
                  Edit Profile
                </button>
              )}
            </div>

            {loading && (
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  padding: "40px 0",
                  gap: "12px",
                }}
              >
                <div
                  style={{
                    width: "36px",
                    height: "36px",
                    border: "3px solid #e5e7eb",
                    borderTop: "3px solid #4f46e5",
                    borderRadius: "50%",
                    animation: "spin 1s linear infinite",
                  }}
                />
                <style>{`
                  @keyframes spin {
                    0% { transform: rotate(0deg); }
                    100% { transform: rotate(360deg); }
                  }
                `}</style>
                <p style={{ color: "#6b7280", fontSize: "14px" }}>
                  Fetching user profile...
                </p>
              </div>
            )}

            {error && !loading && (
              <div
                style={{
                  marginTop: "24px",
                  padding: "16px",
                  backgroundColor: "#fef2f2",
                  border: "1px solid #fee2e2",
                  borderRadius: "12px",
                  color: "#991b1b",
                  fontSize: "14px",
                  textAlign: "center",
                  fontWeight: 500,
                }}
              >
                {error}
              </div>
            )}

            {/* Profile Display / Edit Form */}
            {user && !loading && !error && (
              <div style={{ marginTop: "16px" }}>
                {isEditing ? (
                  <form onSubmit={handleSave} style={{ display: "flex", flexDirection: "column", gap: "16px", marginTop: "12px" }}>
                    <h3 style={{ margin: "0 0 8px 0", fontSize: "18px", fontWeight: 700, color: "#111827" }}>
                      Edit Profile
                    </h3>

                    {editError && (
                      <div
                        style={{
                          padding: "12px",
                          backgroundColor: "#fef2f2",
                          border: "1px solid #fee2e2",
                          borderRadius: "8px",
                          color: "#991b1b",
                          fontSize: "14px",
                        }}
                      >
                        {editError}
                      </div>
                    )}

                    <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                      <label style={{ fontSize: "13px", fontWeight: 600, color: "#374151" }}>Name</label>
                      <input
                        type="text"
                        value={editForm.name}
                        onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                        placeholder="Your full name"
                        style={{
                          padding: "10px 14px",
                          borderRadius: "8px",
                          border: "1px solid #d1d5db",
                          fontSize: "14px",
                          outline: "none",
                        }}
                      />
                    </div>

                    <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                      <label style={{ fontSize: "13px", fontWeight: 600, color: "#374151" }}>Username</label>
                      <input
                        type="text"
                        value={editForm.username}
                        onChange={(e) => setEditForm({ ...editForm, username: e.target.value })}
                        placeholder="Username"
                        style={{
                          padding: "10px 14px",
                          borderRadius: "8px",
                          border: "1px solid #d1d5db",
                          fontSize: "14px",
                          outline: "none",
                        }}
                      />
                    </div>

                    <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                      <label style={{ fontSize: "13px", fontWeight: 600, color: "#374151" }}>Bio</label>
                      <textarea
                        rows={3}
                        value={editForm.bio}
                        onChange={(e) => setEditForm({ ...editForm, bio: e.target.value })}
                        placeholder="Tell us about yourself..."
                        style={{
                          padding: "10px 14px",
                          borderRadius: "8px",
                          border: "1px solid #d1d5db",
                          fontSize: "14px",
                          fontFamily: "inherit",
                          resize: "vertical",
                          outline: "none",
                        }}
                      />
                    </div>

                    <div style={{ display: "flex", gap: "12px", justifyContent: "flex-end", marginTop: "8px" }}>
                      <button
                        type="button"
                        onClick={() => setIsEditing(false)}
                        disabled={saving}
                        style={{
                          padding: "8px 16px",
                          borderRadius: "8px",
                          border: "1px solid #d1d5db",
                          backgroundColor: "#ffffff",
                          color: "#374151",
                          fontWeight: 600,
                          fontSize: "14px",
                          cursor: "pointer",
                        }}
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        disabled={saving}
                        style={{
                          padding: "8px 20px",
                          borderRadius: "8px",
                          border: "none",
                          backgroundColor: "#4f46e5",
                          color: "#ffffff",
                          fontWeight: 600,
                          fontSize: "14px",
                          cursor: saving ? "not-allowed" : "pointer",
                          opacity: saving ? 0.7 : 1,
                        }}
                      >
                        {saving ? "Saving..." : "Save Changes"}
                      </button>
                    </div>
                  </form>
                ) : (
                  <>
                    <h1
                      style={{
                        fontSize: "24px",
                        fontWeight: 700,
                        color: "#111827",
                        margin: "0 0 4px 0",
                      }}
                    >
                      {user.name || user.username}
                    </h1>
                    <p
                      style={{
                        fontSize: "14px",
                        color: "#6b7280",
                        margin: "0 0 16px 0",
                      }}
                    >
                      @{user.username}
                    </p>

                    {user.bio ? (
                      <p
                        style={{
                          fontSize: "15px",
                          color: "#374151",
                          lineHeight: "1.6",
                          marginTop: "16px",
                          marginBottom: "0",
                          backgroundColor: "#f3f4f6",
                          padding: "12px 16px",
                          borderRadius: "10px",
                        }}
                      >
                        {user.bio}
                      </p>
                    ) : (
                      <p style={{ fontSize: "14px", color: "#9ca3af", fontStyle: "italic", marginTop: "12px" }}>
                        No bio provided yet.
                      </p>
                    )}
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Profile;
