with open('server.ts', 'r') as f:
    lines = f.readlines()

new_lines = []
skip = False
for i, line in enumerate(lines):
    if line.strip() == 'const promptText = buildSystemPrompt({':
        # Let's inspect
        pass

