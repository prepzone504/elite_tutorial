const url = 'https://rgbiwtftjmfsuhxexdan.supabase.co';
const key = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJnYml3dGZ0am1mc3VoeGV4ZGFuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODAwMzI5NDgsImV4cCI6MjA5NTYwODk0OH0.zmSg4G_T3ZvLo91LDYMal3INdo45VwsiXqQjADvOwp4';

async function run() {
  const email = `test_${Date.now()}@test.com`;
  console.log("Signing up...", email);
  
  const authRes = await fetch(`${url}/auth/v1/signup`, {
    method: 'POST',
    headers: {
      'apikey': key,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ email, password: 'password123' })
  });
  
  const authData = await authRes.json();
  if (authData.error || !authData.access_token) {
    console.error("Auth error:", authData);
    return;
  }
  
  const token = authData.access_token;
  console.log("Logged in! Fetching exams...");
  
  const dbRes = await fetch(`${url}/rest/v1/exam_questions?select=*`, {
    headers: {
      'apikey': key,
      'Authorization': `Bearer ${token}`
    }
  });
  
  const data = await dbRes.json();
  if (data.error || data.message) {
    console.error("DB Error:", data);
  } else {
    console.log(`Found ${data.length} rows.`);
    if (data.length > 0) {
      console.log("First row:");
      console.dir(data[0], {depth: null});
    }
  }
}

run();
