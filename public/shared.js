// Shared constants and utilities for Elements Periodic Table

const ElementCategories = {
  'alkali metal': { color: '#ff6b6b', label: 'Alkali Metal' },
  'alkaline earth metal': { color: '#ffd93d', label: 'Alkaline Earth' },
  'transition metal': { color: '#6bcf7f', label: 'Transition Metal' },
  'post-transition metal': { color: '#95e1d3', label: 'Post-Transition' },
  'metalloid': { color: '#a8e6cf', label: 'Metalloid' },
  'diatomic nonmetal': { color: '#4ecdc4', label: 'Nonmetal' },
  'polyatomic nonmetal': { color: '#45aaf2', label: 'Nonmetal' },
  'noble gas': { color: '#c44569', label: 'Noble Gas' },
  'lanthanide': { color: '#f8b500', label: 'Lanthanide' },
  'actinide': { color: '#ee5a6f', label: 'Actinide' },
  'unknown': { color: '#95a5a6', label: 'Unknown' }
};

const MessageTypes = {
  WELCOME: 'WELCOME',
  CLIENT_COUNT: 'CLIENT_COUNT',
  GET_ELEMENT: 'GET_ELEMENT',
  ELEMENT_DATA: 'ELEMENT_DATA',
  SEARCH: 'SEARCH',
  SEARCH_RESULTS: 'SEARCH_RESULTS',
  PING: 'PING',
  PONG: 'PONG'
};

// Pauling Electronegativity Scale (0-4 scale)
// Values for elements 1-60 (H through Nd)
const ElectronegativityTable = {
  1: 2.20,   // H
  2: null,   // He (no value - noble gas)
  3: 0.98,   // Li
  4: 1.57,   // Be
  5: 2.04,   // B
  6: 2.55,   // C
  7: 3.04,   // N
  8: 3.44,   // O
  9: 3.98,   // F
  10: null,  // Ne (no value - noble gas)
  11: 0.93,  // Na
  12: 1.31,  // Mg
  13: 1.61,  // Al
  14: 1.90,  // Si
  15: 2.19,  // P
  16: 2.58,  // S
  17: 3.16,  // Cl
  18: null,  // Ar (no value - noble gas)
  19: 0.82,  // K
  20: 1.00,  // Ca
  21: 1.36,  // Sc
  22: 1.54,  // Ti
  23: 1.63,  // V
  24: 1.66,  // Cr
  25: 1.55,  // Mn
  26: 1.83,  // Fe
  27: 1.88,  // Co
  28: 1.91,  // Ni
  29: 1.90,  // Cu
  30: 1.65,  // Zn
  31: 1.81,  // Ga
  32: 2.01,  // Ge
  33: 2.18,  // As
  34: 2.55,  // Se
  35: 2.96,  // Br
  36: 3.00,  // Kr (revised value)
  37: 0.82,  // Rb
  38: 0.95,  // Sr
  39: 1.22,  // Y
  40: 1.33,  // Zr
  41: 1.60,  // Nb
  42: 2.16,  // Mo
  43: 1.90,  // Tc
  44: 2.20,  // Ru
  45: 2.28,  // Rh
  46: 2.20,  // Pd
  47: 1.93,  // Ag
  48: 1.69,  // Cd
  49: 1.78,  // In
  50: 1.96,  // Sn
  51: 2.05,  // Sb
  52: 2.10,  // Te
  53: 2.66,  // I
  54: 2.60,  // Xe (revised value)
  55: 0.79,  // Cs
  56: 0.89,  // Ba
  57: 1.10,  // La
  58: 1.12,  // Ce
  59: 1.13,  // Pr
  60: 1.14   // Nd
};

