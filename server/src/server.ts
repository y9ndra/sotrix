import dotenv from 'dotenv';
// Load environment variables
dotenv.config();

import app from './app';
import {connectDB} from "./config/db";
import {connectRedis} from "./config/redis";


async function startserver(){
  try{
    await connectDB();
    await connectRedis();
    const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server is running in development mode on port ${PORT}`);
});

  }
  catch(err){
    console.log(err);
    process.exit(1);
  }
}

startserver();
