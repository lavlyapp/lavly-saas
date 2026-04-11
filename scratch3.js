const fs = require('fs'); 
const path = require('path'); 
function walk(dir) { 
  let results = []; 
  const list = fs.readdirSync(dir); 
  list.forEach(file => { 
    file = dir + '/' + file; 
    const stat = fs.statSync(file); 
    if (stat && stat.isDirectory()) { 
      results = results.concat(walk(file)); 
    } else if (file.endsWith('.tsx') || file.endsWith('.ts')) { 
      results.push(file); 
    } 
  }); 
  return results; 
} 
const dirs = ['./components', './app', './lib', './hooks'];
let allFiles = [];
dirs.forEach(d => { allFiles = allFiles.concat(walk(d)); });
allFiles.forEach(f => { 
  const content = fs.readFileSync(f, 'utf8'); 
  if ((content.includes('useState(') || content.includes('useState<')) && !content.includes('React.useState')) { 
    const importMatch1 = content.match(/import\s*\{[^}]*useState[^}]*\}\s*from\s*['"]react['"]/);
    const importMatch2 = content.match(/import\s*React,\s*\{[^}]*useState[^}]*\}\s*from\s*['"]react['"]/);
    
    if (!importMatch1 && !importMatch2) { 
      console.log('Missing import in: ' + f); 
    } 
  } 
});
