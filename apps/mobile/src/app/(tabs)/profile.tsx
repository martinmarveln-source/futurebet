// @ts-nocheck
import React, { useState } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
} from "react-native";
import { StatusBar } from "expo-status-bar";
import { Image } from "expo-image";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import * as ImagePicker from "expo-image-picker";
import {
  User,
  Camera,
  Shield,
  Crown,
  Star,
  CheckCircle,
  LogOut,
  ExternalLink,
  Lock,
} from "lucide-react-native";

import { useAuth } from "@/utils/auth/useAuth";
import useUser from "@/utils/auth/useUser";
import useUpload from "@/utils/useUpload";
import KeyboardAvoidingAnimatedView from "@/components/KeyboardAvoidingAnimatedView";

/* -------------------------------------------------------------------------- */
/* UTILITIES                                                                  */
/* -------------------------------------------------------------------------- */

const ROLE_CONFIG = {
  admin: {
    label: "ADMIN",
    color: "#9333EA",
    subtitle: "Full system access",
    Icon: Shield,
  },
  premium: {
    label: "PREMIUM",
    color: "#F59E0B",
    subtitle: "Advanced picks & analytics",
    Icon: Crown,
  },
  silver: {
    label: "SILVER",
    color: "#9CA3AF",
    subtitle: "Core predictions access",
    Icon: Star,
  },
  free: {
    label: "FREE",
    color: "#10B981",
    subtitle: "Basic access",
    Icon: User,
  },
};

/* -------------------------------------------------------------------------- */
/* COMPONENT                                                                  */
/* -------------------------------------------------------------------------- */

