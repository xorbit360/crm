import fs from 'fs';
import OpenAI from 'openai';

async function run() {
  const dbData = JSON.parse(fs.readFileSync('./menu_data.json', 'utf-8'));
  const openai = new OpenAI({ apiKey: dbData.customApiKey });
  try {
    const response = await openai.chat.completions.create({
      model: dbData.aiModel || "gpt-4o-mini",
      messages: [{ role: 'user', content: 'Hola, responde "Funciona".' }]
    });
    console.log("Success:", response.choices[0].message.content);
  } catch(e) {
    console.error("Failed:", e);
  }
}
run();
