const fs = require('fs');
const content = fs.readFileSync('src/components/StartScreen.tsx', 'utf-8');
const matches = content.match(/"[a-z]+_[a-z]+"/g);
if (matches) {
    const unique = [...new Set(matches)];
    console.log(unique);
}
