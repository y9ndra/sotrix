import dotenv from 'dotenv';
import app from './app';
import {connectDB} from "./config/db";

// Load environment variables
dotenv.config();

async function startserver(){
  try{
    await connectDB();
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
