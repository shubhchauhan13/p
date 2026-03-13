const fs = require('fs');
const files = [
    './src/App.jsx', 
    './src/components/AdminDashboard.jsx', 
    './src/components/Cashier.jsx',
    './src/components/Portfolio.jsx'
];
files.forEach(f => {
    try {
        const content = fs.readFileSync(f, 'utf8');
        // A very basic check for unmatched brackets/parentheses that might cause a silent failure
        let braceCount = 0;
        let parenCount = 0;
        for(let char of content) {
            if (char === '{') braceCount++;
            if (char === '}') braceCount--;
            if (char === '(') parenCount++;
            if (char === ')') parenCount--;
        }
        console.log(`${f} - Braces: ${braceCount}, Parens: ${parenCount}`);
    } catch (e) {
        console.error(`Error reading ${f}:`, e.message);
    }
});
