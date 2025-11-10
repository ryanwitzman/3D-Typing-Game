# Type Racer

A multiplayer typing racing game where players compete in real-time typing races with 3D car graphics. Race against other players and bots while improving your typing speed!

## Features

### Core Gameplay
- **Real-time Multiplayer Racing**: Race against up to 5 players simultaneously
- **3D Graphics**: Interactive 3D racing environment using Three.js
- **Smart Matchmaking**: Players are matched by WPM skill level (beginner, intermediate, advanced, expert)
- **AI Bots**: Intelligent bots fill empty slots and simulate realistic typing behavior
- **Dynamic Text Selection**: Race texts are automatically adjusted based on player skill level

### User Management
- **Authentication System**: Secure user registration and login with JWT tokens
- **User Profiles**: Track personal statistics and progress
- **Customization**: Choose from 8 different car colors
- **Race History**: View detailed history of all past races

### Statistics & Progress
- **WPM Tracking**: Real-time words-per-minute calculation
- **Accuracy Monitoring**: Track typing accuracy during races
- **Historical Data**:
  - Average WPM (based on last 10 races)
  - High score (best WPM)
  - Total races completed
  - Win/loss records
  - Detailed race history with timestamps

### Game Mechanics
- **Race States**: Waiting room → Countdown → Racing → Results
- **Live Progress Tracking**: See all racers' positions in real-time
- **Dynamic Bot Behavior**: Bots simulate realistic typing with errors and corrections
- **Finishing Positions**: Track 1st, 2nd, 3rd place, etc.

## Tech Stack

### Backend
- **Node.js** with Express.js
- **Socket.io** for real-time bidirectional communication
- **MongoDB** for user data and race history storage
- **JWT** for authentication

### Frontend
- **Vanilla JavaScript** (no framework)
- **Three.js** for 3D graphics and car animations
- **Socket.io Client** for real-time updates
- **CSS3** for styling

### Data
- Large CSV dataset (`typing_texts.csv`) with typing practice texts

## Prerequisites

- Node.js (v14 or higher)
- MongoDB Atlas account or local MongoDB instance
- npm or yarn package manager

## Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd typing-game
```

2. Install dependencies:
```bash
npm install
```

3. Create a `.env` file in the root directory:
```env
MONGO_DB_USER=your_mongodb_username
MONGO_DB_PASSWORD=your_mongodb_password
JWT_SECRET=your_secret_key_here
PORT=3000
```

4. Ensure your MongoDB connection string is correct in `database.js`:
```javascript
mongodb+srv://<username>:<password>@cluster0.xb2urf6.mongodb.net/
```

## Running the Application

1. Start the server:
```bash
npm start
```

2. Open your browser and navigate to:
```
http://localhost:3000
```

3. Create an account or login to start racing!

## Project Structure

```
typing-game/
├── server.js              # Main server file with game logic
├── database.js            # MongoDB database operations
├── package.json           # Project dependencies
├── typing_texts.csv       # Collection of typing practice texts
│
├── css/                   # Stylesheets
│   ├── common.css        # Shared styles
│   ├── auth.css          # Login/signup styles
│   ├── home.css          # Home page styles
│   ├── race.css          # Race page styles
│   └── races.css         # Race history page styles
│
├── js/                    # Client-side JavaScript
│   ├── auth.js           # Authentication logic
│   ├── home.js           # Home page functionality
│   ├── race.js           # Main race game logic
│   ├── game.js           # Game state management
│   ├── ui.js             # UI updates and interactions
│   ├── 3d-scene.js       # Three.js 3D graphics
│   └── races-page.js     # Race history page
│
└── HTML Pages
    ├── index.html        # Entry point (redirects to login/home)
    ├── login.html        # Login/signup page
    ├── home.html         # User dashboard
    ├── race.html         # Racing game interface
    └── races.html        # Race history viewer
```

## How It Works

### Game Flow

1. **Authentication**: Users create an account or log in
2. **Home Dashboard**: View stats, customize car color, start racing
3. **Matchmaking**: Server matches players by skill level (WPM)
4. **Waiting Room**: Wait for other players (bots fill remaining slots)
5. **Countdown**: 3-second countdown before race starts
6. **Racing**: Type the given text as fast and accurately as possible
7. **Results**: See finishing positions and updated statistics
8. **New Race**: Start a new race or return to home

### WPM Matchmaking Tiers

- **Beginner**: 0-30 WPM
- **Intermediate**: 30-50 WPM
- **Advanced**: 50-70 WPM
- **Expert**: 70+ WPM

### Bot System

- Bots are added automatically if fewer than 5 players join
- Bot typing speed matches the average WPM of human players in the race
- Bots simulate realistic behavior including:
  - Variable typing speed
  - Random typing errors (2-5% error rate)
  - Correction delays when errors occur

## API Endpoints

### Authentication
- `POST /api/signup` - Create new user account
- `POST /api/login` - Authenticate user
- `POST /api/verify` - Verify JWT token

### User Management
- `POST /api/changeColor` - Update car color
- `GET /api/leaderboard` - Get top players by WPM
- `GET /api/raceHistory/:username` - Get user's race history

### Socket Events

#### Client → Server
- `authenticate` - Authenticate and join race
- `typing` - Send typing progress
- `raceComplete` - Signal race completion
- `changeColor` - Change car color

#### Server → Client
- `init` - Initial game state
- `playerJoined` - New player joined
- `playerLeft` - Player disconnected
- `raceCountdown` - Countdown timer update
- `raceStart` - Race has started
- `playerTyping` - Player typing progress
- `raceFinished` - Player finished race
- `userStatsUpdated` - Updated user statistics

## Database Schema

### Users Collection
```javascript
{
  username: String,
  password: String,          // Should be hashed in production
  color: String,             // Hex color code
  highScore: Number,         // Best WPM
  totalRaces: Number,
  wins: Number,
  wpmHistory: [Number],      // Last 10 races
  averageWPM: Number,
  raceHistory: [{
    timestamp: Date,
    wpm: Number,
    accuracy: Number,
    position: Number         // 1st, 2nd, 3rd, etc.
  }],
  createdAt: Date
}
```

## Security Notes

**Important**: This is a development/demo project. For production use:

1. Hash passwords using bcrypt or similar
2. Use environment-specific JWT secrets
3. Implement rate limiting
4. Add input validation and sanitization
5. Use HTTPS
6. Implement CSRF protection
7. Add proper error handling

## Contributing

Feel free to submit issues, fork the repository, and create pull requests for any improvements.

## License

ISC
