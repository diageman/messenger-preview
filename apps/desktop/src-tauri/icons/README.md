# Tauri Icons

## Required Icon Sizes

For Tauri to work properly, you need to generate the following icon files:

### Desktop (src-tauri/icons/)
- `icon.ico` - Windows icon (multiple sizes in one file)
- `icon.icns` - macOS icon
- `32x32.png` - Linux/Windows small icon
- `128x128.png` - Linux/Windows medium icon
- `128x128@2x.png` - Retina display icon

### Mobile (src-tauri/icons/)
- Same as desktop for iOS
- Additional sizes for Android (various densities)

## How to Generate Icons

### Option 1: Use Tauri Icon Generator
```bash
# Install tauri-cli if not already installed
cargo install tauri-cli

# Generate icons from source SVG
cargo tauri icon ./icons/icon.svg
```

### Option 2: Manual Generation
1. Open `icon.svg` in a graphics editor (Figma, Sketch, Adobe Illustrator)
2. Export at required sizes:
   - 32x32 px → `32x32.png`
   - 128x128 px → `128x128.png`
   - 256x256 px → `128x128@2x.png`
3. For Windows: Create `.ico` file with multiple sizes (16, 32, 48, 256)
4. For macOS: Create `.icns` file using iconutil or online converter

### Option 3: Online Tools
- https://icon.kitchen/
- https://www.convertio.co/png-ico/
- https://cloudconvert.com/png-to-icns

## Placeholder Icons

For development, you can use simple colored squares:
```bash
# Create placeholder PNGs (will be replaced later)
# 32x32 yellow square
# 128x128 yellow square
# etc.
```

## Current Status
- ✅ `icon.svg` created for desktop
- ✅ `icon.svg` created for mobile
- ⏳ PNG/ICO/ICNS files need to be generated