// Utility functions
const Utils = {
  formatNumber(num, decimals = 2) {
    if (num === null || num === undefined) return 'N/A';
    return typeof num === 'number' ? num.toFixed(decimals) : num;
  },

  formatTemperature(kelvin) {
    if (!kelvin) return 'N/A';
    const celsius = kelvin - 273.15;
    const fahrenheit = (celsius * 9/5) + 32;
    return `${kelvin} K (${celsius.toFixed(2)} °C, ${fahrenheit.toFixed(2)} °F)`;
  },

  getCategoryColor(category) {
    const cat = category?.toLowerCase() || 'unknown';
    return ElementCategories[cat]?.color || ElementCategories['unknown'].color;
  },

  getCategoryLabel(category) {
    const cat = category?.toLowerCase() || 'unknown';
    return ElementCategories[cat]?.label || 'Unknown';
  },

  getBlockName(block) {
    const blocks = {
      's': 's-block',
      'p': 'p-block',
      'd': 'd-block',
      'f': 'f-block'
    };
    return blocks[block] || block;
  },

  getElectronShells(electronConfig) {
    if (!electronConfig) return 'N/A';
    return electronConfig;
  },

  formatOxidationStates(states) {
    if (!states || !Array.isArray(states)) return 'N/A';
    return states.map(s => s > 0 ? `+${s}` : s).join(', ');
  },

  getElectronegativity(atomicNumber) {
    return ElectronegativityTable[atomicNumber] || null;
  },

  formatIsotopes(isotopes) {
    if (!isotopes || !Array.isArray(isotopes)) return [];
    return isotopes.map(iso => ({
      symbol: iso.symbol,
      name: iso.name,
      stable: iso.stable,
      abundance: iso.naturalAbundance_percent ? `${iso.naturalAbundance_percent}%` : 'trace'
    }));
  },

  debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
      const later = () => {
        clearTimeout(timeout);
        func(...args);
      };
      clearTimeout(timeout);
      timeout = setTimeout(later, wait);
    };
  },

  // Calculate periodic table position
  getGridPosition(element) {
    const { period, group, category } = element;
    
    // Handle lanthanides and actinides separately
    if (category === 'lanthanide') {
      return { row: 9, col: element.atomicNumber - 54 }; // Row 9 for lanthanides
    }
    if (category === 'actinide') {
      return { row: 10, col: element.atomicNumber - 86 }; // Row 10 for actinides
    }
    
    // Normal positioning
    return { row: period, col: group };
  },

  // Theme utilities
  getSystemTheme() {
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  },

  getSavedTheme() {
    return localStorage.getItem('elements-theme') || 'auto';
  },

  saveTheme(theme) {
    localStorage.setItem('elements-theme', theme);
  },

  // Wavelength to RGB conversion for spectral lines
  wavelengthToRGB(wavelength) {
    // Wavelength in nanometers (nm)
    // Visible spectrum: ~380-780 nm
    let r, g, b, factor;

    if (wavelength >= 380 && wavelength < 440) {
      // Violet to Blue
      r = -(wavelength - 440) / (440 - 380);
      g = 0.0;
      b = 1.0;
    } else if (wavelength >= 440 && wavelength < 490) {
      // Blue to Cyan
      r = 0.0;
      g = (wavelength - 440) / (490 - 440);
      b = 1.0;
    } else if (wavelength >= 490 && wavelength < 510) {
      // Cyan to Green
      r = 0.0;
      g = 1.0;
      b = -(wavelength - 510) / (510 - 490);
    } else if (wavelength >= 510 && wavelength < 580) {
      // Green to Yellow
      r = (wavelength - 510) / (580 - 510);
      g = 1.0;
      b = 0.0;
    } else if (wavelength >= 580 && wavelength < 645) {
      // Yellow to Orange to Red
      r = 1.0;
      g = -(wavelength - 645) / (645 - 580);
      b = 0.0;
    } else if (wavelength >= 645 && wavelength <= 780) {
      // Red
      r = 1.0;
      g = 0.0;
      b = 0.0;
    } else {
      // Outside visible spectrum
      r = 0.0;
      g = 0.0;
      b = 0.0;
    }

    // Intensity correction for extremes of visible spectrum
    if (wavelength >= 380 && wavelength < 420) {
      factor = 0.3 + 0.7 * (wavelength - 380) / (420 - 380);
    } else if (wavelength >= 420 && wavelength <= 700) {
      factor = 1.0;
    } else if (wavelength > 700 && wavelength <= 780) {
      factor = 0.3 + 0.7 * (780 - wavelength) / (780 - 700);
    } else {
      factor = 0.0;
    }

    // Apply intensity factor with gamma correction
    const gamma = 0.80;
    r = Math.pow(r * factor, gamma);
    g = Math.pow(g * factor, gamma);
    b = Math.pow(b * factor, gamma);

    // Convert to 0-255 range
    return {
      r: Math.round(r * 255),
      g: Math.round(g * 255),
      b: Math.round(b * 255),
      css: `rgb(${Math.round(r * 255)}, ${Math.round(g * 255)}, ${Math.round(b * 255)})`
    };
  },

  // Check if wavelength is in visible spectrum
  isVisibleSpectrum(wavelength) {
    return wavelength >= 380 && wavelength <= 780;
  }
};

// Export for use in both browser and Node.js environments
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { ElementCategories, MessageTypes, ElectronegativityTable, Utils };
}
