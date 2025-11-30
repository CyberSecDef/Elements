# 🧪 Elements - Advanced Interactive Periodic Table

A modern, feature-rich web-based periodic table application built with Node.js, WebSocket, and Bootstrap. Explore comprehensive element data with real-time updates, dark/light themes, and responsive design for both desktop and mobile devices.

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![Node](https://img.shields.io/badge/node-%3E%3D18-brightgreen.svg)
![Status](https://img.shields.io/badge/status-active-success.svg)

## ✨ Features

### 🎨 **Modern UI/UX**
- **Dual Theme Support**: Automatic, light, and dark modes with smooth transitions
- **Responsive Design**: Optimized for desktop, tablet, and mobile devices
- **Bootstrap Integration**: Clean, professional interface using Bootstrap 5
- **Sticky Status Bar**: Real-time connection and statistics always visible

### 📊 **Comprehensive Element Data**
- 118+ chemical elements with detailed properties
- Atomic structure, physical properties, isotopes, and more
- Interactive element cards with category color-coding
- Modal system for detailed element information

### 🔌 **Real-Time Features**
- **WebSocket Support**: Live updates and real-time client count
- **Auto-Reconnect**: Graceful connection handling with exponential backoff
- **REST API**: Full HTTP endpoints for element data access

### 🔍 **Advanced Functionality**
- **Real-Time Search**: Filter elements by name, symbol, or atomic number
- **Category Filtering**: Filter by element categories (metals, nonmetals, etc.)
- **Visual Highlights**: Search matches and hover effects
- **F-Block Display**: Separate display for lanthanides and actinides

## 🚀 Quick Start

### Prerequisites
- Node.js 18 or higher
- npm (comes with Node.js)

### Installation

```bash
# Clone the repository
git clone https://github.com/yourusername/Elements.git
cd Elements

# Install dependencies
npm install

# Start the server
npm start
```

The application will be available at `http://localhost:3000`

### Development Mode

```bash
# Start with auto-reload on file changes
npm run dev
```

## 📁 Project Structure

```
Elements/
├── data/
│   └── elements.json          # Complete periodic table dataset
├── public/
│   ├── index.html            # Main HTML structure
│   ├── client.js             # Client-side JavaScript class
│   ├── shared.js             # Shared utilities and constants
│   ├── styles.css            # Comprehensive CSS with themes
│   └── jquery-3.7.1.min.js   # jQuery library
├── src/
│   └── server.js             # Node.js server with WebSocket
├── package.json              # Project dependencies
└── README.md                 # This file
```

## 🔧 Architecture

### Server-Side (`src/server.js`)
- **Express.js**: HTTP server and REST API
- **WebSocket (ws)**: Real-time bidirectional communication
- **Element Data Loading**: JSON-based element database
- **API Endpoints**:
  - `GET /api/elements` - Get all elements
  - `GET /api/elements/:atomicNumber` - Get specific element
  - `GET /api/search?q=query` - Search elements
  - `GET /api/stats` - Server statistics

### Client-Side (`public/client.js`)
- **ElementsClient Class**: Main client application
- **WebSocket Client**: Real-time server communication
- **Theme Management**: Auto/light/dark theme switching
- **Dynamic Rendering**: Periodic table grid generation
- **Event Handlers**: Search, filter, and UI interactions

### Shared Code (`public/shared.js`)
- **Constants**: Element categories, message types
- **Utilities**: Formatting, theme detection, calculations
- **Category Colors**: Visual coding for element types

## 🎨 Themes

The application supports three theme modes:
- **Light Mode**: Traditional bright interface
- **Dark Mode**: Eye-friendly dark interface
- **Auto Mode**: Matches system preference

Toggle themes using the button in the top-right corner or it will automatically detect your system preference.

## 📱 Responsive Design

Breakpoints:
- **Desktop**: 1400px+ (Full periodic table with all details)
- **Laptop**: 992px-1399px (Optimized element cards)
- **Tablet**: 768px-991px (Compact layout)
- **Mobile**: <768px (Touch-optimized, horizontal scroll)

## 🌐 WebSocket API

### Client → Server Messages

```javascript
// Get specific element
{
  type: 'GET_ELEMENT',
  payload: { atomicNumber: 1 }
}

// Search elements
{
  type: 'SEARCH',
  payload: { query: 'gold' }
}

// Ping/keepalive
{
  type: 'PING'
}
```

### Server → Client Messages

```javascript
// Welcome message
{
  type: 'WELCOME',
  payload: { totalElements: 118, connectedClients: 5 }
}

// Client count update
{
  type: 'CLIENT_COUNT',
  payload: { count: 6 }
}

// Element data response
{
  type: 'ELEMENT_DATA',
  payload: { /* element object */ }
}
```

## 📊 Element Data Schema

Each element in `data/elements.json` includes:

```json
{
  "name": "Hydrogen",
  "symbol": "H",
  "atomicNumber": 1,
  "atomicWeight": { "value": 1.008, "units": "u" },
  "atomicRadius": { 
    "covalent": { "value": 31, "units": "pm" },
    "vanDerWaals": { "value": 120, "units": "pm" }
  },
  "electronConfiguration": "1s1",
  "oxidationStates": [-1, 0, 1],
  "meltingPoint": { "value": 13.99, "units": "K" },
  "boilingPoint": { "value": 20.271, "units": "K" },
  "density": { /* solid, liquid, gas */ },
  "isotopes": [ /* isotope data */ ],
  "description": "...",
  "group": 1,
  "period": 1,
  "block": "s",
  "category": "diatomic nonmetal"
}
```

## 🎯 Element Categories

- **Alkali Metals** (red)
- **Alkaline Earth Metals** (yellow)
- **Transition Metals** (green)
- **Post-Transition Metals** (teal)
- **Metalloids** (light green)
- **Nonmetals** (blue)
- **Noble Gases** (pink)
- **Lanthanides** (orange)
- **Actinides** (red-pink)

## 🔒 Environment Variables

```bash
PORT=3000              # Server port (default: 3000)
NODE_ENV=development   # Environment mode
```

## 🛠️ Development

### Adding New Features
1. Server logic: `src/server.js`
2. Client logic: `public/client.js`
3. Shared utilities: `public/shared.js`
4. Styling: `public/styles.css`

### Modifying Element Data
Edit `data/elements.json` to add or update element information. The server will automatically reload the data.

## 📝 API Examples

### REST API

```bash
# Get all elements
curl http://localhost:3000/api/elements

# Get Hydrogen (atomic number 1)
curl http://localhost:3000/api/elements/1

# Search for elements
curl http://localhost:3000/api/search?q=gold

# Get server stats
curl http://localhost:3000/api/stats
```

### JavaScript WebSocket

```javascript
const ws = new WebSocket('ws://localhost:3000');

ws.onopen = () => {
  ws.send(JSON.stringify({
    type: 'GET_ELEMENT',
    payload: { atomicNumber: 79 } // Gold
  }));
};

ws.onmessage = (event) => {
  const data = JSON.parse(event.data);
  console.log(data);
};
```

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🙏 Acknowledgments

- Element data compiled from IUPAC and various scientific sources
- Bootstrap framework for UI components
- WebSocket protocol for real-time communication
- jQuery for DOM manipulation utilities

## 📧 Contact

Project Link: [https://github.com/CyberSecDef/Elements](https://github.com/CyberSecDef/Elements)

---

Made with ❤️ and ⚛️ by the Elements Team
