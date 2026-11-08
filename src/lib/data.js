import { supabase } from "./supabase";

const MOMENTS_BUCKET = "moments";

async function fetchConnectedProfiles() {
  const { data: profiles, error } = await supabase.rpc("get_connected_profiles");
  if (error) throw error;
  return new Map(
    profiles.map((profile) => [profile.profile_id, profile.email])
  );
}

function formatTime(createdAt) {
  const minutes = Math.floor((Date.now() - new Date(createdAt).getTime()) / 60000);
  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes} minute${minutes === 1 ? "" : "s"} ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} hour${hours === 1 ? "" : "s"} ago`;
  const days = Math.floor(hours / 24);
  return `${days} day${days === 1 ? "" : "s"} ago`;
}

export async function fetchMoments(userId) {
  const { data: moments, error } = await supabase
    .from("moments")
    .select("id, user_id, storage_path, caption, location, latitude, longitude, created_at")
    .order("created_at", { ascending: false });
  if (error) throw error;

  if (moments.length === 0) return [];

  const emails = await fetchConnectedProfiles();

  return Promise.all(
    moments.map(async (moment) => {
      const { data, error: imageError } = await supabase.storage
        .from(MOMENTS_BUCKET)
        .createSignedUrl(moment.storage_path, 3600);
      if (imageError) throw imageError;

      return {
        id: moment.id,
        image: data.signedUrl,
        caption: moment.caption,
        location: moment.location,
        coords: [moment.latitude, moment.longitude],
        name: moment.user_id === userId
          ? "You"
          : emails.get(moment.user_id) || "Friend",
        time: formatTime(moment.created_at),
      };
    })
  );
}

export async function fetchFriendConnections(userId) {
  const { data: requests, error } = await supabase
    .from("friend_requests")
    .select("id, sender_id, recipient_id, status, created_at")
    .in("status", ["pending", "accepted"])
    .order("created_at", { ascending: false });
  if (error) throw error;

  if (requests.length === 0) {
    return { friends: [], incoming: [], outgoing: [] };
  }

  const emails = await fetchConnectedProfiles();

  const friends = [];
  const incoming = [];
  const outgoing = [];
  requests.forEach((request) => {
    const otherUserId =
      request.sender_id === userId ? request.recipient_id : request.sender_id;
    const connection = {
      id: request.id,
      email: emails.get(otherUserId) || "Unknown account",
    };

    if (request.status === "accepted") {
      friends.push(connection);
    } else if (request.status === "pending" && request.recipient_id === userId) {
      incoming.push({ ...connection, senderId: request.sender_id });
    } else if (request.status === "pending") {
      outgoing.push(connection);
    }
  });

  return { friends, incoming, outgoing };
}

export async function createMoment(userId, photo, { caption, location, coords }) {
  const extension = photo.name.split(".").pop()?.toLowerCase().replace(/[^a-z0-9]/g, "") || "jpg";
  const storagePath = `${userId}/${crypto.randomUUID()}.${extension}`;
  const { error: uploadError } = await supabase.storage
    .from(MOMENTS_BUCKET)
    .upload(storagePath, photo, {
      cacheControl: "3600",
      contentType: photo.type,
      upsert: false,
    });
  if (uploadError) throw uploadError;

  const { error: insertError } = await supabase.from("moments").insert({
    user_id: userId,
    storage_path: storagePath,
    caption,
    location,
    latitude: coords[0],
    longitude: coords[1],
  });

  if (insertError) {
    const { error: cleanupError } = await supabase.storage
      .from(MOMENTS_BUCKET)
      .remove([storagePath]);
    if (cleanupError) {
      throw new Error(
        `${insertError.message} The uploaded photo could not be cleaned up: ${cleanupError.message}`
      );
    }
    throw insertError;
  }
}
