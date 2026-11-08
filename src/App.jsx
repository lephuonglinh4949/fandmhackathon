import { useEffect, useRef, useState } from "react";
import {
  MapContainer,
  Marker,
  Popup,
  TileLayer,
  useMap,
  useMapEvents,
} from "react-leaflet";
import { divIcon } from "leaflet";

import { createMoment, fetchFriendConnections, fetchMoments } from "./lib/data";
import { isSupabaseConfigured, supabase } from "./lib/supabase";
import "leaflet/dist/leaflet.css";
import "./App.css";

function getPageFromHash() {
  const page = window.location.hash.slice(1);
  return ["home", "explore", "friends"].includes(page) ? page : "home";
}

function getLocationErrorMessage(error) {
  if (error.code === 1) {
    return "Location access was denied. Allow it in your browser settings and try again.";
  }
  if (error.code === 2) {
    return "Your current location could not be determined. Try again.";
  }
  if (error.code === 3) {
    return "The location request timed out. Try again.";
  }
  return "Could not get your current location. Try again.";
}

function createMomentMarkerIcon(image) {
  return divIcon({
    className: "moment-marker-icon",
    html: `<img class="moment-marker-photo" src="${image}" alt="" />`,
    iconSize: [54, 54],
    iconAnchor: [27, 27],
    popupAnchor: [0, -26],
  });
}

function CurrentLocationButton({ onLocationSelected, zoom = 13 }) {
  const map = useMap();
  const [isLocating, setIsLocating] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  function locateCurrentPosition() {
    if (!navigator.geolocation) {
      setErrorMessage("Location is not available in this browser.");
      return;
    }

    setIsLocating(true);
    setErrorMessage("");
    try {
      navigator.geolocation.getCurrentPosition(
        ({ coords }) => {
          const position = [coords.latitude, coords.longitude];
          map.flyTo(position, zoom);
          onLocationSelected?.(position);
          setIsLocating(false);
        },
        (error) => {
          setErrorMessage(getLocationErrorMessage(error));
          setIsLocating(false);
        },
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 }
      );
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Could not get your current location. Try again."
      );
      setIsLocating(false);
    }
  }

  return (
    <div className="map-locate-control">
      <button
        type="button"
        onClick={locateCurrentPosition}
        disabled={isLocating}
      >
        {isLocating ? "Locating..." : "Use my location"}
      </button>
      {errorMessage && <span role="alert">{errorMessage}</span>}
    </div>
  );
}

function MapLocationSelector({ coords, onSelect }) {
  useMapEvents({
    click(event) {
      onSelect([event.latlng.lat, event.latlng.lng]);
    },
  });

  if (!coords) return null;

  return (
    <Marker
      position={coords}
      draggable
      eventHandlers={{
        dragend(event) {
          const position = event.target.getLatLng();
          onSelect([position.lat, position.lng]);
        },
      }}
    />
  );
}

function MomentMap({ posts }) {
  return (
    <MapContainer
      center={[40.4, -75.2]}
      zoom={7}
      scrollWheelZoom={true}
      className="moments-map"
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <CurrentLocationButton />
      {posts
        .filter((post) => post.coords)
        .map((post) => (
          <Marker
            key={post.id}
            position={post.coords}
            icon={createMomentMarkerIcon(post.image)}
          >
            <Popup>
              <div className="map-moment">
                <img src={post.image} alt={post.caption || "Shared moment"} />
                <strong>{post.name}</strong>
                <p>📍 {post.location}</p>
                {post.caption && <p>{post.caption}</p>}
              </div>
            </Popup>
          </Marker>
        ))}
    </MapContainer>
  );
}

