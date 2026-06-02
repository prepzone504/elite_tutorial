const url = 'https://rgbiwtftjmfsuhxexdan.supabase.co/rest/v1/exam_questions?select=*';
const key = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJnYml3dGZ0am1mc3VoeGV4ZGFuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODAwMzI5NDgsImV4cCI6MjA5NTYwODk0OH0.zmSg4G_T3ZvLo91LDYMal3INdo45VwsiXqQjADvOwp4';

fetch(url, {
  headers: {
    'apikey': key,
    'Authorization': `Bearer ${key}`
  }
})
.then(res => res.json())
.then(data => {
  console.log("Found", data.length, "rows in exam_questions.");
  if(data.error || data.message) {
    console.error("Error:", data);
  } else if(data.length > 0) {
    console.log("First row:");
    console.dir(data[0], {depth: null});
  }
})
.catch(err => console.error(err));
