const fs = require('fs');
const path = require('path');
const file = path.join(__dirname, 'src/lib/translations.ts');
let lines = fs.readFileSync(file, 'utf8').split('\n');

const removeDup = (lineIndex) => {
    lines.splice(lineIndex - 1, 1);
};

// Based on the error TS1117: An object literal cannot have multiple properties with the same name.
// src/lib/translations.ts(151,5) -> remove 151
// But if we remove 151, the array shifts.
// We can just find 'interpolation' and remove duplicates per language block.
// Let's just sed them out.
