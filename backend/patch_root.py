import os
import glob
import re

pom_studio_dir = '/Users/aniketmarwadi/Aniket/qualaris/backend/pom_studio'

def patch_file(filepath):
    with open(filepath, 'r') as f:
        content = f.read()

    new_content = content
    new_content = new_content.replace('studio.backend.models', 'pom_studio.models')
    new_content = new_content.replace('studio.backend.services', 'pom_studio.services')
    new_content = new_content.replace('studio.backend.routers', 'pom_studio.routers')
    new_content = new_content.replace('from studio.backend', 'from pom_studio')
    new_content = new_content.replace('import studio.backend', 'import pom_studio')
    new_content = new_content.replace('studio.backend.', 'pom_studio.')

    # Using a simpler split/replace for get_root_dir
    lines = new_content.split('\n')
    out_lines = []
    in_get_root_dir = False
    
    for line in lines:
        if line.startswith('def get_root_dir():'):
            in_get_root_dir = True
            out_lines.append(line)
            out_lines.append('    return "/Users/aniketmarwadi/Downloads/pomcode/playwright_pom_framework"')
            continue
            
        if in_get_root_dir:
            # Skip until we find the end of the function (a line that doesn't start with space/tab and is not empty)
            if line.strip() == '' or line.startswith(' ') or line.startswith('\t'):
                continue
            else:
                in_get_root_dir = False
                
        out_lines.append(line)

    new_content = '\n'.join(out_lines)

    if new_content != content:
        with open(filepath, 'w') as f:
            f.write(new_content)
        print(f"Patched {filepath}")

for root, _, files in os.walk(pom_studio_dir):
    for f in files:
        if f.endswith('.py'):
            patch_file(os.path.join(root, f))
