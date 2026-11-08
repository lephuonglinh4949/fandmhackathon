import { useEffect, useState } from "react";
import {
  MapContainer,
  Marker,
  Popup,
  TileLayer,
} from "react-leaflet";

import "leaflet/dist/leaflet.css";
import "./App.css";

const friendMoments = [
  {
    id: "alex",
    name: "Alex Morgan",
    location: "New York City",
    coords: [40.7128, -74.006],
    time: "2 hours ago",
    caption: "A beautiful afternoon exploring the city.",
    imageClass: "photo-one",
    imageText: "A sunny afternoon",
  },
  {
    id: "jamie",
    name: "Jamie Lee",
    location: "Lancaster, PA",
    coords: [40.0468, -76.3198],
    time: "Yesterday",
    caption: "Coffee, sunshine, and a slow morning.",
    imageClass: "photo-two",
    imageText: "Weekend adventures",
  },
];

function getPageFromHash() {
  const page = window.location.hash.slice(1);
  return ["home", "explore", "friends"].includes(page) ? page : "home";
}

function MomentMap({ posts }) {
  return (
    <MapContainer
      center={[40.4, -75.2]}
      zoom={7}
      scrollWheelZoom
      className="moments-map"
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />

      {friendMoments.map((moment) => (
        <Marker key={moment.id} position={moment.coords}>
          <Popup>
            <div className="map-moment">
              <div className={`photo-placeholder ${moment.imageClass}`}>
                <span>{moment.imageText}</span>
              </div>
              <strong>{moment.name}</strong>
              <p>📍 {moment.location}</p>
              <p>{moment.caption}</p>
            </div>
          </Popup>
        </Marker>
      ))}

      {posts
        .filter((post) => post.coords)
        .map((post) => (
          <Marker key={post.id} position={post.coords}>
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

function App() {
  const [activePage, setActivePage] = useState(getPageFromHash);
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [posts, setPosts] = useState([]);
  const [friends, setFriends] = useState([
    { id: 1, name: "Alex Morgan" },
    { id: 2, name: "Jamie Lee" },
    { id: 3, name: "Sam Rivera" },
  ]);

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
          coords = [parseFloat(data[0].lat), parseFloat(data[0].lon)];
        }
      } catch (error) {
        console.error("Could not find location:", error);
      }
    }

    setPosts((currentPosts) => [
      {
        id: Date.now(),
        image: URL.createObjectURL(photo),
        caption,
        location,
        coords,
        name: "You",
        time: "Just now",
      },
      ...currentPosts,
    ]);

    form.reset();
    setIsUploadOpen(false);
  }

  function handleAddFriend(event) {
    event.preventDefault();

    const form = event.currentTarget;
    const formData = new FormData(form);
    const name = formData.get("friendName").trim();

    if (name === "") return;

    const alreadyExists = friends.some(
      (friend) => friend.name.toLowerCase() === name.toLowerCase()
    );
    if (alreadyExists) {
      alert("This friend is already on your list!");
      return;
    }

    setFriends((currentFriends) => [
      ...currentFriends,
      { id: Date.now(), name },
    ]);
    form.reset();
  }

  return (
    <div className="website">
      <header className="navbar">
        <a className="logo" href="#home" aria-label="dayframe home">
          dayframe.
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
        <button type="button" className="profile-button">
          My Profile
        </button>
      </header>

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
              <h2>Recent moments</h2>
              <button
                type="button"
                className="share-button"
                onClick={() => setIsUploadOpen(true)}
              >
                + Share a moment
              </button>
            </div>

            {posts.map((post) => (
              <article className="photo-card" key={post.id}>
                <img
                  src={post.image}
                  alt={post.caption || "Your shared moment"}
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
                  <span className="time">{post.time}</span>
                </div>
                {post.caption && <p className="caption">{post.caption}</p>}
              </article>
            ))}

            {friendMoments.map((moment) => (
              <article className="photo-card" key={moment.id}>
                <div className="photo-info">
                  <div className="avatar">
                    {moment.name.charAt(0)}
                  </div>
                  <div>
                    <h3>{moment.name}</h3>
                    <p>
                      📍 {moment.location} · {moment.time}
                    </p>
                  </div>
                </div>
                <div className={`photo-placeholder ${moment.imageClass}`}>
                  <span>{moment.imageText}</span>
                </div>
                <p className="caption">{moment.caption}</p>
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
            <p>Stay connected with your people.</p>
            <form className="add-friend" onSubmit={handleAddFriend}>
              <input
                type="text"
                name="friendName"
                placeholder="Enter a friend's name"
                aria-label="Friend's name"
                required
              />
              <button type="submit">Add</button>
            </form>
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
              <label htmlFor="photo">Select a photo</label>
              <input id="photo" type="file" name="photo" accept="image/*" required />
              <label htmlFor="caption">Caption</label>
              <textarea
                id="caption"
                name="caption"
                placeholder="Write something about your moment..."
              />
              <label htmlFor="location">Location</label>
              <input
                id="location"
                type="text"
                name="location"
                placeholder="Where was this taken?"
              />
              <button type="submit" className="share-button">
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
