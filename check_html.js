const fs = require('fs');
const h = fs.readFileSync('public/module/admin/exam_question_generation.html','utf8');
const s = h.indexOf('<script>');
const e = h.lastIndexOf('</script>');
const script = h.slice(s+8, e);

// Brace balance
let open = 0, close = 0;
for (const c of script) { if(c==='{') open++; if(c==='}') close++; }
console.log('Braces: open=' + open + ' close=' + close + ' ok=' + (open===close));

// Backtick count (template literals)
const bt = (script.match(/`/g) || []).length;
console.log('Backticks: ' + bt + ' ' + (bt % 2 === 0 ? 'EVEN-OK' : 'ODD-CHECK'));

// Check for literal newline inside a JS string (lines.join)
const lines = script.split('\n');
let problems = [];
for (let i = 0; i < lines.length; i++) {
  const ln = lines[i];
  // Flag a join line that isn't complete on one line (would mean literal newline inside string)
  if (ln.includes("lines.join('") && !ln.includes("');")) {
    problems.push('Line ' + (i+1) + ': ' + ln.trim());
  }
}
if (problems.length) {
  console.log('PROBLEMS FOUND:', problems);
} else {
  console.log('No broken join strings found.');
}

console.log('All checks done.');
