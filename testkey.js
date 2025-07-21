// test-openai.js
import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

async function testKey() {
  try {
    const models = await openai.models.list();
    console.log("API key is set correctly. Models:", models.data.map(m => m.id));
  } catch (error) {
    console.error("API key error:", error.message);
  }
}

testKey();