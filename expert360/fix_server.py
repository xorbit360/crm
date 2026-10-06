import re

with open('server.ts', 'r') as f:
    content = f.read()

# Fix 1: around line 1275-1285
content = re.sub(
    r'const replyText = await processWithAgents\(\{.*?history\n\s*\}\);\n\s*const replyText = await executeAI\(promptText\);',
    r'''const replyText = await processWithAgents({
                    phone,
                    senderName,
                    text: text || "Hola",
                    history
                  });''',
    content,
    flags=re.DOTALL
)
content = re.sub(
    r'const extractedText = await processWithAgents\(\{.*?\n\s*const promptText = buildSystemPrompt\(\{',
    r'''const promptText = buildSystemPrompt({''',
    content,
    flags=re.DOTALL
)

# Fix 2: 
content = re.sub(
    r'const promptText = buildSystemPrompt\(\{.*?mediaInfo:\s*mediaInfoStr\n\s*\}\);\n\s*const extractedText = await executeAI\(promptText,\s*mediaBase64,\s*mediaMimeType\);',
    r'''const extractedText = await processWithAgents({
              phone,
              senderName,
              text,
              history: currentDB.messagesHistory[phone] || [],
              mediaInfo: mediaInfoStr,
              mediaBase64,
              mediaMimeType
            });''',
    content,
    flags=re.DOTALL
)

# Fix 3:
content = re.sub(
    r'const promptText = buildSystemPrompt\(\{.*?history:\s*history\s*\|\|\s*\[\]\n\s*\}\);\n\s*console\.log\([^)]+\);\n\s*const extractedText = await executeAI\(promptText\);',
    r'''console.log('Utilizando AI Helper para generar respuesta de Chatbot WhatsApp...');
      const extractedText = await processWithAgents({
        phone: phone || "3000000000",
        senderName: senderName || "",
        text: message,
        history: history || []
      });''',
    content,
    flags=re.DOTALL
)

with open('server.ts', 'w') as f:
    f.write(content)
