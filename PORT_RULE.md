# Port 3000 Rule

## 🚨 IMPORTANT: This project MUST run on localhost:3000

### Why Port 3000?
- **Consistency**: All development should happen on the same port
- **Browser Bookmarks**: Links and bookmarks expect localhost:3000
- **Documentation**: All references point to localhost:3000
- **Team Coordination**: Everyone should use the same port

### How to Start the Development Server

#### Option 1: Standard Start (Recommended)
```bash
npm run dev
```
This will automatically start on port 3000 and kill any existing processes.

#### Option 2: Force Start (If port is blocked)
```bash
npm run dev:force
```
This runs a script that forcefully kills any processes on port 3000 and 3001, then starts the server.

#### Option 3: Manual Port Management
```bash
# Kill any processes on port 3000
lsof -ti:3000 | xargs kill -9

# Start on port 3000
PORT=3000 npm run dev
```

### What Happens If Port 3000 is Occupied?

1. **First Attempt**: Next.js will try to find the next available port (3001, 3002, etc.)
2. **Our Rule**: We kill the process and force it to use port 3000
3. **Why**: Consistency across all development environments

### Troubleshooting

#### "Port 3000 is in use"
```bash
# Find what's using port 3000
lsof -i:3000

# Kill the process
lsof -ti:3000 | xargs kill -9

# Start the server
npm run dev
```

#### "Permission denied" when killing processes
```bash
# Use sudo if necessary (be careful!)
sudo lsof -ti:3000 | xargs kill -9
```

### Production Deployment
- Development: `localhost:3000`
- Production: Configure your hosting provider to use port 3000 or set up proper port mapping

### Remember
**Always use localhost:3000 for development. No exceptions!**
