
with open('src/components/WhatsappView.tsx', 'r') as f:
    content = f.read()

# Fix the missing input tag
# We are looking for this specific sequence
broken_block = '                                  \n                                   type="text"'
fixed_block = '                                  <input \n                                   type="text"'

if broken_block in content:
    content = content.replace(broken_block, fixed_block)
    with open('src/components/WhatsappView.tsx', 'w') as f:
        f.write(content)
    print("Fix successful!")
else:
    print("Broken block not found!")
    # Let's print a bit of context to see what's wrong
    start = content.find('type="text"')
    print(repr(content[start-50:start+20]))
