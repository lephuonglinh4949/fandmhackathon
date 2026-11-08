import { useState } from "react";
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import "./App.css";

function App() {
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [posts, setPosts] = useState([]);

  // Center map between Lancaster, PA and New York City
  const centerPosition = [40.4, -75.2];

  // Handle photo submission
  async function handlePost(event) {
    event.preventDefault();

    const form = event.currentTarget;
    const formData = new FormData(form);

    const photo = formData.get("photo");
    const caption = formData.get("caption");
    const location = formData.get("location");

    // Make sure a photo was selected
    if (!photo || photo.size === 0) {
      alert("Please select a photo!");
      return;
    }

    // Look up coordinates if the user typed a location
    let coords = null;
    if (location && location.trim() !== "") {
      try {
        const res = await fetch(
          `https://openstreetmap.org{encodeURIComponent(location)}`
        );
        const data = await res.json();
        // Fixed: access the first result in the array (data[0])
        if (Array.isArray(data) && data.length > 0) {
          coords = [parseFloat(data[0].lat), parseFloat(data[0].lon)];
        }
      } catch (err) {
        console.error("Could not find location coordinates:", err);
      }
    }

    // Create a new post
    const newPost = {
      id: Date.now(),
      image: URL.createObjectURL(photo),
      caption: caption,
      location: location,
      coords: coords,
      name: "You",
      time: "Just now",
    };

    // Add the new post to the beginning of the feed
    setPosts((currentPosts) => [newPost, ...currentPosts]);

    // Close and reset the form
    form.reset();
    setIsUploadOpen(false);
  }

  return (
    <div className="website">
      {/* Navigation bar */}
      <header className="navbar">
        <h1 className="logo">dayframe.</h1>

        <nav>
          <a href="#">Home</a>
          <a href="#">Explore</a>
          <a href="#">Friends</a>
        </nav>

        <button type="button" className="profile-button">
          My Profile
        </button>
      </header>

      {/* Main content */}
      <main className="main-container">
        {/* Photo feed */}
        <section className="feed">
          <div className="welcome">
            <p className="date">YOUR DAILY MOMENTS</p>
            <h2>A little window into everyone's day.</h2>
            <p>See what your friends are up to today.</p>
          </div>

          {/* Interactive World Map */}
          <div
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
                attribution='&copy; <a href="https://openstreetmap.org">OpenStreetMap</a> contributors'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />

              {/* Default Friend Pins */}
              <Marker position={[40.7128, -74.006]}>
                <Popup>
                  <strong>Alex Morgan</strong>
                  <br />📍 New York City
                </Popup>
              </Marker>

              <Marker position={[40.0468, -76.3198]}>
                <Popup>
                  <strong>Jamie Lee</strong>
                  <br />📍 Lancaster, PA
                </Popup>
              </Marker>

              {/* Pins for your newly uploaded posts */}
              {posts
                .filter((post) => post.coords)
                .map((post) => (
                  <Marker key={post.id} position={post.coords}>
                    <Popup>
                      <strong>{post.name}</strong>
                      <br />📍 {post.location}
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

          <div className="feed-header">
            <h2>Today's moments</h2>

            <button
              type="button"
              className="share-button"
              onClick={() => setIsUploadOpen(true)}
            >
              + Share a moment
            </button>
          </div>

          {/* User-uploaded posts */}
          {posts.map((post) => (
            <article className="photo-card" key={post.id}>
              <img
                src={post.image}
                alt="Your daily moment"
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

              <p className="caption">{post.caption}</p>
            </article>
          ))}

          {/* Example friend post 1 */}
          <article className="photo-card">
            <div className="photo-placeholder photo-one">
              <span>Your photo goes here</span>
            </div>

            <div className="photo-info">
              <div>
                <h3>Alex Morgan</h3>
                <p>📍 New York City</p>
              </div>

              <span className="time">2 hours ago</span>
            </div>

            <p className="caption">
              A beautiful afternoon exploring the city.
            </p>
          </article>

          {/* Example friend post 2 */}
          <article className="photo-card">
            <div className="photo-placeholder photo-two">
              <span>Your photo goes here</span>
            </div>

            <div className="photo-info">
              <div>
                <h3>Jamie Lee</h3>
                <p>📍 Lancaster, PA</p>
              </div>

              <span className="time">4 hours ago</span>
            </div>

            <p className="caption">Coffee, sunshine, and a slow morning.</p>
          </article>
        </section>

        {/* Friends sidebar */}
        <aside className="sidebar">
          <h3>Your friends</h3>
          <p>Stay connected with your people.</p>

          <div className="friend">
            <span className="avatar">A</span>
            <span>Alex Morgan</span>
          </div>

          <div className="friend">
            <span className="avatar">J</span>
            <span>Jamie Lee</span>
          </div>

          <div className="friend">
            <span className="avatar">S</span>
            <span>Sam Wilson</span>
          </div>
        </aside>
      </main>

      {/* Upload modal */}
      {isUploadOpen && (
        <div
          className="modal-overlay"
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 9999,
          }}
        >
          <div className="upload-modal">
            <button
              className="close-button"
              onClick={() => setIsUploadOpen(false)}
              type="button"
            >
              ✕
            </button>

            <h2>Share a moment</h2>

            <p>Give your friends a little window into your day.</p>

            <form onSubmit={handlePost}>
              <label>Select a photo</label>

              <input type="file" name="photo" accept="image/*" required />

              <label>Caption</label>

              <textarea
                name="caption"
                placeholder="What is happening today?"
              />

              <label>Location (optional)</label>

              <input
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
