
import { useState } from "react";
import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
} from "react-leaflet";

import "leaflet/dist/leaflet.css";
import "./App.css";

function App() {
  // Upload modal
  const [isUploadOpen, setIsUploadOpen] = useState(false);

  // Posts
  const [posts, setPosts] = useState([]);

  // Friends
  const [friends, setFriends] = useState([
    { id: 1, name: "Alex Morgan" },
    { id: 2, name: "Jamie Lee" },
    { id: 3, name: "Sam Rivera" },
  ]);

  // Map center: between Lancaster and NYC
  const centerPosition = [40.4, -75.2];

  // Handle photo submission
  async function handlePost(event) {
    event.preventDefault();

    const form = event.currentTarget;
    const formData = new FormData(form);

    const photo = formData.get("photo");
    const caption = formData.get("caption");
    const location = formData.get("location");

    if (!photo || photo.size === 0) {
      alert("Please select a photo!");
      return;
    }

    // Look up location coordinates
    let coords = null;

    if (location && location.trim() !== "") {
      try {
        const response = await fetch(
          `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(location)}`
        );

        if (!response.ok) {
          throw new Error("Location search failed");
        }

        const data = await response.json();

        if (Array.isArray(data) && data.length > 0) {
          coords = [
            parseFloat(data[0].lat),
            parseFloat(data[0].lon),
          ];
        }
      } catch (error) {
        console.error("Could not find location:", error);
      }
    }

    const newPost = {
      id: Date.now(),
      image: URL.createObjectURL(photo),
      caption: caption,
      location: location,
      coords: coords,
      name: "You",
      time: "Just now",
    };

    setPosts((currentPosts) => [
      newPost,
      ...currentPosts,
    ]);

    form.reset();
    setIsUploadOpen(false);
  }

  // Add a friend
  function handleAddFriend(event) {
    event.preventDefault();

    const form = event.currentTarget;
    const formData = new FormData(form);

    const name = formData.get("friendName").trim();

    if (name === "") return;

    const alreadyExists = friends.some(
      (friend) =>
        friend.name.toLowerCase() === name.toLowerCase()
    );

    if (alreadyExists) {
      alert("This friend is already on your list!");
      return;
    }

    const newFriend = {
      id: Date.now(),
      name: name,
    };

    setFriends((currentFriends) => [
      ...currentFriends,
      newFriend,
    ]);

    form.reset();
  }

  return (
    <div className="website">

      {/* Navigation */}
      <header className="navbar">
        <h1 className="logo">dayframe.</h1>

        <div className="nav-links">
          <a href="#home">Home</a>
          <a href="#explore">Explore</a>
          <a href="#friends">Friends</a>
        </div>

        <button type="button" className="profile-button">
          My Profile
        </button>
      </header>

      {/* Main content */}
      <main className="main-container">

        {/* Photo feed */}
        <section className="feed" id="home">

          <div className="welcome">
            <h1>Your day, one frame at a time.</h1>

            <p>
              A little snapshot of life, shared with the people
              who matter.
            </p>
          </div>

          {/* Interactive map */}
          <div
            id="explore"
            style={{
              height: "350px",
              width: "100%",
              borderRadius: "12px",
              overflow: "hidden",
              marginBottom: "24px",
              position: "relative",
              zIndex: 1,
            }}
          >
            <MapContainer
              center={centerPosition}
              zoom={7}
              scrollWheelZoom={true}
              style={{ height: "100%", width: "100%" }}
            >
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />

              {/* Sample friend locations */}
              <Marker position={[40.7128, -74.006]}>
                <Popup>
                  <strong>Alex Morgan</strong>
                  <br />
                  📍 New York City
                </Popup>
              </Marker>

              <Marker position={[40.0468, -76.3198]}>
                <Popup>
                  <strong>Jamie Lee</strong>
                  <br />
                  📍 Lancaster, PA
                </Popup>
              </Marker>

              {/* Markers from uploaded posts */}
              {posts
                .filter((post) => post.coords)
                .map((post) => (
                  <Marker
                    key={post.id}
                    position={post.coords}
                  >
                    <Popup>
                      <strong>{post.name}</strong>
                      <br />
                      📍 {post.location}

                      {post.caption && (
                        <>
                          <br />
                          <em>{post.caption}</em>
                        </>
                      )}
                    </Popup>
                  </Marker>
                ))}
            </MapContainer>
          </div>

          {/* Feed heading */}
          <div className="feed-header">
            <h2>Recent moments</h2>

            <button
              type="button"
              className="share-button"
              onClick={() => setIsUploadOpen(true)}
            >
              + Share a moment
            </button>
          </div>

          {/* Uploaded posts */}
          {posts.map((post) => (
            <article className="photo-card" key={post.id}>

              <img
                src={post.image}
                alt="Your uploaded moment"
                className="posted-image"
              />

              <div className="photo-info">
                <div>
                  <h3>{post.name}</h3>

                  <p>
                    {post.location
                      ? `📍 ${post.location}`
                      : "Location not added"}
                  </p>
                </div>

                <span className="time">
                  {post.time}
                </span>
              </div>

              {post.caption && (
                <p className="caption">
                  {post.caption}
                </p>
              )}

            </article>
          ))}

          {/* Sample post 1 */}
          <article className="photo-card">

            <div className="photo-info">
              <div className="avatar">A</div>

              <div>
                <strong>Alex Morgan</strong>
                <p>2 hours ago</p>
              </div>
            </div>

            <div className="photo-placeholder photo-one">
              <span>A sunny afternoon ☀️</span>
            </div>

            <p className="caption">
              A beautiful afternoon exploring the city.
            </p>

          </article>

          {/* Sample post 2 */}
          <article className="photo-card">

            <div className="photo-info">
              <div className="avatar">J</div>

              <div>
                <strong>Jamie Lee</strong>
                <p>Yesterday</p>
              </div>
            </div>

            <div className="photo-placeholder photo-two">
              <span>Weekend adventures 🌿</span>
            </div>

            <p className="caption">
              Coffee, sunshine, and a slow morning.
            </p>

          </article>

        </section>

        {/* Friends sidebar */}
        <aside className="sidebar" id="friends">

          <h3>Your friends</h3>

          <p>Stay connected with your people.</p>

          {/* Add friend form */}
          <form
            className="add-friend"
            onSubmit={handleAddFriend}
          >
            <input
              type="text"
              name="friendName"
              placeholder="Enter a friend's name"
              required
            />

            <button type="submit">
              Add
            </button>
          </form>

          {/* Friends list */}
          <div className="friends-list">

            {friends.map((friend) => (
              <div className="friend" key={friend.id}>

                <span className="avatar">
                  {friend.name.charAt(0).toUpperCase()}
                </span>

                <span>{friend.name}</span>

              </div>
            ))}

          </div>

        </aside>

      </main>

      {/* Upload modal */}
      {isUploadOpen && (
        <div className="modal-overlay">

          <div className="upload-modal">

            <button
              className="close-button"
              onClick={() => setIsUploadOpen(false)}
              type="button"
            >
              ×
            </button>

            <h2>Share a moment</h2>

            <p>
              Give your friends a little window into your day.
            </p>

            <form onSubmit={handlePost}>

              <label>Select a photo</label>

              <input
                type="file"
                name="photo"
                accept="image/*"
                required
              />

              <label>Caption</label>

              <textarea
                name="caption"
                placeholder="Write something about your moment..."
              />

              <label>Location</label>

              <input
                type="text"
                name="location"
                placeholder="Where was this taken?"
              />

              <button
                type="submit"
                className="share-button"
              >
                Post moment
              </button>

            </form>

          </div>
        </div>
      )}

    </div>
  );
}

export default App;
