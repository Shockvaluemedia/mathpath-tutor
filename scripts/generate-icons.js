// Run: node scripts/generate-icons.js
// Generates PWA icons as simple SVG files (convert to PNG for production)

const fs = require("fs");
const path = require("path");

const iconsDir = path.join(__dirname, "..", "public", "icons");
if (!fs.existsSync(iconsDir)) {
  fs.mkdirSync(iconsDir, { recursive: true });
}

function generateSVGIcon(size) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  <defs>
    <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#6366f1"/>
      <stop offset="100%" style="stop-color:#9333ea"/>
    </linearGradient>
  </defs>
  <rect width="${size}" height="${size}" rx="${size * 0.2}" fill="url(#bg)"/>
  <text x="50%" y="55%" font-family="system-ui, sans-serif" font-size="${size * 0.45}" font-weight="bold" fill="white" text-anchor="middle" dominant-baseline="middle">M</text>
</svg>`;
}

// Generate SVG icons (use a tool like sharp or Inkscape to convert to PNG for production)
[192, 512].forEach((size) => {
  const svg = generateSVGIcon(size);
  fs.writeFileSync(path.join(iconsDir, `icon-${size}.svg`), svg);
  // Also write as .png placeholder (browsers will accept SVG in many cases)
  fs.writeFileSync(path.join(iconsDir, `icon-${size}.png`), svg);
  console.log(`Generated icon-${size}`);
});

// Maskable icon (full bleed, no rounded corners)
const maskableSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 512 512">
  <defs>
    <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#6366f1"/>
      <stop offset="100%" style="stop-color:#9333ea"/>
    </linearGradient>
  </defs>
  <rect width="512" height="512" fill="url(#bg)"/>
  <text x="50%" y="55%" font-family="system-ui, sans-serif" font-size="230" font-weight="bold" fill="white" text-anchor="middle" dominant-baseline="middle">M</text>
</svg>`;
fs.writeFileSync(path.join(iconsDir, "icon-maskable-512.png"), maskableSvg);
console.log("Generated maskable icon");
console.log("\nNote: For production, convert these SVGs to actual PNG files using sharp, Inkscape, or an online tool.");
