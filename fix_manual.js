const fs = require('fs');
const path = 'public/module/admin/exam_question_generation.html';
let html = fs.readFileSync(path, 'utf8');

// Fix the literal newline inside the join string
// The broken line is: lines.join('\<actual newline>');
// We need it to be: lines.join('\n');
html = html.replace(
  "lines.join('\n');",
  "lines.join('\\n');"
);

// Also ensure the setGenerating line with ellipsis is fine (just check it's there)
const hasSetGen = html.includes("'Sending to <strong>Mistral AI</strong> for arrangement");
console.log('setGenerating line OK:', hasSetGen);
console.log('join fix applied:', html.includes("lines.join('\\n');"));

fs.writeFileSync(path, html, 'utf8');
console.log('Saved.');
