import os
import re

pdf_dir = '/home/ubuntu/Brickflow-Bestenclave/backend/src/pdf/'
for filename in os.listdir(pdf_dir):
    if filename.endswith('.pug'):
        filepath = os.path.join(pdf_dir, filename)
        with open(filepath, 'r', encoding='utf-8') as f:
            content = f.read()
        
        # 1. Fix corrupted meta(charset) tags
        content = re.sub(r'meta\(charset=.*?\)', 'meta(charset=\"UTF-8\")', content)
        
        # 2. Add charset if missing
        if 'meta(charset=\"UTF-8\")' not in content:
             content = content.replace('head', 'head\n    meta(charset=\"UTF-8\")')
        
        # 3. Replace literal Rupee with HTML entity
        content = content.replace('₹', '&#8377;')
        
        # 4. Fix typo selectively (already did manually for dailyExpenseReport.pug, but just in case)
        content = content.replace('.complace', '.replace')
            
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(content)
print("Finished fixing PDF templates.")
