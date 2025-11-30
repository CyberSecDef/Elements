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
      // Select
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
      listElement.textContent = 'Click on elements below to select them';
      listElement.className = 'text-muted ms-2';
      if (buildBtn) buildBtn.disabled = true;
      if (clearBtn) clearBtn.disabled = true;
    } else {
      const selectedElementsArray = Array.from(this.selectedElements)
        .sort((a, b) => a - b)
        .map(atomicNum => {
          const el = this.elements.find(e => e.atomicNumber === atomicNum);
          return el ? el.symbol : atomicNum;
        });
      
      listElement.textContent = selectedElementsArray.join(', ');
      listElement.className = 'text-primary fw-bold ms-2';
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

    const selectedElementsData = Array.from(this.selectedElements)
      .map(atomicNum => this.elements.find(e => e.atomicNumber === atomicNum))
      .filter(el => el); // Filter out any undefined

    const analysis = this.analyzeCompound(selectedElementsData);
    this.showCompoundModal(analysis);
  }

  analyzeCompound(elements) {
    // Sort elements by atomic number for consistency
    elements.sort((a, b) => a.atomicNumber - b.atomicNumber);

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
    // For compounds with 3+ elements, provide general analysis
    const symbols = elements.map(el => el.symbol).join('');
    
    return {
      likelihood: 'possible but unstable',
      formulas: [{ formula: symbols, oxidationStates: 'Multiple oxidation states possible' }],
      bondType: 'mixed',
      reason: `Complex multi-element compound. Bond type varies with max electronegativity difference of ${maxENDiff.toFixed(2)}. Detailed stoichiometric analysis requires specific chemical knowledge.`,
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
