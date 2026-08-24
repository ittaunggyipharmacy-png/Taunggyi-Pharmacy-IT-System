import * as dotenv from 'dotenv';
dotenv.config();
fetch(`${process.env.VITE_SUPABASE_URL}/rest/v1/?apikey=${process.env.VITE_SUPABASE_ANON_KEY}`)
  .then(res => res.json())
  .then(data => {
    console.log(Object.keys(data.definitions || data.components?.schemas || {}));
    if (data.definitions?.assets) console.log(Object.keys(data.definitions.assets.properties));
    else if (data.components?.schemas?.assets) console.log(Object.keys(data.components.schemas.assets.properties));
  });