export default function Profile() {
  const insets = useSafeAreaInsets();
  const { signOut } = useAuth();
  const { data: user, refetch } = useUser();
  const queryClient = useQueryClient();
  const [upload, { loading: uploadLoading }] = useUpload();

  const [editMode, setEditMode] = useState(false);
  const [form, setForm] = useState({
    first_name: user?.first_name || "",
    last_name: user?.last_name || "",
    username: user?.username || "",
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });

  const roleKey = user?.user_role || "free";
  const role = ROLE_CONFIG[roleKey] || ROLE_CONFIG.free;
  const RoleIcon = role.Icon;

  /* ------------------------------------------------------------------------ */
  /* MUTATIONS                                                                */
  /* ------------------------------------------------------------------------ */

  const updateProfile = useMutation({
    mutationFn: async (payload) => {
      const res = await fetch("/api/user/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error("Update failed");
      return res.json();
    },
    onSuccess: () => {
      Alert.alert("Profile updated");
      setEditMode(false);
      refetch();
      queryClient.invalidateQueries(["user"]);
    },
    onError: (e) => Alert.alert("Error", e.message),
  });

  const handleImagePick = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (!result.canceled) {
      const { url, error } = await upload({
        reactNativeAsset: result.assets[0],
      });
      if (error) return Alert.alert("Upload failed");
      updateProfile.mutate({ profile_picture: url });
    }
  };

  const handleSave = () => {
    if (form.newPassword && form.newPassword !== form.confirmPassword) {
      return Alert.alert("Passwords do not match");
    }

    updateProfile.mutate({
      first_name: form.first_name,
      last_name: form.last_name,
      username: form.username,
      ...(form.newPassword
        ? {
            currentPassword: form.currentPassword,
            newPassword: form.newPassword,
          }
        : {}),
    });
  };

  /* ------------------------------------------------------------------------ */
  /* UI                                                                       */
  /* ------------------------------------------------------------------------ */

  return (
    <KeyboardAvoidingAnimatedView style={{ flex: 1 }} behavior="padding">
      <View
        style={{
          flex: 1,
          backgroundColor: "#0B1220",
          paddingTop: insets.top,
        }}
      >
        <StatusBar style="light" />

        {/* ================= PROFILE HERO ================= */}
        <View style={{ alignItems: "center", paddingVertical: 28 }}>
          <View
            style={{
              borderWidth: 4,
              borderColor: role.color,
              borderRadius: 70,
              padding: 4,
            }}
          >
            <View
              style={{
                width: 120,
                height: 120,
                borderRadius: 60,
                backgroundColor: "#1F2937",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              {user?.profile_picture ? (
                <Image
                  source={{ uri: user.profile_picture }}
                  style={{ width: 112, height: 112, borderRadius: 56 }}
                />
              ) : (
                <User color="#9CA3AF" size={48} />
              )}
            </View>

            {editMode && (
              <TouchableOpacity
                onPress={handleImagePick}
                style={{
                  position: "absolute",
                  bottom: 0,
                  right: 0,
                  backgroundColor: "#2563EB",
                  width: 36,
                  height: 36,
                  borderRadius: 18,
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                {uploadLoading ? (
                  <ActivityIndicator color="white" />
                ) : (
                  <Camera size={18} color="white" />
                )}
              </TouchableOpacity>
            )}
          </View>

          <Text
            style={{
              color: "white",
              fontSize: 20,
              fontWeight: "700",
              marginTop: 12,
            }}
          >
            {user?.first_name || "User"} {user?.last_name || ""}
          </Text>

          <Text style={{ color: "#9CA3AF", fontSize: 13 }}>
            @{user?.username || "username"}
          </Text>

          <View
            style={{
              marginTop: 14,
              flexDirection: "row",
              alignItems: "center",
              backgroundColor: role.color,
              paddingHorizontal: 14,
              paddingVertical: 6,
              borderRadius: 20,
            }}
          >
            <RoleIcon size={14} color="white" />
            <Text style={{ color: "white", fontWeight: "700", marginLeft: 6 }}>
              {role.label}
            </Text>
          </View>

          <Text style={{ color: "#9CA3AF", fontSize: 12, marginTop: 6 }}>
            {role.subtitle}
          </Text>
        </View>

        {/* ================= CONTENT ================= */}
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: insets.bottom + 80 }}
        >
          {/* PERSONAL INFO */}
          <Card title="Personal Information">
            <InfoRow
              label="First name"
              value={user?.first_name}
              editable={editMode}
              onChange={(v) => setForm({ ...form, first_name: v })}
            />
            <InfoRow
              label="Last name"
              value={user?.last_name}
              editable={editMode}
              onChange={(v) => setForm({ ...form, last_name: v })}
            />
            <InfoRow
              label="Username"
              value={user?.username}
              editable={editMode}
              onChange={(v) => setForm({ ...form, username: v })}
            />
            <View
              style={{
                marginTop: 12,
                flexDirection: "row",
                alignItems: "center",
              }}
            >
              <Text style={{ color: "#9CA3AF", fontSize: 12, flex: 1 }}>
                {user?.email}
              </Text>
              {user?.emailVerified && <CheckCircle size={16} color="#10B981" />}
            </View>
          </Card>

          {/* SECURITY */}
          {editMode && (
            <Card title="Security">
              <SecureInput
                label="Current password"
                value={form.currentPassword}
                onChange={(v) => setForm({ ...form, currentPassword: v })}
              />
              <SecureInput
                label="New password"
                value={form.newPassword}
                onChange={(v) => setForm({ ...form, newPassword: v })}
              />
              <SecureInput
                label="Confirm password"
                value={form.confirmPassword}
                onChange={(v) => setForm({ ...form, confirmPassword: v })}
              />
            </Card>
          )}

          {/* ACTIONS */}
          <View style={{ paddingHorizontal: 20, marginTop: 16 }}>
            <PrimaryButton
              label={editMode ? "Save Changes" : "Edit Profile"}
              onPress={() => (editMode ? handleSave() : setEditMode(true))}
              loading={updateProfile.isPending}
            />

            <DangerButton
              label="Sign Out"
              onPress={() =>
                Alert.alert("Sign out?", "Are you sure?", [
                  { text: "Cancel", style: "cancel" },
                  { text: "Sign Out", style: "destructive", onPress: signOut },
                ])
              }
            />
          </View>
        </ScrollView>
      </View>
    </KeyboardAvoidingAnimatedView>
  );
}

/* -------------------------------------------------------------------------- */
/* SMALL COMPONENTS                                                           */
/* -------------------------------------------------------------------------- */

function Card({ title, children }) {
  return (
    <View
      style={{
        backgroundColor: "#111827",
        borderRadius: 14,
        padding: 16,
        marginHorizontal: 20,
        marginBottom: 16,
      }}
    >
      <Text style={{ color: "white", fontWeight: "700", marginBottom: 12 }}>
        {title}
      </Text>
      {children}
    </View>
  );
}

function InfoRow({ label, value, editable, onChange }) {
  return editable ? (
    <TextInput
      placeholder={label}
      value={value}
      onChangeText={onChange}
      placeholderTextColor="#6B7280"
      style={{
        backgroundColor: "#1F2937",
        color: "white",
        borderRadius: 8,
        padding: 12,
        marginBottom: 10,
      }}
    />
  ) : (
    <Text style={{ color: "#D1D5DB", marginBottom: 8 }}>{value || "—"}</Text>
  );
}

function SecureInput({ label, value, onChange }) {
  return (
    <TextInput
      placeholder={label}
      value={value}
      onChangeText={onChange}
      placeholderTextColor="#6B7280"
      secureTextEntry
      style={{
        backgroundColor: "#1F2937",
        color: "white",
        borderRadius: 8,
        padding: 12,
        marginBottom: 10,
      }}
    />
  );
}

function PrimaryButton({ label, onPress, loading }) {
  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={loading}
      style={{
        backgroundColor: "#2563EB",
        padding: 16,
        borderRadius: 12,
        alignItems: "center",
        marginBottom: 12,
      }}
    >
      {loading ? (
        <ActivityIndicator color="white" />
      ) : (
        <Text style={{ color: "white", fontWeight: "700" }}>{label}</Text>
      )}
    </TouchableOpacity>
  );
}

function DangerButton({ label, onPress }) {
  return (
    <TouchableOpacity
      onPress={onPress}
      style={{
        backgroundColor: "#7F1D1D",
        padding: 16,
        borderRadius: 12,
        alignItems: "center",
      }}
    >
      <Text style={{ color: "white", fontWeight: "700" }}>{label}</Text>
    </TouchableOpacity>
  );
}
