const fs = require('fs');

const mapPath = 'e:/ERROR Codes/Rider Sathi 4.0/Rider Sathi 3.0/frontend/src/pages/Map.jsx';
const iconsTxtPath = 'C:/Users/shash/.gemini/antigravity-ide/brain/271b4694-3b59-4f63-aeda-f8612db655e4/scratch/map_icons.js.txt';
const gsapTxtPath = 'C:/Users/shash/.gemini/antigravity-ide/brain/271b4694-3b59-4f63-aeda-f8612db655e4/scratch/map_gsap.js.txt';
const returnTxtPath = 'C:/Users/shash/.gemini/antigravity-ide/brain/271b4694-3b59-4f63-aeda-f8612db655e4/scratch/map_return.jsx.txt';

let mapContent = fs.readFileSync(mapPath, 'utf8');
const lines = mapContent.split('\n');

// 1. Replace imports (Line 3: framer-motion -> gsap)
const fmIndex = lines.findIndex(l => l.includes('framer-motion'));
if (fmIndex !== -1) {
  lines[fmIndex] = "import gsap from 'gsap';";
}

// 2. Add new icons to Heroicons import
const hiStart = lines.findIndex(l => l.includes('MagnifyingGlassIcon'));
if (hiStart !== -1) {
  lines[hiStart] = `import {
  MagnifyingGlassIcon, XMarkIcon, HomeIcon, BriefcaseIcon, MicrophoneIcon,
  EyeIcon, EyeSlashIcon, BeakerIcon, SparklesIcon, BuildingOfficeIcon,
  WrenchScrewdriverIcon, PlusCircleIcon, ShieldExclamationIcon,
  ViewfinderCircleIcon, MapIcon, LayerGroupIcon, MapPinIcon, RocketLaunchIcon
} from '@heroicons/react/24/outline';`;
}

// 3. Replace lines 25-72 (old L.Icon definitions) with new HTML markers
const iconStartIdx = lines.findIndex(l => l.includes('const userIcon = new L.Icon({'));
const iconEndIdx = lines.findIndex(l => l.includes('// Component to forward map events'));

const iconsRaw = fs.readFileSync(iconsTxtPath, 'utf8');

lines.splice(iconStartIdx, iconEndIdx - iconStartIdx, iconsRaw + '\n\n');

// 4. Find where the main return statement starts
const reserveIdx = lines.findIndex(l => l.includes('Reserve space for the fixed navbar'));
const returnStartIdx = reserveIdx - 1;
const gsapRaw = fs.readFileSync(gsapTxtPath, 'utf8');
const returnRaw = fs.readFileSync(returnTxtPath, 'utf8');

// Slice everything before the return statement, insert GSAP, then insert the new return statement
const finalLines = lines.slice(0, returnStartIdx);

finalLines.push(gsapRaw);
finalLines.push(returnRaw);
finalLines.push(`  } catch (error) {
    console.error('🚨 MAP COMPONENT ERROR CAUGHT:', error);
    return (
      <div className="flex items-center justify-center min-h-screen bg-red-900 text-white">
        <div className="text-center p-8">
          <h2 className="text-2xl font-bold mb-4">🗺️ Map Loading Error</h2>
          <p className="mb-4">Map component crashed: {error.message}</p>
        </div>
      </div>
    )
  }
}

export default Map;`);

fs.writeFileSync(mapPath, finalLines.join('\\n'), 'utf8');
console.log('Map.jsx successfully upgraded to Premium Navigation UI.');
