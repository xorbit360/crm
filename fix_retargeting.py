
with open('src/components/WhatsappView.tsx', 'r') as f:
    content = f.read()

# Define the old checkbox block for retargeting
old_checkbox = '''                          <input 
                            type="checkbox" 
                            className="w-4 h-4 rounded text-gold bg-gray-800 border-gray-700" 
                            checked={retargetingEnabled} 
                            onChange={(e) => setRetargetingEnabled(e.target.checked)} 
                          />'''

# Define the new toggle block
new_toggle = '''                          <div 
                            onClick={() => setRetargetingEnabled(!retargetingEnabled)}
                            className={`w-10 h-5 rounded-full p-0.5 transition-colors duration-200 cursor-pointer ${retargetingEnabled ? "bg-gold" : "bg-gray-700"}`}
                          >
                            <div className={`w-4 h-4 rounded-full bg-white transition-transform duration-200 transform ${retargetingEnabled ? "translate-x-5" : "translate-x-0"}`} />
                          </div>'''

# Replace it
if old_checkbox in content:
    content = content.replace(old_checkbox, new_toggle)
    print("Replacement successful!")
else:
    print("Old checkbox not found!")
    # Let's try with a more relaxed search
    import re
    relaxed_pattern = r'<input\s+type="checkbox"\s+className="w-4 h-4 rounded text-gold bg-gray-800 border-gray-700"\s+checked={retargetingEnabled}\s+onChange={\(e\) => setRetargetingEnabled\(e\.target\.checked\)}\s+/>'
    if re.search(relaxed_pattern, content):
        content = re.sub(relaxed_pattern, new_toggle, content)
        print("Relaxed replacement successful!")
    else:
        print("Relaxed replacement failed!")

with open('src/components/WhatsappView.tsx', 'w') as f:
    f.write(content)
