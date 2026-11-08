
function App() {
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

        <button className="profile-button">My Profile</button>
      </header>

      {/* Main content */}
      <main className="main-container">

        <section className="feed">
          <div className="welcome">
            <p className="date">YOUR DAILY MOMENTS</p>
            <h2>A little window into everyone's day.</h2>
            <p>See what your friends are up to today.</p>
          </div>

          <div className="feed-header">
            <h2>Today's moments</h2>
            <button className="share-button">+ Share a moment</button>
          </div>

          {/* First photo card */}
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

          {/* Second photo card */}
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

            <p className="caption">
              Coffee, sunshine, and a slow morning.
            </p>
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
    </div>
  );
}

export default App;
