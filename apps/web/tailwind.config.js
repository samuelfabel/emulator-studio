const { join } = require('path');

module.exports = {
  content: [join(__dirname, 'index.html'), join(__dirname, 'src/**/*.{js,ts,jsx,tsx}')],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        surface: {
          DEFAULT: '#1a2332',
          muted: '#0f1419',
        },
        border: '#2d3a4f',
        muted: '#8b9cb3',
      },
    },
  },
  plugins: [],
};
