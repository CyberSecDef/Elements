// Elements Periodic Table Client

class ElementsClient {
  constructor() {
    this.ws = null;
    this.elements = [];
    this.connected = false;
    this.currentTheme = 'auto';
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 5;
    this.selectedElements = new Set(); // Track selected elements for compound builder
    
    this.init();
  }

  async init() {
    this.setupTheme();
    this.setupWebSocket();
    await this.loadElements();
    this.renderPeriodicTable();
    this.setupEventHandlers();
    this.updateStatusBar();
  }

  setupTheme() {
    this.currentTheme = Utils.getSavedTheme();
    this.applyTheme();
    
    // Listen for system theme changes
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
      if (this.currentTheme === 'auto') {
        this.applyTheme();
      }
    });
  }

  applyTheme() {
    const effectiveTheme = this.currentTheme === 'auto' 
      ? Utils.getSystemTheme() 
      : this.currentTheme;
    
    document.body.setAttribute('data-theme', effectiveTheme);
    
    // Update theme toggle button if it exists
    const themeBtn = document.getElementById('themeToggle');
    if (themeBtn) {
      themeBtn.textContent = effectiveTheme === 'dark' ? '☀️' : '🌙';
    }
  }

  toggleTheme() {
    const themes = ['light', 'dark', 'auto'];
    const currentIndex = themes.indexOf(this.currentTheme);
    this.currentTheme = themes[(currentIndex + 1) % themes.length];
    Utils.saveTheme(this.currentTheme);
    this.applyTheme();
  }

  setupWebSocket() {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}`;
    
    this.ws = new WebSocket(wsUrl);
    
    this.ws.onopen = () => {
      console.log('WebSocket connected');
      this.connected = true;
      this.reconnectAttempts = 0;
      this.updateConnectionStatus(true);
    };
    
    this.ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        this.handleMessage(data);
      } catch (error) {
        console.error('Failed to parse WebSocket message:', error);
      }
    };
    
    this.ws.onclose = () => {
      console.log('WebSocket disconnected');
      this.connected = false;
      this.updateConnectionStatus(false);
      this.attemptReconnect();
    };
    
    this.ws.onerror = (error) => {
      console.error('WebSocket error:', error);
    };
  }

  attemptReconnect() {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;
      const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts), 30000);
      console.log(`Reconnecting in ${delay/1000}s... (attempt ${this.reconnectAttempts})`);
      setTimeout(() => this.setupWebSocket(), delay);
    }
  }

  handleMessage(data) {
    switch (data.type) {
      case MessageTypes.WELCOME:
        console.log('Welcome message received:', data.payload);
        break;
        
      case MessageTypes.CLIENT_COUNT:
        this.updateClientCount(data.payload.count);
        break;
        
      case MessageTypes.ELEMENT_DATA:
        if (data.payload) {
          this.showElementModal(data.payload);
        }
        break;
        
      case MessageTypes.SEARCH_RESULTS:
        this.displaySearchResults(data.payload);
        break;
        
      case MessageTypes.PONG:
        console.log('Pong received');
        break;
    }
  }

  async loadElements() {
    try {
      const response = await fetch('/api/elements');
      this.elements = await response.json();
      console.log(`Loaded ${this.elements.length} elements`);
    } catch (error) {
      console.error('Failed to load elements:', error);
      this.elements = [];
    }
  }

  renderPeriodicTable() {
    const container = document.getElementById('periodicTable');
    if (!container) return;
    
    container.innerHTML = '';
    
    // Create the main periodic table grid (7 periods x 18 groups)
    const mainGrid = document.createElement('div');
    mainGrid.className = 'periodic-table-grid';
    
    // Add all elements to their positions
    this.elements.forEach(element => {
      if (element.category !== 'lanthanide' && element.category !== 'actinide') {
        const elementCard = this.createElementCard(element);
        mainGrid.appendChild(elementCard);
      }
    });
    
    container.appendChild(mainGrid);
    
    // Create lanthanides and actinides rows
    const fBlock = document.createElement('div');
    fBlock.className = 'f-block-container';
    
    const lanthanides = this.elements.filter(el => el.category === 'lanthanide');
    const actinides = this.elements.filter(el => el.category === 'actinide');
    
    if (lanthanides.length > 0) {
      const lanthRow = this.createFBlockRow('Lanthanides', lanthanides);
      fBlock.appendChild(lanthRow);
    }
    
    if (actinides.length > 0) {
      const actRow = this.createFBlockRow('Actinides', actinides);
      fBlock.appendChild(actRow);
    }
    
    container.appendChild(fBlock);
  }

  createElementCard(element) {
    const card = document.createElement('div');
    card.className = 'element-card selectable';
    card.setAttribute('data-atomic-number', element.atomicNumber);
    card.setAttribute('data-category', element.category || 'unknown');
    card.style.setProperty('--category-color', Utils.getCategoryColor(element.category));
    
    // Position the card in the grid
    if (element.period && element.group) {
      card.style.gridRow = element.period;
      card.style.gridColumn = element.group;
    }
    
    card.innerHTML = `
      <div class="element-number">${element.atomicNumber}</div>
      <div class="element-symbol">${element.symbol}</div>
      <div class="element-name">${element.name}</div>
      <div class="element-weight">${Utils.formatNumber(element.atomicWeight?.value, 3)}</div>
    `;
    
    // Single click for selection
    card.addEventListener('click', (e) => this.onElementClick(element, card, e));
    
    // Double click for details modal
    card.addEventListener('dblclick', (e) => this.onElementDoubleClick(element, e));
    
    return card;
  }

  createFBlockRow(label, elements) {
    const row = document.createElement('div');
    row.className = 'f-block-row';
    
    const labelDiv = document.createElement('div');
    labelDiv.className = 'f-block-label';
    labelDiv.textContent = label;
    row.appendChild(labelDiv);
    
    const elementsContainer = document.createElement('div');
    elementsContainer.className = 'f-block-elements';
    
    elements.forEach(element => {
      const card = this.createElementCard(element);
      elementsContainer.appendChild(card);
    });
    
    row.appendChild(elementsContainer);
    return row;
  }

  onElementClick(element, card, event) {
    // Single click always toggles selection for compound builder
    this.toggleElementSelection(element, card);
  }

  onElementDoubleClick(element, event) {
    // Double click shows the element details modal
    event.preventDefault();
    event.stopPropagation();
    
    if (this.connected && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({
        type: MessageTypes.GET_ELEMENT,
        payload: { atomicNumber: element.atomicNumber }
      }));
    } else {
      this.showElementModal(element);
    }
  }

  toggleElementSelection(element, card) {
    if (this.selectedElements.has(element.atomicNumber)) {
      // Deselect
      this.selectedElements.delete(element.atomicNumber);
      card.classList.remove('selected');
    } else {
      // Select with default count of 1
      this.selectedElements.add(element.atomicNumber);
      card.classList.add('selected');
    }
    
    this.updateSelectedElementsDisplay();
  }

  updateSelectedElementsDisplay() {
    const listElement = document.getElementById('selectedElementsList');
    const buildBtn = document.getElementById('buildCompoundBtn');
    const clearBtn = document.getElementById('clearSelectionBtn');
    
    if (!listElement) return;
    
    if (this.selectedElements.size === 0) {
      listElement.innerHTML = '<span class="text-muted">Click on elements below to select them</span>';
      if (buildBtn) buildBtn.disabled = true;
      if (clearBtn) clearBtn.disabled = true;
    } else {
      const selectedElementsArray = Array.from(this.selectedElements)
        .sort((a, b) => a - b)
        .map(atomicNum => {
          const el = this.elements.find(e => e.atomicNumber === atomicNum);
          return el;
        })
        .filter(el => el);
      
      // Create input boxes for each element
      let html = '';
      selectedElementsArray.forEach(el => {
        html += `
          <div class="element-count-input">
            <span class="element-symbol-badge">${el.symbol}</span>
            <input 
              type="number" 
              min="1" 
              max="99" 
              value="1" 
              id="count-${el.atomicNumber}"
              data-atomic-number="${el.atomicNumber}"
              class="element-count-field"
            />
            <label for="count-${el.atomicNumber}">${el.name}</label>
          </div>
        `;
      });
      
      listElement.innerHTML = html;
      if (buildBtn) buildBtn.disabled = this.selectedElements.size < 2;
      if (clearBtn) clearBtn.disabled = false;
    }
  }

  clearElementSelection() {
    this.selectedElements.clear();
    
    const cards = document.querySelectorAll('.element-card.selected');
    cards.forEach(card => card.classList.remove('selected'));
    
    this.updateSelectedElementsDisplay();
  }

  showElementModal(element) {
    const modal = document.getElementById('elementModal');
    if (!modal) return;
    
    const modalTitle = modal.querySelector('.modal-title');
    const modalBody = modal.querySelector('.modal-body');
    
    modalTitle.innerHTML = `
      <span class="element-symbol-large" style="color: ${Utils.getCategoryColor(element.category)}">${element.symbol}</span>
      <span>${element.name}</span>
    `;
    
    modalBody.innerHTML = this.generateElementDetails(element);
    
    // Show modal using Bootstrap
    const bsModal = new bootstrap.Modal(modal);
    bsModal.show();

    // Draw spectrum after modal is shown (wait for canvas to be in DOM)
    setTimeout(() => {
      if (element.spectralLines && element.spectralLines.length > 0) {
        this.drawSpectrum(element.spectralLines);
      }
    }, 100);
  }

  drawSpectrum(spectralLines) {
    const canvas = document.getElementById('spectrumCanvas');
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    const width = canvas.width;
    const height = canvas.height;

    // Clear canvas
    ctx.clearRect(0, 0, width, height);

    // Define visible spectrum range
    const minWavelength = 380; // nm (violet)
    const maxWavelength = 780; // nm (red)
    const spectrumRange = maxWavelength - minWavelength;

    // Draw continuous spectrum background
    for (let x = 0; x < width; x++) {
      const wavelength = minWavelength + (x / width) * spectrumRange;
      const color = Utils.wavelengthToRGB(wavelength);
      ctx.fillStyle = color.css;
      ctx.fillRect(x, 0, 1, height);
    }

    // Draw absorption lines (dark bands) for visible spectral lines
    ctx.fillStyle = 'rgba(0, 0, 0, 0.85)'; // Dark absorption lines
    
    spectralLines.forEach(line => {
      const wavelength = line.wavelength_nm;
      
      // Only draw if in visible spectrum
      if (Utils.isVisibleSpectrum(wavelength)) {
        // Calculate position
        const position = (wavelength - minWavelength) / spectrumRange;
        const x = position * width;
        
        // Draw a dark band (absorption line)
        // Width represents line width (broader for stronger lines)
        const lineWidth = 3; // pixels
        ctx.fillRect(x - lineWidth / 2, 0, lineWidth, height);
        
        // Draw wavelength label below for visible lines
        ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
        ctx.font = '9px monospace';
        ctx.textAlign = 'center';
        ctx.fillText(wavelength.toFixed(0), x, height - 5);
        ctx.fillStyle = 'rgba(0, 0, 0, 0.85)';
      }
    });

    // Draw border
    ctx.strokeStyle = 'rgba(128, 128, 128, 0.5)';
    ctx.lineWidth = 1;
    ctx.strokeRect(0, 0, width, height);

    // Add wavelength markers at edges
    ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
    ctx.font = '11px sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('380 nm', 5, 15);
    ctx.textAlign = 'right';
    ctx.fillText('780 nm', width - 5, 15);
  }

  generateElementDetails(el) {
    return `
      <div class="element-details">
        <div class="detail-section">
          <h5>Basic Information</h5>
          <table class="table table-sm">
            <tr><td><strong>Atomic Number:</strong></td><td>${el.atomicNumber}</td></tr>
            <tr><td><strong>Symbol:</strong></td><td>${el.symbol}</td></tr>
            <tr><td><strong>Atomic Weight:</strong></td><td>${el.atomicWeight?.value} ${el.atomicWeight?.units || ''}</td></tr>
            <tr><td><strong>Category:</strong></td><td>${Utils.getCategoryLabel(el.category)}</td></tr>
            <tr><td><strong>Group:</strong></td><td>${el.group || 'N/A'}</td></tr>
            <tr><td><strong>Period:</strong></td><td>${el.period || 'N/A'}</td></tr>
            <tr><td><strong>Block:</strong></td><td>${Utils.getBlockName(el.block)}</td></tr>
            ${el.standardState ? `<tr><td><strong>Standard State:</strong></td><td>${el.standardState}</td></tr>` : ''}
          </table>
        </div>

        ${el.atomicRadius ? `
        <div class="detail-section">
          <h5>Atomic Radius</h5>
          <table class="table table-sm">
            ${el.atomicRadius.covalent ? `<tr><td><strong>Covalent Radius:</strong></td><td>${el.atomicRadius.covalent.value} ${el.atomicRadius.covalent.units}${el.atomicRadius.covalent.note ? ` <small class="text-muted">(${el.atomicRadius.covalent.note})</small>` : ''}</td></tr>` : ''}
            ${el.atomicRadius.vanDerWaals ? `<tr><td><strong>Van der Waals Radius:</strong></td><td>${el.atomicRadius.vanDerWaals.value} ${el.atomicRadius.vanDerWaals.units}${el.atomicRadius.vanDerWaals.note ? ` <small class="text-muted">(${el.atomicRadius.vanDerWaals.note})</small>` : ''}</td></tr>` : ''}
          </table>
        </div>
        ` : ''}

        <div class="detail-section">
          <h5>Electronic Structure</h5>
          <table class="table table-sm">
            <tr><td><strong>Electron Configuration:</strong></td><td>${el.electronConfiguration || 'N/A'}</td></tr>
            <tr><td><strong>Oxidation States:</strong></td><td>${Utils.formatOxidationStates(el.oxidationStates)}</td></tr>
          </table>
        </div>

        ${el.spectralLines && el.spectralLines.length > 0 ? `
        <div class="detail-section">
          <h5>Spectral Lines</h5>
          <div class="spectral-display">
            <canvas id="spectrumCanvas" width="600" height="80"></canvas>
            <div class="spectral-legend">
              <small class="text-muted">Visible spectrum (380-780 nm) with absorption lines</small>
            </div>
          </div>
          <table class="table table-sm mt-3">
            <thead>
              <tr>
                <th>Wavelength (nm)</th>
                <th>Series</th>
                <th>Transition</th>
                <th>Visible</th>
              </tr>
            </thead>
            <tbody>
              ${el.spectralLines.slice(0, 8).map(line => `
                <tr>
                  <td>${line.wavelength_nm.toFixed(2)}</td>
                  <td>${line.series}</td>
                  <td>${line.transition || 'N/A'}</td>
                  <td>${Utils.isVisibleSpectrum(line.wavelength_nm) ? 
                    `<span class="spectral-dot" style="background-color: ${Utils.wavelengthToRGB(line.wavelength_nm).css}"></span>` : 
                    '<span class="text-muted">UV/IR</span>'}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
        ` : ''}

        ${el.meltingPoint || el.boilingPoint ? `
        <div class="detail-section">
          <h5>Phase Transition Temperatures</h5>
          <table class="table table-sm">
            ${el.meltingPoint ? `<tr><td><strong>Melting Point:</strong></td><td>${Utils.formatTemperature(el.meltingPoint.value)}${el.meltingPoint.conditions ? ` <small class="text-muted">(${el.meltingPoint.conditions})</small>` : ''}</td></tr>` : ''}
            ${el.boilingPoint ? `<tr><td><strong>Boiling Point:</strong></td><td>${Utils.formatTemperature(el.boilingPoint.value)}${el.boilingPoint.conditions ? ` <small class="text-muted">(${el.boilingPoint.conditions})</small>` : ''}</td></tr>` : ''}
            ${el.triplePoint ? `<tr><td><strong>Triple Point:</strong></td><td>T: ${el.triplePoint.temperature.value} ${el.triplePoint.temperature.units}, P: ${el.triplePoint.pressure.value} ${el.triplePoint.pressure.units}</td></tr>` : ''}
            ${el.crystalStructure ? `<tr><td><strong>Crystal Structure:</strong></td><td>${el.crystalStructure}</td></tr>` : ''}
          </table>
        </div>
        ` : ''}

        ${el.density ? `
        <div class="detail-section">
          <h5>Density</h5>
          <table class="table table-sm">
            ${el.density.solid ? `<tr><td><strong>Solid:</strong></td><td>${el.density.solid.value || (el.density.solid.valueRange ? el.density.solid.valueRange.join('-') : 'N/A')} ${el.density.solid.units}${el.density.solid.conditions ? ` <br><small class="text-muted">${el.density.solid.conditions}</small>` : ''}</td></tr>` : ''}
            ${el.density.liquid ? `<tr><td><strong>Liquid:</strong></td><td>${el.density.liquid.value || (el.density.liquid.valueRange ? el.density.liquid.valueRange.join('-') : 'N/A')} ${el.density.liquid.units}${el.density.liquid.conditions ? ` <br><small class="text-muted">${el.density.liquid.conditions}</small>` : ''}</td></tr>` : ''}
            ${el.density.gas ? `<tr><td><strong>Gas:</strong></td><td>${el.density.gas.value || (el.density.gas.valueRange ? el.density.gas.valueRange.join('-') : 'N/A')} ${el.density.gas.units}${el.density.gas.conditions ? ` <br><small class="text-muted">${el.density.gas.conditions}</small>` : ''}</td></tr>` : ''}
          </table>
        </div>
        ` : ''}

        ${el.specificHeat ? `
        <div class="detail-section">
          <h5>Specific Heat Capacity</h5>
          <table class="table table-sm">
            ${el.specificHeat.solid ? `<tr><td><strong>Solid:</strong></td><td>${el.specificHeat.solid.value || (el.specificHeat.solid.valueRange ? el.specificHeat.solid.valueRange.join('-') : 'N/A')} ${el.specificHeat.solid.units}${el.specificHeat.solid.conditions ? ` <br><small class="text-muted">${el.specificHeat.solid.conditions}</small>` : ''}</td></tr>` : ''}
            ${el.specificHeat.liquid ? `<tr><td><strong>Liquid:</strong></td><td>${el.specificHeat.liquid.value || (el.specificHeat.liquid.valueRange ? el.specificHeat.liquid.valueRange.join('-') : 'N/A')} ${el.specificHeat.liquid.units}${el.specificHeat.liquid.conditions ? ` <br><small class="text-muted">${el.specificHeat.liquid.conditions}</small>` : ''}</td></tr>` : ''}
            ${el.specificHeat.gas ? `<tr><td><strong>Gas:</strong></td><td>${el.specificHeat.gas.value || (el.specificHeat.gas.valueRange ? el.specificHeat.gas.valueRange.join('-') : 'N/A')} ${el.specificHeat.gas.units}${el.specificHeat.gas.conditions ? ` <br><small class="text-muted">${el.specificHeat.gas.conditions}</small>` : ''}</td></tr>` : ''}
          </table>
        </div>
        ` : ''}

        ${el.thermalConductivity ? `
        <div class="detail-section">
          <h5>Thermal Conductivity</h5>
          <table class="table table-sm">
            ${el.thermalConductivity.solid ? `<tr><td><strong>Solid:</strong></td><td>${el.thermalConductivity.solid.value || (el.thermalConductivity.solid.valueRange ? el.thermalConductivity.solid.valueRange.join('-') : 'N/A')} ${el.thermalConductivity.solid.units}${el.thermalConductivity.solid.conditions ? ` <br><small class="text-muted">${el.thermalConductivity.solid.conditions}</small>` : ''}</td></tr>` : ''}
            ${el.thermalConductivity.liquid ? `<tr><td><strong>Liquid:</strong></td><td>${el.thermalConductivity.liquid.value || (el.thermalConductivity.liquid.valueRange ? el.thermalConductivity.liquid.valueRange.join('-') : 'N/A')} ${el.thermalConductivity.liquid.units}${el.thermalConductivity.liquid.conditions ? ` <br><small class="text-muted">${el.thermalConductivity.liquid.conditions}</small>` : ''}</td></tr>` : ''}
            ${el.thermalConductivity.gas ? `<tr><td><strong>Gas:</strong></td><td>${el.thermalConductivity.gas.value || (el.thermalConductivity.gas.valueRange ? el.thermalConductivity.gas.valueRange.join('-') : 'N/A')} ${el.thermalConductivity.gas.units}${el.thermalConductivity.gas.conditions ? ` <br><small class="text-muted">${el.thermalConductivity.gas.conditions}</small>` : ''}</td></tr>` : ''}
          </table>
        </div>
        ` : ''}

        ${el.spectralLines && el.spectralLines.length > 0 ? `
        <div class="detail-section">
          <h5>Description</h5>
          <p class="element-description">${el.description}</p>
        </div>
        ` : ''}

        ${el.isotopes && el.isotopes.length > 0 ? `
        <div class="detail-section">
          <h5>Major Isotopes</h5>
          <table class="table table-sm">
            <thead>
              <tr>
                <th>Symbol</th>
                <th>Name</th>
                <th>Stable</th>
                <th>Abundance</th>
              </tr>
            </thead>
            <tbody>
              ${el.isotopes.slice(0, 5).map(iso => `
                <tr>
                  <td>${iso.symbol}</td>
                  <td>${iso.name || '-'}</td>
                  <td>${iso.stable ? '✓' : '✗'}</td>
                  <td>${iso.naturalAbundance_percent ? iso.naturalAbundance_percent + '%' : 'trace'}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
        ` : ''}

        ${el.cost ? `
        <div class="detail-section">
          <h5>Economic Information</h5>
          <table class="table table-sm">
            <tr><td><strong>Units:</strong></td><td>${el.cost.units || 'N/A'}</td></tr>
            ${el.cost.value !== null && el.cost.value !== undefined ? `<tr><td><strong>Value:</strong></td><td>${el.cost.value}</td></tr>` : ''}
            ${el.cost.note ? `<tr><td colspan="2"><small class="text-muted">${el.cost.note}</small></td></tr>` : ''}
          </table>
        </div>
        ` : ''}
      </div>
    `;
  }

  setupEventHandlers() {
    // Theme toggle
    const themeToggle = document.getElementById('themeToggle');
    if (themeToggle) {
      themeToggle.addEventListener('click', () => this.toggleTheme());
    }

    // Search functionality
    const searchInput = document.getElementById('searchInput');
    if (searchInput) {
      searchInput.addEventListener('input', Utils.debounce((e) => {
        this.performSearch(e.target.value);
      }, 300));
    }

    // Category filter
    const categoryFilter = document.getElementById('categoryFilter');
    if (categoryFilter) {
      categoryFilter.addEventListener('change', (e) => {
        this.filterByCategory(e.target.value);
      });
    }

    // Clear filters
    const clearFilters = document.getElementById('clearFilters');
    if (clearFilters) {
      clearFilters.addEventListener('click', () => {
        this.clearAllFilters();
      });
    }

    // Compound builder buttons
    const buildCompoundBtn = document.getElementById('buildCompoundBtn');
    if (buildCompoundBtn) {
      buildCompoundBtn.addEventListener('click', () => {
        this.buildCompound();
      });
    }

    const clearSelectionBtn = document.getElementById('clearSelectionBtn');
    if (clearSelectionBtn) {
      clearSelectionBtn.addEventListener('click', () => {
        this.clearElementSelection();
      });
    }
  }

  performSearch(query) {
    if (!query || query.length < 2) {
      this.clearHighlights();
      return;
    }

    query = query.toLowerCase();
    const cards = document.querySelectorAll('.element-card');
    
    cards.forEach(card => {
      const element = this.elements.find(el => 
        el.atomicNumber === parseInt(card.getAttribute('data-atomic-number'))
      );
      
      if (element) {
        const matches = 
          element.name.toLowerCase().includes(query) ||
          element.symbol.toLowerCase().includes(query) ||
          element.atomicNumber.toString().includes(query);
        
        card.classList.toggle('search-match', matches);
        card.classList.toggle('search-fade', !matches);
      }
    });
  }

  filterByCategory(category) {
    const cards = document.querySelectorAll('.element-card');
    
    if (!category || category === 'all') {
      cards.forEach(card => card.classList.remove('filtered-out'));
      return;
    }
    
    cards.forEach(card => {
      const elementCategory = card.getAttribute('data-category');
      card.classList.toggle('filtered-out', elementCategory !== category);
    });
  }

  clearAllFilters() {
    this.clearHighlights();
    const cards = document.querySelectorAll('.element-card');
    cards.forEach(card => {
      card.classList.remove('search-match', 'search-fade', 'filtered-out');
    });
    
    const searchInput = document.getElementById('searchInput');
    if (searchInput) searchInput.value = '';
    
    const categoryFilter = document.getElementById('categoryFilter');
    if (categoryFilter) categoryFilter.value = 'all';
  }

  clearHighlights() {
    const cards = document.querySelectorAll('.element-card');
    cards.forEach(card => {
      card.classList.remove('search-match', 'search-fade');
    });
  }

  updateConnectionStatus(connected) {
    const dot = document.getElementById('connDot');
    const text = document.getElementById('connText');
    
    if (dot) {
      dot.className = `dot ${connected ? 'online' : 'offline'}`;
    }
    if (text) {
      text.textContent = connected ? 'Connected' : 'Disconnected';
    }
  }

  updateClientCount(count) {
    const clientCount = document.getElementById('clientCount');
    if (clientCount) {
      clientCount.textContent = count;
    }
  }

  updateStatusBar() {
    const elementCount = document.getElementById('elementCount');
    if (elementCount) {
      elementCount.textContent = this.elements.length;
    }
  }

  displaySearchResults(results) {
    console.log('Search results:', results);
    // Could implement a dropdown or highlight matching elements
  }

  // ===== Compound Builder Methods =====

  buildCompound() {
    if (this.selectedElements.size < 2) {
      alert('Please select at least 2 elements to build a compound.');
      return;
    }

    // Get element counts from input fields
    const elementCounts = [];
    const selectedElementsData = Array.from(this.selectedElements)
      .map(atomicNum => {
        const el = this.elements.find(e => e.atomicNumber === atomicNum);
        const countInput = document.getElementById(`count-${atomicNum}`);
        const count = countInput ? parseInt(countInput.value) || 1 : 1;
        
        if (el) {
          elementCounts.push({ element: el, count: count });
        }
        return el;
      })
      .filter(el => el);

    const analysis = this.analyzeCompound(selectedElementsData, elementCounts);
    this.showCompoundModal(analysis);
  }

  analyzeCompound(elements, userSpecifiedCounts = null) {
    // Sort elements by atomic number for consistency
    elements.sort((a, b) => a.atomicNumber - b.atomicNumber);
    
    // If user specified counts, test that specific formula first
    if (userSpecifiedCounts && userSpecifiedCounts.length > 0) {
      const userFormulaAnalysis = this.analyzeUserFormula(userSpecifiedCounts, elements);
      if (userFormulaAnalysis) {
        return userFormulaAnalysis;
      }
    }

    // Check for noble gases
    const nobleGases = elements.filter(el => el.category === 'noble gas');
    if (nobleGases.length > 0) {
      return {
        likelihood: 'unlikely',
        formulas: [],
        bondType: 'none',
        reason: `${nobleGases.map(el => el.name).join(', ')} ${nobleGases.length > 1 ? 'are' : 'is a'} noble gas${nobleGases.length > 1 ? 'es' : ''} with a complete valence shell and will not readily form compounds.`,
        elements: elements
      };
    }

    // Get electronegativity values
    const electronegativities = elements.map(el => ({
      element: el,
      en: Utils.getElectronegativity(el.atomicNumber)
    }));

    // Check if any element lacks electronegativity data
    const missingEN = electronegativities.filter(item => item.en === null);
    if (missingEN.length > 0) {
      return {
        likelihood: 'possible but unstable',
        formulas: [elements.map(el => el.symbol).join('')],
        bondType: 'unknown',
        reason: `Insufficient electronegativity data available for complete analysis.`,
        elements: elements
      };
    }

    // Calculate electronegativity difference for pairs
    const enDiffs = [];
    for (let i = 0; i < electronegativities.length - 1; i++) {
      for (let j = i + 1; j < electronegativities.length; j++) {
        enDiffs.push({
          pair: [electronegativities[i].element, electronegativities[j].element],
          diff: Math.abs(electronegativities[i].en - electronegativities[j].en)
        });
      }
    }

    const maxENDiff = Math.max(...enDiffs.map(d => d.diff));

    // Determine bond type based on electronegativity difference
    let bondType;
    if (maxENDiff > 1.7) {
      bondType = 'ionic';
    } else if (maxENDiff > 0.4) {
      bondType = 'polar covalent';
    } else {
      bondType = 'nonpolar covalent';
    }

    // For two-element compounds, try to balance charges
    if (elements.length === 2) {
      return this.analyzeBinaryCompound(elements[0], elements[1], bondType, maxENDiff);
    } else {
      // For multi-element compounds, provide basic analysis
      return this.analyzeMultiElementCompound(elements, bondType, maxENDiff);
    }
  }

  analyzeBinaryCompound(element1, element2, bondType, enDiff) {
    const formulas = [];
    let likelihood = 'possible but unstable';
    let reason = '';

    // Get oxidation states
    const ox1 = element1.oxidationStates || [0];
    const ox2 = element2.oxidationStates || [0];

    // Filter out zero oxidation states for compound formation
    const nonZeroOx1 = ox1.filter(ox => ox !== 0);
    const nonZeroOx2 = ox2.filter(ox => ox !== 0);

    if (nonZeroOx1.length === 0 || nonZeroOx2.length === 0) {
      return {
        likelihood: 'unlikely',
        formulas: [],
        bondType: bondType,
        reason: `One or both elements lack non-zero oxidation states needed for compound formation.`,
        elements: [element1, element2],
        enDiff: enDiff
      };
    }

    // Try to find balanced formulas
    for (const ox_a of nonZeroOx1) {
      for (const ox_b of nonZeroOx2) {
        // Skip if both have same sign
        if ((ox_a > 0 && ox_b > 0) || (ox_a < 0 && ox_b < 0)) continue;

        const abs_a = Math.abs(ox_a);
        const abs_b = Math.abs(ox_b);

        // Find least common multiple
        const gcd = this.gcd(abs_a, abs_b);
        const subscript_a = abs_b / gcd;
        const subscript_b = abs_a / gcd;

        const formula = subscript_a === 1 && subscript_b === 1
          ? `${element1.symbol}${element2.symbol}`
          : subscript_a === 1
            ? `${element1.symbol}${element2.symbol}${subscript_b}`
            : subscript_b === 1
              ? `${element1.symbol}${subscript_a}${element2.symbol}`
              : `${element1.symbol}${subscript_a}${element2.symbol}${subscript_b}`;

        formulas.push({
          formula: formula,
          oxidationStates: `${element1.symbol}: ${ox_a > 0 ? '+' : ''}${ox_a}, ${element2.symbol}: ${ox_b > 0 ? '+' : ''}${ox_b}`
        });
      }
    }

    // Assess likelihood
    if (formulas.length === 0) {
      likelihood = 'unlikely';
      reason = 'Unable to balance charges with available oxidation states.';
    } else if (bondType === 'ionic' && enDiff > 2.0) {
      likelihood = 'likely';
      reason = `Strong ionic bonding expected with electronegativity difference of ${enDiff.toFixed(2)}. Charges balance well.`;
    } else if (bondType === 'ionic') {
      likelihood = 'likely';
      reason = `Ionic bonding expected with electronegativity difference of ${enDiff.toFixed(2)}. Stable compound likely.`;
    } else if (bondType === 'polar covalent') {
      likelihood = 'likely';
      reason = `Polar covalent bonding with electronegativity difference of ${enDiff.toFixed(2)}. Stable molecular compound.`;
    } else {
      likelihood = 'likely';
      reason = `Covalent bonding with electronegativity difference of ${enDiff.toFixed(2)}. Stable compound expected.`;
    }

    // Check for common stable compounds
    const commonCompounds = this.checkCommonCompounds(element1, element2, formulas);
    if (commonCompounds) {
      likelihood = 'likely';
      reason = `${commonCompounds} ${reason}`;
    }

    return {
      likelihood: likelihood,
      formulas: formulas,
      bondType: bondType,
      reason: reason,
      elements: [element1, element2],
      enDiff: enDiff
    };
  }

  analyzeMultiElementCompound(elements, bondType, maxENDiff) {
    // For compounds with 3+ elements, try to find balanced formulas
    const formulas = [];
    
    // Get oxidation states for all elements
    const elementOxStates = elements.map(el => ({
      element: el,
      oxStates: (el.oxidationStates || [0]).filter(ox => ox !== 0)
    }));
    
    // Check if all elements have non-zero oxidation states
    const missingOxStates = elementOxStates.filter(item => item.oxStates.length === 0);
    if (missingOxStates.length > 0) {
      return {
        likelihood: 'unlikely',
        formulas: [],
        bondType: bondType,
        reason: `${missingOxStates.map(item => item.element.name).join(', ')} lack${missingOxStates.length === 1 ? 's' : ''} non-zero oxidation states needed for compound formation.`,
        elements: elements,
        enDiff: maxENDiff
      };
    }
    
    // Try different combinations of atoms (1-12 of each)
    const maxAtoms = 12;
    const maxFormulas = 50; // Limit number of formulas to test
    let testedCount = 0;
    
    // For each element, pick the most common oxidation state (smallest absolute value that's non-zero)
    const preferredOxStates = elementOxStates.map(item => {
      // Sort by absolute value, prefer positive over negative if tied
      const sorted = [...item.oxStates].sort((a, b) => {
        const absA = Math.abs(a);
        const absB = Math.abs(b);
        if (absA !== absB) return absA - absB;
        return b - a; // Prefer positive
      });
      return {
        element: item.element,
        preferredOx: sorted[0],
        allOxStates: item.oxStates
      };
    });
    
    // Generate combinations - try to balance charges
    // Use a recursive approach to find charge-balanced combinations
    const findBalancedFormulas = (elementIndex, currentCounts, currentCharge) => {
      if (testedCount >= maxFormulas) return;
      
      if (elementIndex === elements.length) {
        // Check if we have a balanced formula (total charge = 0)
        if (currentCharge === 0 && currentCounts.some(c => c > 0)) {
          const formulaParts = [];
          let oxStateInfo = [];
          
          for (let i = 0; i < elements.length; i++) {
            if (currentCounts[i] > 0) {
              const count = currentCounts[i];
              formulaParts.push(
                elements[i].symbol + (count > 1 ? count : '')
              );
              oxStateInfo.push(
                `${elements[i].symbol}: ${preferredOxStates[i].preferredOx > 0 ? '+' : ''}${preferredOxStates[i].preferredOx} (×${count})`
              );
            }
          }
          
          if (formulaParts.length >= 2) { // Need at least 2 different elements
            formulas.push({
              formula: formulaParts.join(''),
              oxidationStates: oxStateInfo.join(', ')
            });
            testedCount++;
          }
        }
        return;
      }
      
      // Try different counts for current element (0 to maxAtoms)
      const element = preferredOxStates[elementIndex];
      const oxState = element.preferredOx;
      
      for (let count = 0; count <= maxAtoms && testedCount < maxFormulas; count++) {
        const newCounts = [...currentCounts];
        newCounts[elementIndex] = count;
        const newCharge = currentCharge + (oxState * count);
        
        // Prune: if we've assigned all elements and charge is too far from zero, skip
        if (elementIndex === elements.length - 1) {
          if (newCharge === 0) {
            findBalancedFormulas(elementIndex + 1, newCounts, newCharge);
          }
        } else {
          // Continue if charge could potentially be balanced
          const remainingElements = elements.length - elementIndex - 1;
          const maxPossibleCorrection = remainingElements * maxAtoms * Math.max(
            ...preferredOxStates.slice(elementIndex + 1).map(e => Math.abs(e.preferredOx))
          );
          
          if (Math.abs(newCharge) <= maxPossibleCorrection) {
            findBalancedFormulas(elementIndex + 1, newCounts, newCharge);
          }
        }
      }
    };
    
    // Start the recursive search
    findBalancedFormulas(0, new Array(elements.length).fill(0), 0);
    
    // If no formulas found with preferred oxidation states, try alternative oxidation states
    if (formulas.length === 0) {
      // Try simple binary-like combinations with different oxidation state pairs
      for (let i = 0; i < elements.length - 1 && formulas.length < 10; i++) {
        for (let j = i + 1; j < elements.length && formulas.length < 10; j++) {
          const el1 = elements[i];
          const el2 = elements[j];
          
          for (const ox1 of elementOxStates[i].oxStates) {
            for (const ox2 of elementOxStates[j].oxStates) {
              if ((ox1 > 0 && ox2 < 0) || (ox1 < 0 && ox2 > 0)) {
                const abs1 = Math.abs(ox1);
                const abs2 = Math.abs(ox2);
                const gcd = this.gcd(abs1, abs2);
                const count1 = abs2 / gcd;
                const count2 = abs1 / gcd;
                
                // Create a formula with these two elements
                const counts = new Array(elements.length).fill(0);
                counts[i] = count1;
                counts[j] = count2;
                
                const formulaParts = [];
                const oxStateInfo = [];
                for (let k = 0; k < elements.length; k++) {
                  if (counts[k] > 0) {
                    formulaParts.push(elements[k].symbol + (counts[k] > 1 ? counts[k] : ''));
                    oxStateInfo.push(`${elements[k].symbol}: ${counts[k] > 0 ? '+' : ''}${k === i ? ox1 : ox2} (×${counts[k]})`);
                  }
                }
                
                formulas.push({
                  formula: formulaParts.join(''),
                  oxidationStates: oxStateInfo.join(', ')
                });
              }
            }
          }
        }
      }
    }
    
    // Assess likelihood based on formulas found and electronegativity
    let likelihood, reason;
    
    if (formulas.length === 0) {
      likelihood = 'unlikely';
      reason = `Unable to find charge-balanced combinations with available oxidation states for ${elements.length} elements.`;
    } else if (formulas.length > 20) {
      likelihood = 'possible but unstable';
      reason = `Found ${formulas.length} possible charge-balanced formulas with max electronegativity difference of ${maxENDiff.toFixed(2)}. Multi-element compounds are often complex and may require specific conditions for stability.`;
    } else if (maxENDiff > 1.5 && formulas.length >= 1) {
      likelihood = 'possible but unstable';
      reason = `Found ${formulas.length} possible formula${formulas.length > 1 ? 's' : ''} with mixed ionic/covalent character (ΔEN = ${maxENDiff.toFixed(2)}). Complex multi-element compounds may form under specific conditions.`;
    } else {
      likelihood = 'possible but unstable';
      reason = `Found ${formulas.length} charge-balanced formula${formulas.length > 1 ? 's' : ''} with primarily covalent character (ΔEN = ${maxENDiff.toFixed(2)}). Multi-element organic/molecular compounds may be stable but require specific structural knowledge.`;
    }
    
    return {
      likelihood: likelihood,
      formulas: formulas.slice(0, 20), // Limit display to top 20
      bondType: bondType,
      reason: reason,
      elements: elements,
      enDiff: maxENDiff
    };
  }

  checkCommonCompounds(el1, el2, formulas) {
    // Check for some common, well-known stable compounds
    const commonPairs = {
      'H-O': 'Water (H₂O) is one of the most stable compounds.',
      'H-Cl': 'Hydrochloric acid (HCl) is a very stable compound.',
      'Na-Cl': 'Table salt (NaCl) is extremely stable.',
      'C-O': 'Carbon dioxide (CO₂) and carbon monoxide (CO) are stable.',
      'N-H': 'Ammonia (NH₃) is a stable compound.',
      'Ca-O': 'Calcium oxide (CaO) is a common stable compound.',
      'Mg-O': 'Magnesium oxide (MgO) is highly stable.',
      'Fe-O': 'Iron oxides (FeO, Fe₂O₃) are common and stable.',
      'Al-O': 'Aluminum oxide (Al₂O₃) is extremely stable.',
      'Si-O': 'Silicon dioxide (SiO₂) is very stable - quartz.',
      'H-N': 'Ammonia (NH₃) is stable.',
      'H-S': 'Hydrogen sulfide (H₂S) is a known compound.',
      'K-Cl': 'Potassium chloride (KCl) is stable.',
      'Ca-Cl': 'Calcium chloride (CaCl₂) is stable.'
    };

    const key1 = `${el1.symbol}-${el2.symbol}`;
    const key2 = `${el2.symbol}-${el1.symbol}`;

    return commonPairs[key1] || commonPairs[key2] || null;
  }

  gcd(a, b) {
    return b === 0 ? a : this.gcd(b, a % b);
  }

  analyzeUserFormula(elementCounts, elements) {
    // Sort by atomic number for consistency
    elementCounts.sort((a, b) => a.element.atomicNumber - b.element.atomicNumber);
    
    // Build formula string
    const formulaParts = elementCounts.map(ec => 
      ec.element.symbol + (ec.count > 1 ? ec.count : '')
    );
    const userFormula = formulaParts.join('');
    
    // Check for noble gases
    const nobleGases = elementCounts.filter(ec => ec.element.category === 'noble gas');
    if (nobleGases.length > 0) {
      return {
        likelihood: 'unlikely',
        formulas: [{ formula: userFormula, oxidationStates: 'User-specified formula' }],
        bondType: 'none',
        reason: `${nobleGases.map(ec => ec.element.name).join(', ')} ${nobleGases.length > 1 ? 'are' : 'is a'} noble gas${nobleGases.length > 1 ? 'es' : ''} with a complete valence shell and will not readily form compounds.`,
        elements: elements,
        userSpecified: true
      };
    }
    
    // Get electronegativity values
    const electronegativities = elementCounts.map(ec => ({
      element: ec.element,
      count: ec.count,
      en: Utils.getElectronegativity(ec.element.atomicNumber)
    }));
    
    const missingEN = electronegativities.filter(item => item.en === null);
    if (missingEN.length > 0) {
      return {
        likelihood: 'possible but unstable',
        formulas: [{ formula: userFormula, oxidationStates: 'User-specified formula' }],
        bondType: 'unknown',
        reason: `Insufficient electronegativity data available for complete analysis of your formula ${userFormula}.`,
        elements: elements,
        userSpecified: true
      };
    }
    
    // Calculate max electronegativity difference
    const enDiffs = [];
    for (let i = 0; i < electronegativities.length - 1; i++) {
      for (let j = i + 1; j < electronegativities.length; j++) {
        enDiffs.push({
          pair: [electronegativities[i].element, electronegativities[j].element],
          diff: Math.abs(electronegativities[i].en - electronegativities[j].en)
        });
      }
    }
    const maxENDiff = Math.max(...enDiffs.map(d => d.diff));
    
    // Determine bond type
    let bondType;
    if (maxENDiff > 1.7) {
      bondType = 'ionic';
    } else if (maxENDiff > 0.4) {
      bondType = 'polar covalent';
    } else {
      bondType = 'nonpolar covalent';
    }
    
    // Try to validate charge balance
    const chargeAnalysis = this.validateChargeBalance(elementCounts);
    
    let likelihood, reason;
    
    if (chargeAnalysis.balanced) {
      // Check if it's a known stable compound pattern
      const isCommonPattern = this.checkCommonPattern(elementCounts);
      
      if (isCommonPattern) {
        likelihood = 'likely';
        reason = `Your formula ${userFormula} is charge-balanced and matches known stable compound patterns. ${isCommonPattern}`;
      } else if (bondType === 'ionic' && maxENDiff > 1.7) {
        likelihood = 'likely';
        reason = `Your formula ${userFormula} is charge-balanced with strong ionic character (ΔEN = ${maxENDiff.toFixed(2)}). This suggests a stable ionic compound.`;
      } else if (maxENDiff > 0.4) {
        likelihood = 'likely';
        reason = `Your formula ${userFormula} is charge-balanced with ${bondType} bonding (ΔEN = ${maxENDiff.toFixed(2)}). This could form a stable compound.`;
      } else {
        likelihood = 'possible but unstable';
        reason = `Your formula ${userFormula} is charge-balanced but has weak electronegativity differences (ΔEN = ${maxENDiff.toFixed(2)}). May require specific molecular structure.`;
      }
    } else {
      likelihood = 'possible but unstable';
      reason = `Your formula ${userFormula} does not achieve perfect charge balance with common oxidation states. ${chargeAnalysis.reason} The compound may still exist but could be unstable or require unusual bonding.`;
    }
    
    return {
      likelihood: likelihood,
      formulas: [{
        formula: userFormula,
        oxidationStates: chargeAnalysis.oxidationStates || 'User-specified formula'
      }],
      bondType: bondType,
      reason: reason,
      elements: elements,
      enDiff: maxENDiff,
      userSpecified: true
    };
  }

  validateChargeBalance(elementCounts) {
    // Try to find oxidation states that balance
    const elementOxStates = elementCounts.map(ec => ({
      element: ec.element,
      count: ec.count,
      oxStates: (ec.element.oxidationStates || []).filter(ox => ox !== 0)
    }));
    
    // Check if all have oxidation states
    if (elementOxStates.some(eos => eos.oxStates.length === 0)) {
      return {
        balanced: false,
        reason: 'Some elements lack defined oxidation states.'
      };
    }
    
    // Try to find a combination that balances
    const findBalance = (index, currentCharge, selectedOxStates) => {
      if (index === elementOxStates.length) {
        return currentCharge === 0 ? selectedOxStates : null;
      }
      
      const current = elementOxStates[index];
      for (const oxState of current.oxStates) {
        const newCharge = currentCharge + (oxState * current.count);
        const result = findBalance(index + 1, newCharge, [
          ...selectedOxStates,
          { element: current.element, oxState: oxState, count: current.count }
        ]);
        if (result) return result;
      }
      return null;
    };
    
    const balancedStates = findBalance(0, 0, []);
    
    if (balancedStates) {
      const oxInfo = balancedStates.map(bs => 
        `${bs.element.symbol}: ${bs.oxState > 0 ? '+' : ''}${bs.oxState} (×${bs.count})`
      ).join(', ');
      
      return {
        balanced: true,
        oxidationStates: oxInfo
      };
    } else {
      return {
        balanced: false,
        reason: 'Could not find oxidation states that balance the total charge to zero.'
      };
    }
  }

  checkCommonPattern(elementCounts) {
    // Check for common compound patterns
    const formula = elementCounts.map(ec => 
      ec.element.symbol + (ec.count > 1 ? ec.count : '')
    ).join('');
    
    const commonFormulas = {
      'H2O': 'Water is one of the most stable and abundant compounds.',
      'H2O2': 'Hydrogen peroxide is a well-known oxidizer.',
      'NaCl': 'Table salt is extremely stable.',
      'CO2': 'Carbon dioxide is a stable and common gas.',
      'CO': 'Carbon monoxide is stable though toxic.',
      'NH3': 'Ammonia is a stable and important compound.',
      'CH4': 'Methane is a stable hydrocarbon.',
      'C2H6': 'Ethane is a stable hydrocarbon.',
      'C3H8': 'Propane is a stable fuel.',
      'C6H12O6': 'Glucose is a fundamental biological molecule.',
      'H2SO4': 'Sulfuric acid is a very stable strong acid.',
      'HCl': 'Hydrochloric acid is highly stable.',
      'HNO3': 'Nitric acid is a stable strong acid.',
      'CaCO3': 'Calcium carbonate (limestone) is very stable.',
      'NaOH': 'Sodium hydroxide is a stable strong base.',
      'KOH': 'Potassium hydroxide is a stable strong base.',
      'CaO': 'Calcium oxide (quicklime) is stable.',
      'MgO': 'Magnesium oxide is highly stable.',
      'Al2O3': 'Aluminum oxide (corundum) is extremely stable.',
      'SiO2': 'Silicon dioxide (quartz) is very stable.',
      'Fe2O3': 'Iron(III) oxide (rust) is stable.',
      'FeO': 'Iron(II) oxide is a known compound.',
      'CaCl2': 'Calcium chloride is stable.',
      'Na2SO4': 'Sodium sulfate is stable.',
      'K2CO3': 'Potassium carbonate is stable.',
      'C8H10N4O2': 'Caffeine - a stable alkaloid compound!'
    };
    
    return commonFormulas[formula] || null;
  }

  showCompoundModal(analysis) {
    const modal = document.getElementById('compoundModal');
    if (!modal) return;

    const modalBody = document.getElementById('compoundModalBody');
    if (!modalBody) return;

    // Generate modal content
    let content = '';

    // Likelihood badge
    const likelihoodClass = analysis.likelihood.includes('likely') && !analysis.likelihood.includes('un')
      ? 'likely'
      : analysis.likelihood.includes('possible')
        ? 'possible'
        : 'unlikely';

    content += `
      <div class="compound-likelihood ${likelihoodClass}">
        ${analysis.likelihood.toUpperCase()}
      </div>
    `;

    // Selected elements
    content += `
      <div class="mb-3">
        <h6 class="fw-bold">Selected Elements:</h6>
        <p>${analysis.elements.map(el => `${el.name} (${el.symbol})`).join(', ')}</p>
      </div>
    `;

    // Formulas
    if (analysis.formulas.length > 0) {
      content += `<div class="mb-3">
        <h6 class="fw-bold">Possible Formulas:</h6>`;
      
      analysis.formulas.slice(0, 5).forEach(f => {
        const formula = typeof f === 'string' ? f : f.formula;
        const oxStates = typeof f === 'object' ? f.oxidationStates : '';
        
        content += `
          <div class="compound-formula">
            ${this.formatChemicalFormula(formula)}
          </div>`;
        
        if (oxStates) {
          content += `<p class="text-muted small mb-2">${oxStates}</p>`;
        }
      });
      
      if (analysis.formulas.length > 5) {
        content += `<p class="text-muted small">...and ${analysis.formulas.length - 5} more possibilities</p>`;
      }
      
      content += `</div>`;
    }

    // Bond type
    content += `
      <div class="mb-3">
        <h6 class="fw-bold">Bond Type:</h6>
        <p class="text-capitalize">${analysis.bondType}</p>
      </div>
    `;

    // Electronegativity difference
    if (analysis.enDiff !== undefined) {
      content += `
        <div class="mb-3">
          <h6 class="fw-bold">Electronegativity Difference:</h6>
          <p>${analysis.enDiff.toFixed(2)}</p>
        </div>
      `;
    }

    // Reason/Analysis
    content += `
      <div class="mb-3">
        <h6 class="fw-bold">Analysis:</h6>
        <p>${analysis.reason}</p>
      </div>
    `;

    modalBody.innerHTML = content;

    // Show modal
    const bsModal = new bootstrap.Modal(modal);
    bsModal.show();
  }

  formatChemicalFormula(formula) {
    // Convert numbers to subscripts
    return formula.replace(/(\d+)/g, '<sub>$1</sub>');
  }
}

// Initialize the client when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  window.elementsClient = new ElementsClient();
});
