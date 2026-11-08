
import { useState } from "react";

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

  // Add a new post
  function handlePost(event) {
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

    const newPost = {
      id: Date.now(),
      image: URL.createObjectURL(photo),
      caption: caption,
      location: location,
      name: "You",
      time: "Just now",
    };

    setPosts((currentPosts) => [newPost, ...currentPosts]);

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
      (friend) => friend.name.toLowerCase() === name.toLowerCase()
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
      <nav className="navbar">
        <div className="logo">dayframe.</div>

        <div className="nav-links">
          <a href="#home">Home</a>
          <a href="#explore">Explore</a>
          <a href="#friends">Friends</a>
        </div>

        <button className="profile-button">
          My Profile
        </button>
      </nav>

      {/* Main content */}
      <main className="main-container">

        {/* Feed */}
        <section className="feed" id="home">

          <div className="welcome">
            <h1>Your day, one frame at a time.</h1>
            <p>
              A little snapshot of life, shared with the people
              who matter.
            </p>
          </div>

          <div className="feed-header">
            <h2>Recent moments</h2>

            <button
              className="share-button"
              onClick={() => setIsUploadOpen(true)}
            >
              + Share a moment
            </button>
          </div>

          {/* User-created posts */}
          {posts.map((post) => (
            <article className="photo-card" key={post.id}>
              <div className="photo-info">
                <div className="avatar">Y</div>

                <div>
                  <strong>{post.name}</strong>
                  <p>{post.time}</p>
                </div>
              </div>

              <img
                src={post.image}
                alt="Your uploaded moment"
                className="posted-image"
              />

              <div className="caption">
                {post.caption && <p>{post.caption}</p>}

                {post.location && (
                  <p className="location">
                    📍 {post.location}
                  </p>
                )}
              </div>
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

            <div className="caption">
              <p>
                Found a cute little coffee shop today.
              </p>
            </div>
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

            <div className="caption">
              <p>
                Finally got outside for a hike!
              </p>
            </div>
          </article>

        </section>

        {/* Friends sidebar */}
        <aside className="sidebar" id="friends">
          <h2>Your friends</h2>

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
                <div className="avatar">
                  {friend.name.charAt(0).toUpperCase()}
                </div>

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
              What's happening in your day?
            </p>

            <form onSubmit={handlePost}>
              <label>Choose a photo</label>

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
