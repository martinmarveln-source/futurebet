// @ts-nocheck
"use client";

import { useState, useEffect } from "react";
import { User, Camera, Save, Eye, EyeOff, Mail } from "lucide-react";
import useUser from "@/utils/useUser";
import useUpload from "@/utils/useUpload";
import { useMutation, useQueryClient } from "@tanstack/react-query";

export default function ProfilePage() {
  const { data: user, loading: userLoading } = useUser();
  const queryClient = useQueryClient();
  const [upload, { loading: uploading }] = useUpload();

  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    username: "",
    email: "",
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });

  const [profilePicture, setProfilePicture] = useState(null);
  const [showPasswords, setShowPasswords] = useState(false);
  const [errors, setErrors] = useState({});
  const [successMessage, setSuccessMessage] = useState("");

  useEffect(() => {
    if (user) {
      setFormData({
        firstName: user.first_name || "",
        lastName: user.last_name || "",
        username: user.username || "",
        email: user.email || "",
        currentPassword: "",
        newPassword: "",
        confirmPassword: "",
      });
      setProfilePicture(user.profile_picture || null);
    }
  }, [user]);

  const updateProfileMutation = useMutation({
    mutationFn: async (data) => {
      const response = await fetch("/api/user/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to update profile");
      }
      return response.json();
    },
    onSuccess: () => {
      setSuccessMessage("Profile updated successfully!");
      setFormData((prev) => ({
        ...prev,
        currentPassword: "",
        newPassword: "",
        confirmPassword: "",
      }));
      queryClient.invalidateQueries(["user"]);
      setTimeout(() => setSuccessMessage(""), 5000);
    },
    onError: (error) => {
      setErrors({ general: error.message });
    },
  });

  const sendVerificationMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch("/api/user/send-verification", {
        method: "POST",
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to send verification email");
      }
      return response.json();
    },
    onSuccess: () => {
      setSuccessMessage("Verification email sent! Check your inbox.");
      setTimeout(() => setSuccessMessage(""), 5000);
    },
    onError: (error) => {
      setErrors({ general: error.message });
    },
  });

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: "" }));
    }
  };

  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      setErrors({ profilePicture: "Image must be less than 5MB" });
      return;
    }

    try {
      const reader = new FileReader();
      reader.onload = async (e) => {
        const { url, error } = await upload({ base64: e.target.result });
        if (error) {
          setErrors({ profilePicture: error });
        } else {
          setProfilePicture(url);
          setErrors((prev) => ({ ...prev, profilePicture: "" }));
        }
      };
      reader.readAsDataURL(file);
    } catch (error) {
      setErrors({ profilePicture: "Failed to upload image" });
    }
  };

  const validateForm = () => {
    const newErrors = {};

    if (formData.firstName.trim().length < 1) {
      newErrors.firstName = "First name is required";
    }

    if (formData.username.trim().length < 3) {
      newErrors.username = "Username must be at least 3 characters";
    }

    if (formData.newPassword || formData.confirmPassword) {
      if (!formData.currentPassword) {
        newErrors.currentPassword =
          "Current password required to change password";
      }
      if (formData.newPassword.length < 6) {
        newErrors.newPassword = "New password must be at least 6 characters";
      }
      if (formData.newPassword !== formData.confirmPassword) {
        newErrors.confirmPassword = "Passwords do not match";
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    const updateData = {
      firstName: formData.firstName.trim(),
      lastName: formData.lastName.trim(),
      username: formData.username.trim(),
      profilePicture,
    };

    if (formData.newPassword) {
      updateData.currentPassword = formData.currentPassword;
      updateData.newPassword = formData.newPassword;
    }

    updateProfileMutation.mutate(updateData);
  };

  if (userLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (!user) {
    window.location.href = "/account/signin";
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-2xl mx-auto px-4">
        <div className="bg-white rounded-lg shadow-md p-8">
          <div className="flex items-center space-x-3 mb-8">
            <User className="h-8 w-8 text-blue-500" />
            <h1 className="text-3xl font-bold text-gray-900">User Profile</h1>
          </div>

          {successMessage && (
            <div className="mb-6 p-4 bg-green-100 border border-green-400 text-green-700 rounded-lg">
              {successMessage}
            </div>
          )}

          {errors.general && (
            <div className="mb-6 p-4 bg-red-100 border border-red-400 text-red-700 rounded-lg">
              {errors.general}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Profile Picture */}
            <div className="flex flex-col items-center space-y-4">
              <div className="relative">
                {profilePicture ? (
                  <img
                    src={profilePicture}
                    alt="Profile"
                    className="w-32 h-32 rounded-full object-cover border-4 border-gray-200"
                  />
                ) : (
                  <div className="w-32 h-32 rounded-full bg-gray-200 flex items-center justify-center border-4 border-gray-200">
                    <User className="h-12 w-12 text-gray-400" />
                  </div>
                )}
                <label
                  htmlFor="profilePicture"
                  className="absolute bottom-0 right-0 bg-blue-500 text-white rounded-full p-2 cursor-pointer hover:bg-blue-600 transition-colors"
                >
                  <Camera className="h-4 w-4" />
                </label>
                <input
                  id="profilePicture"
                  type="file"
                  accept="image/*"
                  onChange={handleImageUpload}
                  className="hidden"
                  disabled={uploading}
                />
              </div>
              {uploading && (
                <p className="text-sm text-blue-600">Uploading image...</p>
              )}
              {errors.profilePicture && (
                <p className="text-sm text-red-600">{errors.profilePicture}</p>
              )}
            </div>

            {/* Basic Information */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  First Name *
                </label>
                <input
                  type="text"
                  name="firstName"
                  value={formData.firstName}
                  onChange={handleInputChange}
                  className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                    errors.firstName ? "border-red-500" : "border-gray-300"
                  }`}
                  required
                />
                {errors.firstName && (
                  <p className="text-sm text-red-600 mt-1">
                    {errors.firstName}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Last Name
                </label>
                <input
                  type="text"
                  name="lastName"
                  value={formData.lastName}
                  onChange={handleInputChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Username *
                </label>
                <input
                  type="text"
                  name="username"
                  value={formData.username}
                  onChange={handleInputChange}
                  className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                    errors.username ? "border-red-500" : "border-gray-300"
                  }`}
                  required
                />
                {errors.username && (
                  <p className="text-sm text-red-600 mt-1">{errors.username}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Email
                </label>
                <div className="flex items-center space-x-2">
                  <input
                    type="email"
                    value={formData.email}
                    className="flex-1 px-4 py-2 border border-gray-300 rounded-lg bg-gray-50"
                    disabled
                  />
                  {!user.emailVerified && (
                    <button
                      type="button"
                      onClick={() => sendVerificationMutation.mutate()}
                      disabled={sendVerificationMutation.isPending}
                      className="flex items-center space-x-1 px-3 py-2 bg-yellow-500 text-white rounded-lg hover:bg-yellow-600 disabled:opacity-50"
                    >
                      <Mail className="h-4 w-4" />
                      <span>Verify</span>
                    </button>
                  )}
                </div>
                {!user.emailVerified && (
                  <p className="text-sm text-yellow-600 mt-1">
                    Email not verified
                  </p>
                )}
              </div>
            </div>

            {/* Password Change */}
            <div className="border-t pt-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">
                Change Password
              </h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Current Password
                  </label>
                  <div className="relative">
                    <input
                      type={showPasswords ? "text" : "password"}
                      name="currentPassword"
                      value={formData.currentPassword}
                      onChange={handleInputChange}
                      className={`w-full px-4 py-2 pr-10 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                        errors.currentPassword
                          ? "border-red-500"
                          : "border-gray-300"
                      }`}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPasswords(!showPasswords)}
                      className="absolute right-3 top-1/2 transform -translate-y-1/2"
                    >
                      {showPasswords ? (
                        <EyeOff className="h-4 w-4 text-gray-400" />
                      ) : (
                        <Eye className="h-4 w-4 text-gray-400" />
                      )}
                    </button>
                  </div>
                  {errors.currentPassword && (
                    <p className="text-sm text-red-600 mt-1">
                      {errors.currentPassword}
                    </p>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      New Password
                    </label>
                    <input
                      type={showPasswords ? "text" : "password"}
                      name="newPassword"
                      value={formData.newPassword}
                      onChange={handleInputChange}
                      className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                        errors.newPassword
                          ? "border-red-500"
                          : "border-gray-300"
                      }`}
                    />
                    {errors.newPassword && (
                      <p className="text-sm text-red-600 mt-1">
                        {errors.newPassword}
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Confirm New Password
                    </label>
                    <input
                      type={showPasswords ? "text" : "password"}
                      name="confirmPassword"
                      value={formData.confirmPassword}
                      onChange={handleInputChange}
                      className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                        errors.confirmPassword
                          ? "border-red-500"
                          : "border-gray-300"
                      }`}
                    />
                    {errors.confirmPassword && (
                      <p className="text-sm text-red-600 mt-1">
                        {errors.confirmPassword}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* User Role Display */}
            <div className="border-t pt-6">
              <div className="flex items-center space-x-4">
                <span className="text-sm font-medium text-gray-700">
                  Account Type:
                </span>
                <span
                  className={`px-3 py-1 rounded-full text-xs font-medium ${
                    user.user_role === "admin"
                      ? "bg-red-100 text-red-800"
                      : user.user_role === "premium"
                        ? "bg-yellow-100 text-yellow-800"
                        : user.user_role === "silver"
                          ? "bg-gray-100 text-gray-800"
                          : "bg-blue-100 text-blue-800"
                  }`}
                >
                  {user.user_role?.toUpperCase() || "FREE"}
                </span>
              </div>
            </div>

            {/* Submit Button */}
            <div className="flex justify-end">
              <button
                type="submit"
                disabled={updateProfileMutation.isPending}
                className="flex items-center space-x-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
              >
                <Save className="h-4 w-4" />
                <span>
                  {updateProfileMutation.isPending
                    ? "Saving..."
                    : "Save Changes"}
                </span>
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
