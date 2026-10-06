import json

with open('dist/server.cjs.map', 'r') as f:
    sourcemap = json.load(f)

sources = sourcemap.get('sources', [])
sources_content = sourcemap.get('sourcesContent', [])

for idx, source in enumerate(sources):
    if 'server.ts' in source:
        with open('server_restored.ts', 'w') as out:
            out.write(sources_content[idx])
        print("Restored server.ts successfully!")
        break
