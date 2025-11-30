const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const path = require('path');
const fs = require('fs');

class ElementsServer {
  constructor(port = 3000) {
    this.port = port;
    this.app = express();
    this.server = http.createServer(this.app);
    this.wss = new WebSocket.Server({ server: this.server });
    this.elements = [];
    this.clients = new Set();
    
    this.loadElements();
    this.setupRoutes();
    this.setupWebSocket();
  }

  loadElements() {
    try {
      const dataPath = path.join(__dirname, '../data/elements.json');
      const rawData = fs.readFileSync(dataPath, 'utf8');
      this.elements = JSON.parse(rawData);
      console.log(`✓ Loaded ${this.elements.length} elements from database`);
    } catch (error) {
      console.error('Failed to load elements data:', error.message);
      this.elements = [];
    }
  }

  setupRoutes() {
    // Serve static files from public directory
    this.app.use(express.static(path.join(__dirname, '../public')));
    
    // API endpoint to get all elements
    this.app.get('/api/elements', (req, res) => {
      res.json(this.elements);
    });
    
    // API endpoint to get specific element by atomic number
    this.app.get('/api/elements/:atomicNumber', (req, res) => {
      const atomicNumber = parseInt(req.params.atomicNumber);
      const element = this.elements.find(el => el.atomicNumber === atomicNumber);
      
      if (element) {
        res.json(element);
      } else {
        res.status(404).json({ error: 'Element not found' });
      }
    });
    
    // API endpoint to search elements
    this.app.get('/api/search', (req, res) => {
      const query = req.query.q?.toLowerCase();
      if (!query) {
        return res.json([]);
      }
      
      const results = this.elements.filter(el => 
        el.name.toLowerCase().includes(query) ||
        el.symbol.toLowerCase().includes(query) ||
        el.atomicNumber.toString().includes(query)
      );
      
      res.json(results);
    });

    // API endpoint for statistics
    this.app.get('/api/stats', (req, res) => {
      res.json({
        totalElements: this.elements.length,
        connectedClients: this.clients.size,
        categories: this.getCategories(),
        timestamp: new Date().toISOString()
      });
    });
  }

  setupWebSocket() {
    this.wss.on('connection', (ws) => {
      console.log('New client connected');
      this.clients.add(ws);
      
      // Send welcome message with initial data
      ws.send(JSON.stringify({
        type: 'WELCOME',
        payload: {
          totalElements: this.elements.length,
          connectedClients: this.clients.size
        }
      }));
      
      // Broadcast client count update
      this.broadcastClientCount();
      
      ws.on('message', (message) => {
        try {
          const data = JSON.parse(message);
          this.handleMessage(ws, data);
        } catch (error) {
          console.error('Failed to parse message:', error.message);
        }
      });
      
      ws.on('close', () => {
        console.log('Client disconnected');
        this.clients.delete(ws);
        this.broadcastClientCount();
      });
      
      ws.on('error', (error) => {
        console.error('WebSocket error:', error.message);
      });
    });
  }

  handleMessage(ws, data) {
    switch (data.type) {
      case 'GET_ELEMENT':
        const element = this.elements.find(el => el.atomicNumber === data.payload.atomicNumber);
        ws.send(JSON.stringify({
          type: 'ELEMENT_DATA',
          payload: element || null
        }));
        break;
        
      case 'SEARCH':
        const query = data.payload.query.toLowerCase();
        const results = this.elements.filter(el => 
          el.name.toLowerCase().includes(query) ||
          el.symbol.toLowerCase().includes(query)
        );
        ws.send(JSON.stringify({
          type: 'SEARCH_RESULTS',
          payload: results
        }));
        break;
        
      case 'PING':
        ws.send(JSON.stringify({ type: 'PONG' }));
        break;
        
      default:
        console.log('Unknown message type:', data.type);
    }
  }

  broadcastClientCount() {
    const message = JSON.stringify({
      type: 'CLIENT_COUNT',
      payload: { count: this.clients.size }
    });
    
    this.clients.forEach(client => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(message);
      }
    });
  }

  getCategories() {
    const categories = {};
    this.elements.forEach(el => {
      const cat = el.category || 'unknown';
      categories[cat] = (categories[cat] || 0) + 1;
    });
    return categories;
  }

  start() {
    this.server.listen(this.port, () => {
      console.log(`╔════════════════════════════════════════════════════════╗`);
      console.log(`║                                                        ║`);
      console.log(`║           🧪 Elements Periodic Table Server            ║`);
      console.log(`║                                                        ║`);
      console.log(`╠════════════════════════════════════════════════════════╣`);
      console.log(`║  Server running at:  http://localhost:${this.port}            ║`);
      console.log(`║  WebSocket ready:    ws://localhost:${this.port}              ║`);
      console.log(`║  Elements loaded:    ${String(this.elements.length).padEnd(5, ' ')}                             ║`);
      console.log(`╚════════════════════════════════════════════════════════╝`);
    });
  }
}

// Start the server
if (require.main === module) {
  const port = process.env.PORT || 3000;
  const server = new ElementsServer(port);
  server.start();
}

module.exports = ElementsServer;