function AuthScreen() {
  const [isSignUp, setIsSignUp] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function handleSubmit(event) {
    event.preventDefault();
    const form = event.currentTarget;
    setIsSubmitting(true);
    setMessage("");
    setError("");

    const formData = new FormData(event.currentTarget);
    const email = formData.get("email").trim().toLowerCase();
    const password = formData.get("password");

    try {
      const result = isSignUp
        ? await supabase.auth.signUp({ email, password })
        : await supabase.auth.signInWithPassword({ email, password });

      if (result.error) {
        setError(result.error.message);
      } else if (isSignUp && !result.data.session) {
        setMessage("Check your email to confirm your account, then sign in.");
        form.reset();
      }
    } catch (error) {
      setError(error.message || "Authentication failed. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="auth-page">
      <section className="auth-card">
        <a className="logo" href="#home">
          Elsewhere
        </a>
        <h1>{isSignUp ? "Create your account" : "Welcome back"}</h1>
        <p>
          {isSignUp
            ? "Sign up to share moments with your friends."
            : "Sign in to see the moments you share with friends."}
        </p>
        <form className="auth-form" onSubmit={handleSubmit}>
          <label htmlFor="auth-email">Email</label>
          <input
            id="auth-email"
            name="email"
            type="email"
            autoComplete="email"
            required
          />
          <label htmlFor="auth-password">Password</label>
          <input
            id="auth-password"
            name="password"
            type="password"
            autoComplete={isSignUp ? "new-password" : "current-password"}
            minLength={6}
            required
          />
          {error && (
            <p className="form-message form-error" role="alert">
              {error}
            </p>
          )}
          {message && <p className="form-message">{message}</p>}
          <button type="submit" className="share-button" disabled={isSubmitting}>
            {isSubmitting
              ? "Please wait..."
              : isSignUp
                ? "Create account"
                : "Sign in"}
          </button>
        </form>
        <button
          type="button"
          className="text-button"
          onClick={() => {
            setIsSignUp((value) => !value);
            setMessage("");
            setError("");
          }}
        >
          {isSignUp
            ? "Already have an account? Sign in"
            : "New to Elsewhere? Create an account"}
        </button>
      </section>
    </main>
  );
}

function SupabaseSetupMessage() {
  return (
    <main className="auth-page">
      <section className="auth-card">
        <a className="logo" href="#home">
          Elsewhere
        </a>
        <h1>Connect your Supabase project</h1>
        <p>
          Add your project URL and publishable key to a local{" "}
          <code>.env.local</code> file, then restart the dev server. See the
          README for setup steps.
        </p>
      </section>
    </main>
  );
}

function App() {
  const [activePage, setActivePage] = useState(getPageFromHash);
  const [session, setSession] = useState(null);
  const sessionUserId = session?.user?.id;
  const sessionUserIdRef = useRef(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [selectedCoords, setSelectedCoords] = useState(null);
  const [postError, setPostError] = useState("");
  const [isSubmittingPost, setIsSubmittingPost] = useState(false);
  const [posts, setPosts] = useState([]);
  const hasPostedToday = posts.some((post) => post.name === "You");
  const [postsLoading, setPostsLoading] = useState(true);
  const [friends, setFriends] = useState([]);
  const [incomingRequests, setIncomingRequests] = useState([]);
  const [outgoingRequests, setOutgoingRequests] = useState([]);
  const [friendsLoading, setFriendsLoading] = useState(true);
  const [friendEmail, setFriendEmail] = useState("");
  const [friendError, setFriendError] = useState("");
  const [friendMessage, setFriendMessage] = useState("");
  const [friendBusyId, setFriendBusyId] = useState("");
  const [pageError, setPageError] = useState("");

  useEffect(() => {
    if (!isSupabaseConfigured) return undefined;

    let active = true;
    supabase.auth
      .getSession()
      .then(({ data, error }) => {
        if (!active) return;
        if (error) setPageError(error.message);
        sessionUserIdRef.current = data.session?.user.id ?? null;
        setSession(data.session);
        setAuthLoading(false);
      })
      .catch((error) => {
        if (!active) return;
        setPageError(error.message);
        setAuthLoading(false);
      });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      const nextUserId = nextSession?.user.id ?? null;
      if (sessionUserIdRef.current !== nextUserId) {
        sessionUserIdRef.current = nextUserId;
        setFriendsLoading(Boolean(nextUserId));
        setPostsLoading(Boolean(nextUserId));
      }
      setSession(nextSession);
      setPageError("");
    });

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    function syncPageWithHash() {
      setActivePage(getPageFromHash());
    }

    if (!window.location.hash) {
      window.history.replaceState(null, "", "#home");
    }
    window.addEventListener("hashchange", syncPageWithHash);
    return () => window.removeEventListener("hashchange", syncPageWithHash);
  }, []);

  useEffect(() => {
    if (!sessionUserId) return undefined;

    let active = true;
    const userId = sessionUserId;

    async function refreshUserData() {
      try {
        const [nextPosts, connections] = await Promise.all([
          fetchMoments(userId),
          fetchFriendConnections(userId),
        ]);
        if (!active) return;
        setPosts(nextPosts);
        setFriends(connections.friends);
        setIncomingRequests(connections.incoming);
        setOutgoingRequests(connections.outgoing);
        setPageError("");
      } catch (error) {
        if (active) setPageError(error.message);
      } finally {
        if (active) {
          setFriendsLoading(false);
          setPostsLoading(false);
        }
      }
    }

    refreshUserData();
    const now = new Date();
    const nextUtcMidnight = Date.UTC(
      now.getUTCFullYear(),
      now.getUTCMonth(),
      now.getUTCDate() + 1
    );
    const midnightRefresh = window.setTimeout(
      refreshUserData,
      nextUtcMidnight - Date.now()
    );
    const channel = supabase
      .channel(`social-updates-${userId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "moments" },
        refreshUserData
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "friend_requests" },
        refreshUserData
      )
      .subscribe();

    return () => {
      active = false;
      window.clearTimeout(midnightRefresh);
      supabase.removeChannel(channel);
    };
  }, [sessionUserId]);

  async function handlePost(event) {
    event.preventDefault();

    const form = event.currentTarget;
    const formData = new FormData(form);
    const photo = formData.get("photo");
    const caption = formData.get("caption").trim();

    if (!photo || photo.size === 0) {
      setPostError("Please choose a photo.");
      return;
    }
    if (photo.size > 10 * 1024 * 1024) {
      setPostError("Photos must be 10 MB or smaller.");
      return;
    }
    if (!selectedCoords) {
      setPostError("Please select where the photo was taken on the map.");
      return;
    }

    setPostError("");
    setIsSubmittingPost(true);
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${selectedCoords[0]}&lon=${selectedCoords[1]}`
      );
      if (!response.ok) {
        throw new Error("Could not look up the address for this location.");
      }

      const addressData = await response.json();
      if (!addressData.display_name) {
        throw new Error("No address was found for this location.");
      }

      await createMoment(session.user.id, photo, {
        caption,
        location: addressData.display_name,
        coords: selectedCoords,
      });
      setPosts((currentPosts) => [
        {
          id: crypto.randomUUID(),
          image: URL.createObjectURL(photo),
          caption,
          location: addressData.display_name,
          coords: selectedCoords,
          name: "You",
          time: "Just now",
        },
        ...currentPosts,
      ]);
      form.reset();
      setSelectedCoords(null);
      setIsUploadOpen(false);
      setPageError("");
      try {
        setPosts(await fetchMoments(session.user.id));
      } catch (error) {
        setPageError(
          `Your moment was saved, but the feed could not be refreshed: ${error.message}`
        );
      }
    } catch (error) {
      setPostError(error.message || "Could not share this photo.");
    } finally {
      setIsSubmittingPost(false);
    }
  }

  async function handleSendFriendRequest(event) {
    event.preventDefault();
    setFriendError("");
    setFriendMessage("");
    const email = friendEmail.trim().toLowerCase();
    if (email === session.user.email?.toLowerCase()) {
      setFriendError("You cannot send a friend request to yourself.");
      return;
    }

    setFriendBusyId("send");
    try {
      const { error } = await supabase.rpc("request_friend_by_email", {
        target_email: email,
      });
      if (error) throw error;

      setFriendEmail("");
      setFriendMessage("Friend request sent.");
      const connections = await fetchFriendConnections(session.user.id);
      setFriends(connections.friends);
      setIncomingRequests(connections.incoming);
      setOutgoingRequests(connections.outgoing);
    } catch (error) {
      setFriendError(error.message);
    } finally {
      setFriendBusyId("");
    }
  }

  async function handleFriendRequestResponse(requestId, accept) {
    setFriendError("");
    setFriendMessage("");
    setFriendBusyId(requestId);
    try {
      const { error } = await supabase.rpc("respond_to_friend_request", {
        request_id: requestId,
        accept_request: accept,
      });
      if (error) throw error;

      const [connections, nextPosts] = await Promise.all([
        fetchFriendConnections(session.user.id),
        fetchMoments(session.user.id),
      ]);
      setFriends(connections.friends);
      setIncomingRequests(connections.incoming);
      setOutgoingRequests(connections.outgoing);
      setPosts(nextPosts);
    } catch (error) {
      setFriendError(error.message);
    } finally {
      setFriendBusyId("");
    }
  }

  async function handleSignOut() {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) setPageError(error.message);
    } catch (error) {
      setPageError(error.message || "Could not sign out.");
    }
  }

  function handleLocationSelect(coords) {
    setSelectedCoords(coords);
    setPostError("");
  }

  if (!isSupabaseConfigured) return <SupabaseSetupMessage />;
  if (authLoading) {
    return <main className="auth-page"><p>Loading your account...</p></main>;
  }
  if (!session) return <AuthScreen />;

  return (
    <div className="website">
      <header className="navbar">
        <a className="logo" href="#home" aria-label="Elsewhere home">
          Elsewhere
        </a>
        <nav className="nav-links" aria-label="Main navigation">
          {[
            ["home", "Home"],
            ["explore", "Explore"],
            ["friends", "Friends"],
          ].map(([page, label]) => (
            <a
              key={page}
              href={`#${page}`}
              aria-current={activePage === page ? "page" : undefined}
            >
              {label}
            </a>
          ))}
        </nav>
        <button type="button" className="profile-button" onClick={handleSignOut}>
          Sign out
        </button>
      </header>

      {pageError && (
        <p className="page-error" role="alert">
          {pageError}
        </p>
      )}

      {activePage === "home" && (
        <main className="page-container home-page">
          <section className="feed">
            <div className="welcome">
              <h1>Your day, one frame at a time.</h1>
              <p>
                A little snapshot of life, shared with the people who matter.
              </p>
            </div>

            <div className="feed-header">
              <div>
                <h2>Today's moments</h2>
                <p className="daily-limit-note">
                  One photo per person each day · Resets at midnight UTC
                </p>
              </div>
              <button
                type="button"
                className="share-button"
                disabled={postsLoading || hasPostedToday}
                onClick={() => {
                  setSelectedCoords(null);
                  setPostError("");
                  setIsUploadOpen(true);
                }}
              >
                {postsLoading
                  ? "Loading..."
                  : hasPostedToday
                    ? "You've posted today"
                    : "+ Share a moment"}
              </button>
            </div>

            {postsLoading && <p className="empty-feed">Loading moments...</p>}
            {!postsLoading && !pageError && posts.length === 0 && (
              <p className="empty-feed">
                No photos! Share a moment or add some friends!
              </p>
            )}

            {posts.map((post) => (
              <article className="photo-card" key={post.id}>
                <img
                  src={post.image}
                  alt={post.caption || "Shared moment"}
                  className="posted-image"
                />
                <div className="photo-info">
                  <div className="avatar">
                    {post.name === "You"
                      ? "Y"
                      : post.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="uploaded-post-details">
                    <h3>{post.name}</h3>
                    <p className="time">{post.time}</p>
                    <p className="post-location">📍 {post.location}</p>
                  </div>
                </div>
                {post.caption && <p className="caption">{post.caption}</p>}
              </article>
            ))}
          </section>
        </main>
      )}

      {activePage === "explore" && (
        <main className="page-container explore-page" aria-label="Explore map">
          <MomentMap posts={posts} />
        </main>
      )}

      {activePage === "friends" && (
        <main className="page-container friends-page">
          <section className="sidebar">
            <h1>Your friends</h1>
            <p>Send requests and connect with your people.</p>
            <form className="add-friend" onSubmit={handleSendFriendRequest}>
              <input
                type="email"
                name="friendEmail"
                value={friendEmail}
                onChange={(event) => setFriendEmail(event.target.value)}
                placeholder="Enter a friend's email"
                aria-label="Friend's email"
                autoComplete="email"
                required
              />
              <button type="submit" disabled={friendBusyId === "send"}>
                {friendBusyId === "send" ? "Sending..." : "Send request"}
              </button>
            </form>
            {friendError && (
              <p className="form-message form-error" role="alert">
                {friendError}
              </p>
            )}
            {friendMessage && <p className="form-message">{friendMessage}</p>}

            <section className="connection-section">
              <h2>Friend requests</h2>
              {friendsLoading && <p>Loading requests...</p>}
              {!friendsLoading && incomingRequests.length === 0 && (
                <p>No incoming requests.</p>
              )}
              {incomingRequests.map((request) => (
                <div className="request-row" key={request.id}>
                  <span>{request.email}</span>
                  <div>
                    <button
                      type="button"
                      onClick={() =>
                        handleFriendRequestResponse(request.id, true)
                      }
                      disabled={friendBusyId === request.id}
                    >
                      Accept
                    </button>
                    <button
                      type="button"
                      className="secondary-button"
                      onClick={() =>
                        handleFriendRequestResponse(request.id, false)
                      }
                      disabled={friendBusyId === request.id}
                    >
                      Decline
                    </button>
                  </div>
                </div>
              ))}
            </section>

            <section className="connection-section">
              <h2>Sent requests</h2>
              {outgoingRequests.length === 0 && <p>No pending sent requests.</p>}
              {outgoingRequests.map((request) => (
                <div className="friend" key={request.id}>
                  <span className="avatar">
                    {request.email.charAt(0).toUpperCase()}
                  </span>
                  <span>{request.email} · Pending</span>
                </div>
              ))}
            </section>

            <section className="connection-section">
              <h2>Your friends</h2>
              {friends.length === 0 && <p>You have not added any friends yet.</p>}
              <div className="friends-list">
                {friends.map((friend) => (
                  <div className="friend" key={friend.id}>
                    <span className="avatar">
                      {friend.email.charAt(0).toUpperCase()}
                    </span>
                    <span>{friend.email}</span>
                  </div>
                ))}
              </div>
            </section>
          </section>
        </main>
      )}

      {isUploadOpen && (
        <div className="modal-overlay">
          <div
            className="upload-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="share-title"
          >
            <button
              className="close-button"
              onClick={() => setIsUploadOpen(false)}
              type="button"
              aria-label="Close"
            >
              ×
            </button>
            <h2 id="share-title">Share a moment</h2>
            <p>Give your friends a little window into your day.</p>
            <form onSubmit={handlePost}>
              <label htmlFor="photo">Select a photo (10 MB max)</label>
              <input
                id="photo"
                type="file"
                name="photo"
                accept="image/jpeg,image/png,image/webp,image/gif"
                required
              />
              <label htmlFor="caption">Caption</label>
              <textarea
                id="caption"
                name="caption"
                placeholder="Write something about your moment..."
              />
              <div className="location-picker-label">
                <strong>Where was this taken? (required)</strong>
                <span>
                  {selectedCoords
                    ? `Selected: ${selectedCoords[0].toFixed(4)}, ${selectedCoords[1].toFixed(4)}`
                    : "Click the map to place a pin. You can drag it to adjust."}
                </span>
              </div>
              <div className="location-picker">
                <MapContainer
                  center={[40.4, -75.2]}
                  zoom={7}
                  scrollWheelZoom={true}
                  className="location-picker-map"
                >
                  <TileLayer
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                  />
                  <CurrentLocationButton
                    zoom={14}
                    onLocationSelected={handleLocationSelect}
                  />
                  <MapLocationSelector
                    coords={selectedCoords}
                    onSelect={handleLocationSelect}
                  />
                </MapContainer>
              </div>
              {postError && (
                <p className="post-error" role="alert">
                  {postError}
                </p>
              )}
              <button
                type="submit"
                className="share-button"
                disabled={!selectedCoords || isSubmittingPost}
              >
                {isSubmittingPost ? "Uploading..." : "Post moment"}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
